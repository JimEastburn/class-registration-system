Here’s the fix plan for kimi-cli.

**Goal**
Remove the remaining Force Enroll feature entirely, while preserving the new normal admin enrollment capability if it is intended to stay.

**First Confirm Scope**
Run:

```bash
rg -n "ForceEnroll|adminForceEnroll|ForceEnrollInput|force_enroll|force_enroll_update"
rg -n "AdminEnrollStudentDialog|adminEnrollStudent|getAdminEnrollmentStudentOptions|getAdminEnrollmentClassOptions"
```

**Fix Steps**

1. Remove Force Enroll from the admin table:
   - Edit `src/components/admin/EnrollmentManagementTable.tsx`.
   - Remove:
     - `import { ForceEnrollDialog } from './ForceEnrollDialog';`
     - `<ForceEnrollDialog />`
   - If the normal admin enrollment button should remain, replace it with:
     ```tsx
     import { AdminEnrollStudentDialog } from './AdminEnrollStudentDialog';
     ```
     and render:
     ```tsx
     <AdminEnrollStudentDialog />
     ```

2. Delete the Force Enroll component:
   - Delete `src/components/admin/ForceEnrollDialog.tsx`.
   - Re-run:
     ```bash
     rg -n "ForceEnrollDialog"
     ```
   - Expected: no matches.

3. Remove Force Enroll backend code:
   - Edit `src/lib/actions/enrollments.ts`.
   - Remove:
     - `ForceEnrollInput`
     - full `adminForceEnroll` function
     - audit strings `force_enroll` and `force_enroll_update`
   - Remove `sendEnrollmentConfirmation` import only if it becomes unused in this file.
   - Do not remove:
     - `adminEnrollStudent`
     - `getAdminEnrollmentStudentOptions`
     - `getAdminEnrollmentClassOptions`
     - `adminCancelEnrollment`
     - `adminRemoveEnrollment`
     - `enrollStudent`
     - `promoteFromWaitlist`

4. Fix the normal admin enrollment dialog labels:
   - Edit `src/components/admin/AdminEnrollStudentDialog.tsx`.
   - It currently expects `s.label` and `c.label`, but server actions return fields like `first_name`, `last_name`, `parent_name`, `name`, `teacher_name`, `day`, `block`.
   - Render labels directly, for example:
     ```tsx
     {s.first_name} {s.last_name}
     {s.parent_name ? ` (${s.parent_name})` : ''}
     ```
     and:
     ```tsx
     {c.name}
     {c.teacher_name ? ` - ${c.teacher_name}` : ''}
     {c.day && c.block ? ` (${c.day} ${c.block})` : ''}
     ```
   - Update local state types to match the exported option types rather than `{ id; label }`.

5. Clean force-enroll tests:
   - Edit `src/tests/integration/admin-flow.test.ts`.
   - Remove `adminForceEnroll` from imports.
   - Delete the test named like `allows admin to force enroll a student despite capacity`.
   - Keep admin cancellation tests if they still apply.
   - Remove mocks only used by the deleted force-enroll test.

6. Clean docs references:
   - Edit docs only if they are meant to represent current behavior:
     - `docs/MANUAL_TESTING.md`
     - `docs/TASKS.md`
   - Remove or mark obsolete the references to `adminForceEnroll` and `ForceEnrollDialog`.

7. Final verification:
   - Run:
     ```bash
     rg -n "ForceEnroll|adminForceEnroll|ForceEnrollInput|force_enroll|force_enroll_update"
     ```
   - Expected: no source/test matches. If docs intentionally mention historical tasks, leave only docs matches, but preferably remove current-task claims.

8. Run checks:
   ```bash
   npm run test:run -- src/lib/actions/enrollments.test.ts src/components/admin/__tests__/AdminEnrollStudentDialog.test.tsx src/tests/integration/admin-flow.test.ts
   npm run lint
   npm run format:check
   ```

**Acceptance Criteria**
- No Force Enroll button appears on `/admin/enrollments`.
- `ForceEnrollDialog.tsx` is gone.
- `adminForceEnroll` and `ForceEnrollInput` are gone.
- No tests assert bypassing capacity/blocks through force enroll.
- Normal admin enrollment, if kept, creates pending/waitlisted enrollments through `adminEnrollStudent` and shows readable dropdown labels.