# Seed Data Reference

The seed script (`scripts/seed.ts`) wipes all data and populates the database with realistic test data.

```bash
npx tsx scripts/seed.ts
```

> [!CAUTION]
> This **deletes all existing data** including auth users. Only run against development databases.

---

## Login Credentials

All seeded accounts use the password: **`SeedPass123!`**

| Role        | Email                                           | Notes                                     |
| ----------- | ----------------------------------------------- | ----------------------------------------- |
| Super Admin | `superadmin@seed.local`                         | Full system access, all dashboards        |
| Admin       | `admin1@seed.local`                             | Also has parent view (`is_parent = true`) |
| Admin       | `admin2@seed.local`                             | Admin only                                |
| Teacher     | `teacher1@seed.local`                           | Also has parent view (`is_parent = true`) |
| Teacher     | `teacher2@seed.local`                           | Also has parent view (`is_parent = true`) |
| Teacher     | `teacher3@seed.local`                           | Also has parent view (`is_parent = true`) |
| Teacher     | `teacher4@seed.local` – `teacher10@seed.local`  | Teacher only                              |
| Parent      | `parent1@seed.local` – `parent67@seed.local`    | 67 parent accounts                        |
| Student     | `student1@seed.local` – `student110@seed.local` | 110 student accounts                      |

---

## What Gets Seeded

### Users (190 total)

| Role          | Count | Details                                                     |
| ------------- | ----- | ----------------------------------------------------------- |
| `super_admin` | 1     | Full access to all portals                                  |
| `admin`       | 2     | 1 with `is_parent = true`                                   |
| `teacher`     | 10    | 3 with `is_parent = true`, each has specializations and bio |
| `parent`      | 67    | Default role                                                |
| `student`     | 110   | Each has their own auth account                             |

### Classes (30 total)

- **25 published**, **5 draft**
- 3 classes per teacher, no schedule overlaps
- Each class has a populated `schedule_config` JSONB: `{ day, block, recurring, startDate, endDate }`
- Days: `Tuesday/Thursday`, `Tuesday`, `Wednesday`, `Thursday`
- Blocks: `Block 1` – `Block 5`
- `start_time` / `end_time`: `"TBA"` (matches app behavior)
- Semester: March 1 – May 31, 2026
- Capacity: 15–25 students per class

### Family Members (120 total)

- **110** student-linked (connecting parents → students)
  - First 43 parents have 2 children, remaining 24 have 1 child
- **10** for multi-role users (teachers/admins with parent view)
  - 2 children each for `teacher1`, `teacher2`, `teacher3`, and `admin1`
  - 1 Parent/Guardian each for `teacher1` and `admin1`
- Grades randomly assigned: `elementary`, `middle school`, `high school`

### Enrollments (40 total)

| Status       | Count | Description                                             |
| ------------ | ----- | ------------------------------------------------------- |
| `confirmed`  | 25    | Spread across different published classes               |
| `waitlisted` | 10    | Concentrated in a few classes to simulate full capacity |
| `pending`    | 5     | Awaiting payment                                        |

---

## Multi-Role View Switching

These accounts have `is_parent = true` and a family member, enabling the parent/teacher or parent/admin view toggle:

- `teacher1@seed.local`, `teacher2@seed.local`, `teacher3@seed.local`
- `admin1@seed.local`
