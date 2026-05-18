# Kimi-CLI Follow-Up Fixes — Teacher Cancel Enrollment

## Context

The first round of fixes for the teacher-cancel-enrollment feature is in place and all 52 tests pass. A second code review found two real issues (one user-visible, one silent prod bug) plus two minor polish items. This doc tells `kimi-cli` exactly what to change.

The earlier plan is at `/Users/jam/.claude/plans/do-a-code-review-toasty-eich.md` if you need full context.

---

## Issues to fix

### 🔴 1. Dialog copy contradicts what the code does

The teacher-roster cancel confirmation says the parent will **not** be notified, but `teacherCancelEnrollment` now sends a Resend email on success. The UI lies in the opposite direction of the previous bug.

**File:** [src/components/teacher/StudentRosterTable.tsx](src/components/teacher/StudentRosterTable.tsx) around line 367

**Current:**
```tsx
Are you sure you want to cancel the enrollment for{' '}
<strong>{selectedEnrollment?.studentName}</strong>? This will
remove their spot from the class. The parent will not be
automatically notified.
```

**Change to:**
```tsx
Are you sure you want to cancel the enrollment for{' '}
<strong>{selectedEnrollment?.studentName}</strong>? This will
remove their spot from the class and email the parent.
```

No test changes needed — there's no test asserting the dialog copy.

---

### 🔴 2. Parent email lookup uses RLS client → silent no-op in prod

In [src/lib/actions/enrollments.ts](src/lib/actions/enrollments.ts) inside `teacherCancelEnrollment`, the lookup that feeds `sendEnrollmentCancellation` uses the cookie-bound `supabase` client. Teachers do not have RLS read access to other parents' `profiles.email`, so the joined `parent` will come back `null`, the email is skipped, and the test suite never catches it because the in-memory fake ignores RLS.

**Current (around the email try/catch):**
```ts
try {
  const { data: studentWithParent } = await supabase
    .from('family_members')
    .select('first_name, last_name, parent:profiles!family_members_parent_id_fkey(email, first_name, last_name)')
    .eq('id', enrollment.student_id)
    .single();
  ...
}
```

**Change to** use the already-created `adminClient`:
```ts
try {
  const { data: studentWithParent } = await adminClient
    .from('family_members')
    .select('first_name, last_name, parent:profiles!family_members_parent_id_fkey(email, first_name, last_name)')
    .eq('id', enrollment.student_id)
    .single();
  ...
}
```

That's the only line change — `adminClient` is already in scope from the enrollment update a few lines above.

**Test:** the existing "sends cancellation email to parent on success" test in [src/lib/actions/enrollments.test.ts](src/lib/actions/enrollments.test.ts) will continue to pass because the fake doesn't differentiate between server and admin clients. That's acceptable for now — the change is a defense against RLS in production, where the unit-test fake cannot simulate the failure.

---

### 🟢 3. Email `<h1>` uses very long org name

[src/lib/email.ts](src/lib/email.ts) inside `sendEnrollmentCancellation` renders:

```html
<h1>AAC Austin Arts & Academic Collaborative - Class Registration System</h1>
```

That will wrap awkwardly on mobile and is inconsistent with other transactional templates in the file.

**Change to:**
```html
<h1>AAC Class Registration</h1>
```

The footer already carries the full org name — leave that as-is.

While you're in this function, glance at `sendEnrollmentConfirmation` in the same file and make sure the `<h1>` style matches (color, size). Match its visual treatment so cancellation and confirmation emails feel like the same product.

---

### 🟢 4. Waitlist DB-error test is brittle

[src/lib/actions/waitlist.test.ts](src/lib/actions/waitlist.test.ts) detects the "first-in-line" query by string-matching `selectQuery?.includes('start_date')`. If the select projection in `promoteFromWaitlist` ever drops `start_date`, the override stops firing and the test silently passes via the success path.

**Change:** match on a more stable signal. Two acceptable options:

- **Preferred:** match on `.eq('status', 'waitlisted')` being part of the query (that's the load-bearing filter for this lookup and isn't going anywhere).
- **Alternative:** add a small `forceErrorOnTable(table, errorObject)` helper to the Supabase fake in `src/__integration__/fakes/supabase.ts` (or wherever the fake lives) and use it here instead of monkey-patching `from`.

The preferred fix is one line; the alternative is more work but pays off if other tests start needing forced errors.

---

## Verification

```bash
npm run test:run -- enrollments.test waitlist.test
npm run lint
npm run build
```

Manual smoke (preview deploy):
- As a teacher, cancel an unpaid `confirmed` enrollment → toast success, parent receives email (check Resend dashboard / inbox), waitlisted student auto-promotes.
- Open the confirm dialog before clicking — copy now reads "and email the parent."
- As a teacher, cancel an enrollment with a `completed` payment → blocked with the existing refund-required error.
- As an admin in production preview (or with `VERCEL_ENV=production` locally), confirm `adminRemoveEnrollment` still returns `'Hard delete is disabled in production'`.

## Out of scope

- Changing the email template HTML beyond the `<h1>` swap.
- Adding any new server-side guard beyond what already exists.
- Touching `adminCancelEnrollment` or `cancelEnrollment` — those are separate code paths and not affected by this round.