The likely bug is in `getAdminEnrollmentStudentOptions`.

In the zip, the student query uses:

```ts
parent:profiles(first_name, last_name)
```

But `family_members` has two relationships to `profiles`:

- `family_members_parent_id_fkey`
- `family_members_student_user_id_fkey`

So Supabase can’t know which one `parent:profiles(...)` means. The class dropdown can load because its query is separate and succeeds, but the student query returns an error, causing the modal’s generic `Failed to load options` toast.

Fix it to use the explicit FK, matching patterns already used elsewhere in the repo:

```ts
.select(
  'id, first_name, last_name, email, parent:profiles!family_members_parent_id_fkey(first_name, last_name)'
)
```

Also improve the modal error so it shows which query failed:

```ts
if (studentRes.error) toast.error(`Failed to load students: ${studentRes.error}`);
if (classRes.error) toast.error(`Failed to load classes: ${classRes.error}`);
```

Tell kimi-cli to edit:

- `src/lib/actions/enrollments.ts` around `getAdminEnrollmentStudentOptions`
- optionally `src/components/admin/AdminEnrollStudentDialog.tsx` for better error messages

Add a regression test that verifies `getAdminEnrollmentStudentOptions` returns `parent_name` when a parent profile is present, and ideally one test/mock that catches the exact FK hint in the select string.