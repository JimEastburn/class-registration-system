# Code Review — Local Changes on `master`

## Context

Six files modified on `master` (uncommitted). The changes add a **teacher-initiated enrollment cancellation** feature, gate the **admin hard-delete** button to non-prod, and update email branding. This review identifies issues and gives `kimi-cli` a concrete fix list.

---

## What the code does when deployed to prod

### 1. `.gitignore`
Ignores a local `.superpowers/` agent-skill directory. Tooling-only, no runtime impact.

### 2. `src/components/admin/EnrollmentManagementTable.tsx`
Hides the "Hard Delete" enrollment menu item in the admin enrollment table **when `NEXT_PUBLIC_VERCEL_ENV === 'production'`**. In preview/dev it remains visible. Soft-cancel still works in prod.

### 3. `src/components/teacher/StudentRosterTable.tsx`
Adds a new **"Cancel Enrollment"** option to the per-student dropdown on a teacher's class roster. Clicking it opens a confirmation `AlertDialog` ("This will remove their spot… and notify the parent."). On confirm it calls the new `teacherCancelEnrollment` server action, shows a toast, and the table revalidates.

### 4. `src/lib/actions/enrollments.ts` — new `teacherCancelEnrollment(enrollmentId)`
Server action flow in prod:
1. Auth check → must be signed in.
2. Loads `profiles.role`; must be `teacher`, `admin`, or `super_admin`.
3. Fetches enrollment + joined `classes.teacher_id`.
4. Teachers may only cancel enrollments in classes **they own**; admin/super_admin bypass.
5. Rejects if status is already `cancelled`.
6. Uses the **admin Supabase client** to update status → `cancelled`, clears `waitlist_position`.
7. Writes audit log (`teacher_cancel_enrollment`).
8. Calls `promoteFromWaitlist(class_id)` to auto-promote the next waitlisted student.
9. Revalidates `/teacher/classes`, `/teacher/classes/[id]`, `/parent`, `/parent/enrollments`.
10. Database trigger decrements `classes.current_enrollment` automatically.

### 5. `src/lib/actions/enrollments.test.ts`
Adds 5 Vitest cases for `teacherCancelEnrollment` (unauth, non-teacher, wrong teacher, already-cancelled, success path for teacher and admin).

### 6. `src/lib/email.ts`
Changes the **fallback** `FROM_EMAIL` to `noreply@class-registration.austinaac.org` and `APP_NAME` to `"AAC Austin Arts & Academic Collaborative - Class Registration System"`. Used only if `FROM_EMAIL` env var is unset; affects sender identity in transactional emails.

---

## Issues found

### 🔴 High — UI lies about behavior
The confirm dialog in [StudentRosterTable.tsx:367](src/components/teacher/StudentRosterTable.tsx#L367) tells the parent will be notified, but `teacherCancelEnrollment` **does not send any email**. Remove the claim.

### 🔴 High — Paid enrollment cancelled with no refund / no payment update
`teacherCancelEnrollment` does not look at `payments`. If the enrollment is `confirmed` (i.e. parent paid), the teacher can silently nuke their spot while the payment stays `completed`. Compare to [adminCancelEnrollment](src/lib/actions/enrollments.ts:765) which has an explicit `refund` option. At minimum, refuse to cancel when a completed payment exists and instruct the teacher to route through an admin; ideally flag for admin refund review.

### 🟡 Medium — `NEXT_PUBLIC_VERCEL_ENV` is a client-only guard
Hiding Hard Delete in [EnrollmentManagementTable.tsx:238](src/components/admin/EnrollmentManagementTable.tsx#L238) is purely cosmetic — `NEXT_PUBLIC_*` envs ship to the browser and the user can still call the underlying server action from devtools. The `deleteEnrollment` server action should also reject when `process.env.VERCEL_ENV === 'production'` (server-side env, no `NEXT_PUBLIC_`).

### 🟡 Medium — No revalidation of admin enrollments page
Admin's `/admin/enrollments` shows roster + statuses but is not revalidated after a teacher cancellation. Add `revalidatePath('/admin/enrollments')`.

### 🟡 Medium — Class scheduler role omitted from `isAdmin` set
`['admin', 'super_admin'].includes(...)` is consistent with elsewhere, but verify business rule: do schedulers cancel? (CLAUDE.md implies no — fine, but leave a one-line comment so it isn't accidentally added.)

### 🟢 Low — Mock change is a no-op
The `vi.mock('@/lib/email')` reformatting in the test file is purely whitespace; harmless.

### 🟢 Low — Type cast on join result
`enrollment.class as unknown as { … }` works but loses safety. Use the existing `RosterEnrollment`-style typing or a small inline interface.

### 🟢 Low — Email branding name is very long
`"AAC Austin Arts & Academic Collaborative - Class Registration System"` will be truncated in many inbox previews. Prefer `"AAC Class Registration"` or similar; keep full name in body.

### 🟢 Low — Missing test for "enrollment not found"
Add a case where `enrollmentId` doesn't exist → expect `'Enrollment not found'`.

### 🟡 Medium — `promoteFromWaitlist` swallows real DB errors as "no waitlist"
In [src/lib/actions/waitlist.ts:290](src/lib/actions/waitlist.ts#L290), the first-in-line lookup uses `.single()` and treats any error as "no one on waitlist":

```ts
if (waitlistError || !firstInLine) {
  return { success: true, data: null };
}
```

A transient Supabase/PostgREST error (network blip, RLS denial, query timeout) is indistinguishable from `PGRST116` "no rows returned" — both silently return success. The cancellation completes, no promotion happens, no log is emitted, and the next person on the waitlist stays stuck. Pre-existing, not introduced by this change, but worth fixing alongside the new cancel path since it now has more callers.

---

## Plan for `kimi-cli` to fix

Files to modify:

1. **[src/lib/actions/enrollments.ts](src/lib/actions/enrollments.ts)** — in `teacherCancelEnrollment`:
   - After the "already cancelled" check, query `payments` for a `completed` row tied to this enrollment. If one exists, return `{ success: false, error: 'Cannot cancel a paid enrollment — please ask an admin to issue a refund' }`.
   - Import and call `sendEnrollmentCancellation` (create it in `src/lib/email.ts` mirroring `sendEnrollmentConfirmation`) to email the parent. Fetch parent email via `family_members → profiles` join on the enrollment's `student_id`. Wrap in try/catch — email failure must not block the cancellation (fire-and-forget after DB update).
   - Add `revalidatePath('/admin/enrollments')`.
   - Replace `as unknown as { … }` with a typed local interface.

2. **[src/lib/email.ts](src/lib/email.ts)**:
   - Add `sendEnrollmentCancellation({ parentEmail, parentName, studentName, className })` patterned on the existing `sendEnrollmentConfirmation`.
   - Shorten `APP_NAME` to `"AAC Class Registration"` (keep full org name in email body templates).

3. **[src/lib/actions/enrollments.test.ts](src/lib/actions/enrollments.test.ts)** — extend `teacherCancelEnrollment` describe block:
   - "rejects when enrollment has a completed payment" (no refund path).
   - "returns error when enrollment not found".
   - "sends cancellation email to parent on success" — assert `sendEnrollmentCancellation` mock called with parent email + student name.
   - Update existing success test to seed a `payments` row with `status: 'pending'` (or none) so it still passes.

4. **[src/components/teacher/StudentRosterTable.tsx](src/components/teacher/StudentRosterTable.tsx)**:
   - Keep the "notify the parent" wording **only after** the email is wired up. The email work is deferred, so , change the dialog copy to: `"This will remove their spot from the class. The parent will not be automatically notified."`

5. **Hard-Delete server-side guard** — locate the `deleteEnrollment` (or equivalent hard-delete) server action and add:
   ```ts
   if (process.env.VERCEL_ENV === 'production') {
     return { success: false, error: 'Hard delete is disabled in production' };
   }
   ```
   Add a test asserting it errors when `VERCEL_ENV=production`.

6. **[src/components/admin/EnrollmentManagementTable.tsx](src/components/admin/EnrollmentManagementTable.tsx)** — no change needed once server guard exists; the UI gate is still useful as a hint.

7. **[src/lib/actions/waitlist.ts](src/lib/actions/waitlist.ts)** — fix `promoteFromWaitlist` error swallowing:
   - Replace `.single()` with `.maybeSingle()` for the first-in-line query so "no rows" returns `data: null` without an error.
   - Then distinguish: if `waitlistError` is truthy, log it and return `{ success: false, error: 'Failed to read waitlist' }`. If `firstInLine` is null, return the existing `{ success: true, data: null }` no-op.
   - Add a test that simulates a DB error on the waitlist lookup and asserts the action returns `success: false`, plus a test confirming the empty-waitlist path still returns `success: true, data: null`.

### Verification

```bash
npm run test:run -- enrollments.test
npm run lint
npm run build
```

Manual smoke (preview deploy):
- As a teacher, cancel a confirmed enrollment with **no** payment → status flips to `cancelled`,  waitlisted student auto-promotes.
- As a teacher, attempt to cancel an enrollment with a `completed` payment → blocked with clear error.
- As an admin in preview, confirm Hard Delete still visible; on production deploy, confirm both the menu item is hidden **and** a direct server-action call fails.
- Confirm `/admin/enrollments` reflects the cancellation without a manual refresh.