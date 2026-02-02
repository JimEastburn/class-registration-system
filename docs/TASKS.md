# Class Registration System - Master Task List

This document tracks the detailed development tasks for the Class Registration System. It is designed to be consumed by autonomous agents via the `subagent-loop` workflow, with atomic, testable tasks.

> [!NOTE]
> Each task is designed to be completable within a single context window (~150 tasks per refresh).
> Tasks are tagged with `<!-- id: X.Y.Z -->` for tracking.

---

## Phase 1: Foundation & Infrastructure

### 1.1 Project & Environment Setup

- [x] **[Setup]** Initialize Next.js 16 (App Router) project with TypeScript via `create-next-app` <!-- id: 1.1.1 -->
- [x] **[Setup]** Configure Tailwind CSS v4 (ensure `postcss` and `autoprefixer` removed if using v4 native) <!-- id: 1.1.2 -->
- [x] **[Setup]** Initialize `shadcn/ui` CLI and install base components: `button`, `input`, `label`, `card` <!-- id: 1.1.3 -->
- [x] **[Setup]** Install additional shadcn components: `toast`, `dialog`, `select`, `dropdown-menu` <!-- id: 1.1.4 -->
- [x] **[Setup]** Install additional shadcn components: `avatar`, `badge`, `table`, `tabs` <!-- id: 1.1.5 -->
- [x] **[Setup]** Configure ESLint with Next.js recommended rules <!-- id: 1.1.6 -->
- [x] **[Setup]** Configure Prettier with `prettier-plugin-tailwindcss` <!-- id: 1.1.7 -->
- [x] **[Setup]** Create `.env.example` template with all required environment variables <!-- id: 1.1.8 -->
- [x] **[Setup]** Create `vercel.json` configuration for deployment settings <!-- id: 1.1.9 -->
- [x] **[Setup]** Configure `vitest` testing environment with React Testing Library <!-- id: 1.1.10 -->
- [x] **[Setup]** Configure `playwright` E2E testing environment <!-- id: 1.1.11 -->

---

### 1.2 Core Libraries & Utilities

- [x] **[Lib]** Create `src/lib/utils.ts` with `cn` helper (clsx + tailwind-merge) <!-- id: 1.2.1 -->
- [x] **[Lib]** Create `src/lib/supabase/client.ts` (Client Component Supabase client) <!-- id: 1.2.2 -->
- [x] **[Lib]** Create `src/lib/supabase/server.ts` (Server Component client using `createServerClient`) <!-- id: 1.2.3 -->
- [x] **[Lib]** Create `src/lib/supabase/middleware.ts` (Middleware client for auth guarding) <!-- id: 1.2.4 -->
- [x] **[Lib]** Create `src/lib/stripe.ts` (Stripe SDK client configuration) <!-- id: 1.2.5 -->
- [x] **[Lib]** Create `src/lib/resend.ts` (Resend email SDK configuration) <!-- id: 1.2.6 -->
- [x] **[Lib]** Create `src/lib/zoho.ts` (Zoho Books auth & token refresh logic) <!-- id: 1.2.7 -->

---

### 1.3 Type Definitions

- [x] **[Type]** Create `src/types/index.ts` with `Profile` interface (id, email, role, first_name, last_name, phone) <!-- id: 1.3.1 -->
- [x] **[Type]** Add `FamilyMember` interface (id, parent_id, student_user_id, first_name, last_name, grade, dob) <!-- id: 1.3.2 -->
- [x] **[Type]** Add `Class` interface (id, teacher_id, title, description, capacity, price, location, schedule_config, status) <!-- id: 1.3.3 -->
- [x] **[Type]** Add `Enrollment` interface (id, student_id, class_id, status, created_at) <!-- id: 1.3.4 -->
- [x] **[Type]** Add `Payment` interface (id, enrollment_id, stripe_payment_intent, amount, status, sync_status, created_at) <!-- id: 1.3.5 -->
- [x] **[Type]** Add `ClassBlock` interface (teacher_id, student_id, reason) <!-- id: 1.3.6 -->
- [x] **[Type]** Add `CalendarEvent` interface (id, class_id, start_time, end_time, location, description) <!-- id: 1.3.7 -->
- [x] **[Type]** Add `AuditLog` interface (id, user_id, action, target_type, target_id, details, created_at) <!-- id: 1.3.8 -->
- [x] **[Type]** Add role union type: `UserRole = 'parent' | 'teacher' | 'student' | 'admin' | 'class_scheduler' | 'super_admin'` <!-- id: 1.3.9 -->
- [x] **[Type]** Add enrollment status union: `EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlisted'` <!-- id: 1.3.10 -->
- [x] **[Type]** Add payment status union: `PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'` <!-- id: 1.3.11 -->

---

### 1.4 Validation Schemas

- [x] **[Validation]** Create `src/lib/validations.ts` with Zod schemas <!-- id: 1.4.1 -->
- [x] **[Validation]** Add `loginSchema` (email, password) <!-- id: 1.4.2 -->
- [x] **[Validation]** Add `registerSchema` (email, password, confirmPassword, firstName, lastName) <!-- id: 1.4.3 -->
- [x] **[Validation]** Add `profileSchema` (firstName, lastName, phone, role) <!-- id: 1.4.4 -->
- [x] **[Validation]** Add `familyMemberSchema` (firstName, lastName, grade, dob, email optional) <!-- id: 1.4.5 -->
- [x] **[Validation]** Add `classSchema` (title, description, capacity, price, location, scheduleConfig) <!-- id: 1.4.6 -->
- [x] **[Validation]** Add `enrollmentSchema` (studentId, classId) <!-- id: 1.4.7 -->
- [x] **[Validation]** Add `scheduleConfigSchema` (dayOfWeek, startTime, endTime, recurring) <!-- id: 1.4.8 -->

---

## Phase 2: Database Schema

### 2.1 Core Tables

- [x] **[DB]** Create migration for `profiles` table (id UUID PK, email, role, first_name, last_name, phone, created_at) <!-- id: 2.1.1 -->
- [x] **[DB]** Create migration for `family_members` table (id, parent_id FK->profiles, student_user_id FK->profiles nullable, first_name, last_name, grade, dob) <!-- id: 2.1.2 -->
- [x] **[DB]** Create migration for `classes` table (id, teacher_id FK, title, description, capacity, price, location, schedule_config JSONB, status, created_at) <!-- id: 2.1.3 -->
- [x] **[DB]** Create migration for `enrollments` table (id, student_id FK, class_id FK, status, waitlist_position nullable, created_at) <!-- id: 2.1.4 -->
- [x] **[DB]** Create migration for `payments` table (id, enrollment_id FK, stripe_payment_intent, amount, status, sync_status, created_at) <!-- id: 2.1.5 -->

---

### 2.2 Supporting Tables

- [x] **[DB]** Create migration for `class_blocks` table (id, teacher_id FK, student_id FK, reason, created_at) <!-- id: 2.2.1 -->
- [x] **[DB]** Create migration for `calendar_events` table (id, class_id FK, start_time, end_time, location, description) <!-- id: 2.2.2 -->
- [x] **[DB]** Create migration for `class_materials` table (id, class_id FK, title, file_url, type, created_at) <!-- id: 2.2.3 -->
- [x] **[DB]** Create migration for `audit_logs` table (id, user_id FK, action, target_type, target_id, details JSONB, created_at) <!-- id: 2.2.4 -->
- [x] **[DB]** Create migration for `system_settings` table (key PRIMARY KEY, value JSONB, updated_at) <!-- id: 2.2.5 -->

---

### 2.3 Indexes & Performance

- [x] **[DB]** Create index on `profiles(email)` <!-- id: 2.3.1 -->
- [x] **[DB]** Create index on `profiles(role)` <!-- id: 2.3.2 -->
- [x] **[DB]** Create index on `family_members(parent_id)` <!-- id: 2.3.3 -->
- [x] **[DB]** Create index on `classes(teacher_id)` <!-- id: 2.3.4 -->
- [x] **[DB]** Create index on `classes(status)` <!-- id: 2.3.5 -->
- [x] **[DB]** Create index on `enrollments(class_id, status)` <!-- id: 2.3.6 -->
- [x] **[DB]** Create index on `enrollments(student_id)` <!-- id: 2.3.7 -->
- [x] **[DB]** Create index on `payments(enrollment_id)` <!-- id: 2.3.8 -->
- [x] **[DB]** Create index on `calendar_events(class_id)` <!-- id: 2.3.9 -->
- [x] **[DB]** Create index on `calendar_events(start_time)` <!-- id: 2.3.10 -->

---

### 2.4 Row Level Security (RLS) Policies

- [x] **[RLS]** Enable RLS on `profiles` table with "Deny All" default <!-- id: 2.4.1 -->
- [x] **[RLS]** Create `profiles` policy: Users can view their own profile <!-- id: 2.4.2 -->
- [x] **[RLS]** Create `profiles` policy: Users can update their own profile <!-- id: 2.4.3 -->
- [x] **[RLS]** Create `profiles` policy: Admins/Super Admins can view all profiles <!-- id: 2.4.4 -->
- [x] **[RLS]** Create `profiles` policy: Teachers can view enrolled students' profiles <!-- id: 2.4.5 -->
- [x] **[RLS]** Enable RLS on `family_members` table with "Deny All" default <!-- id: 2.4.6 -->
- [x] **[RLS]** Create `family_members` policy: Parents can CRUD their own family members <!-- id: 2.4.7 -->
- [x] **[RLS]** Create `family_members` policy: Admins can view all family members <!-- id: 2.4.8 -->
- [x] **[RLS]** Enable RLS on `classes` table with "Deny All" default <!-- id: 2.4.9 -->
- [x] **[RLS]** Create `classes` policy: Public read access for active classes <!-- id: 2.4.10 -->
- [x] **[RLS]** Create `classes` policy: Teachers can CRUD their own classes <!-- id: 2.4.11 -->
- [x] **[RLS]** Create `classes` policy: Admins/Class Schedulers can CRUD all classes <!-- id: 2.4.12 -->
- [x] **[RLS]** Enable RLS on `enrollments` table with "Deny All" default <!-- id: 2.4.13 -->
- [x] **[RLS]** Create `enrollments` policy: Parents can view their family's enrollments <!-- id: 2.4.14 -->
- [x] **[RLS]** Create `enrollments` policy: Teachers can view enrollments for their classes <!-- id: 2.4.15 -->
- [x] **[RLS]** Create `enrollments` policy: Admins can view/manage all enrollments <!-- id: 2.4.16 -->
- [x] **[RLS]** Enable RLS on `payments` table with "Deny All" default <!-- id: 2.4.17 -->
- [x] **[RLS]** Create `payments` policy: Parents can view their payment records <!-- id: 2.4.18 -->
- [x] **[RLS]** Create `payments` policy: Admins can view all payment records <!-- id: 2.4.19 -->
- [x] **[RLS]** Enable RLS on `audit_logs` table - Admins only <!-- id: 2.4.20 -->
- [x] **[RLS]** Create Super Admin bypass policy using service role key pattern <!-- id: 2.4.21 -->

---

### 2.5 Database Triggers

- [x] **[Trigger]** Create `handle_new_user` trigger on `auth.users` to auto-create profile (with `ON CONFLICT DO NOTHING`) <!-- id: 2.5.1 -->
- [x] **[Trigger]** Create `on_profile_role_change` trigger for audit logging <!-- id: 2.5.2 -->
- [x] **[Trigger]** Create `on_enrollment_status_change` trigger for audit logging <!-- id: 2.5.3 -->
- [x] **[Trigger]** Create `update_updated_at` trigger for `system_settings` table <!-- id: 2.5.4 -->

---

## Phase 3: Authentication & Authorization

### 3.1 Middleware & Route Protection

- [x] **[Auth]** Create `src/middleware.ts` with Supabase session refresh logic <!-- id: 3.1.1 -->
- [x] **[Auth]** Add route protection for `/parent/*` - require authenticated user with parent/teacher/admin/super_admin role <!-- id: 3.1.2 -->
- [x] **[Auth]** Add route protection for `/teacher/*` - require teacher/admin/super_admin role <!-- id: 3.1.3 -->
- [x] **[Auth]** Add route protection for `/student/*` - require student/parent (viewing child)/admin role <!-- id: 3.1.4 -->
- [x] **[Auth]** Add route protection for `/admin/*` - require admin/super_admin role <!-- id: 3.1.5 -->
- [x] **[Auth]** Add route protection for `/class-scheduler/*` - require class_scheduler/super_admin role <!-- id: 3.1.6 -->
- [x] **[Auth]** Add unauthenticated redirect to `/login` <!-- id: 3.1.7 -->
- [x] **[Auth]** Add post-login redirect based on user role <!-- id: 3.1.8 -->

---

### 3.2 Auth Server Actions

- [x] **[Action]** Create `src/lib/actions/auth.ts` with ActionResult type definition <!-- id: 3.2.1 -->
- [x] **[Action]** Implement `signUp` action (email, password, firstName, lastName) <!-- id: 3.2.2 -->
- [x] **[Action]** Implement `signIn` action (email, password) with profile existence check <!-- id: 3.2.3 -->
- [x] **[Action]** Implement `signOut` action <!-- id: 3.2.4 -->
- [x] **[Action]** Implement `resetPassword` action (send reset email) <!-- id: 3.2.5 -->
- [x] **[Action]** Implement `updatePassword` action (for password reset flow) <!-- id: 3.2.6 -->
- [x] **[Action]** Add "Belt and Suspenders" profile creation in `signIn` (fallback if trigger fails) <!-- id: 3.2.7 -->

---

### 3.3 Auth Pages

- [x] **[Page]** Create `src/app/(auth)/layout.tsx` (auth pages layout wrapper) <!-- id: 3.3.1 -->
- [x] **[Page]** Create `src/app/(auth)/login/page.tsx` with form and validation <!-- id: 3.3.2 -->
- [x] **[Component]** Create `src/components/auth/LoginForm.tsx` with Zod validation <!-- id: 3.3.3 -->
- [x] **[Page]** Create `src/app/(auth)/register/page.tsx` with form and validation <!-- id: 3.3.4 -->
- [x] **[Component]** Create `src/components/auth/RegisterForm.tsx` with Zod validation <!-- id: 3.3.5 -->
- [x] **[Page]** Create `src/app/(auth)/forgot-password/page.tsx` <!-- id: 3.3.6 -->
- [x] **[Page]** Create `src/app/(auth)/reset-password/page.tsx` (for reset token handling) <!-- id: 3.3.7 -->
- [x] **[Page]** Create `src/app/(auth)/callback/route.ts` for OAuth/magic link callback <!-- id: 3.3.8 -->

---

## Phase 4: Dashboard Layout & Multi-Role Architecture

### 4.1 Shared Dashboard Layout

- [x] **[Layout]** Create `src/app/(dashboard)/layout.tsx` (shared app shell) <!-- id: 4.1.1 -->
- [x] **[Component]** Create `src/components/dashboard/Sidebar.tsx` skeleton <!-- id: 4.1.2 -->
- [x] **[Component]** Add navigation items to Sidebar based on user role <!-- id: 4.1.3 -->
- [x] **[Component]** Create `src/components/dashboard/Topbar.tsx` with user menu <!-- id: 4.1.4 -->
- [x] **[Component]** Add user avatar and dropdown to Topbar <!-- id: 4.1.5 -->
- [x] **[Component]** Create `src/components/dashboard/MobileNav.tsx` for responsive navigation <!-- id: 4.1.6 -->

---

### 4.2 Multi-Role Switching

- [x] **[Action]** Create `src/lib/actions/profile.ts` with `switchProfileView` action (sets cookie) <!-- id: 4.2.1 -->
- [x] **[Action]** Add `getActiveView` helper to read view preference cookie <!-- id: 4.2.2 -->
- [x] **[Component]** Create `src/components/dashboard/PortalSwitcher.tsx` dropdown component <!-- id: 4.2.3 -->
- [x] **[Component]** Add portal options based on user's allowed views (Teacher->Parent, Admin->Parent, etc.) <!-- id: 4.2.4 -->
- [x] **[Component]** Implement Super Admin "God Mode" with access to ALL views <!-- id: 4.2.5 -->
- [x] **[Component]** Create `src/components/dashboard/RoleBadge.tsx` to display current view context <!-- id: 4.2.6 -->
- [x] **[Logic]** Enforce constraint: Regular Admin cannot access Scheduler View <!-- id: 4.2.7 -->
- [x] **[Logic]** Enforce constraint: Class Scheduler cannot be Teacher or Student <!-- id: 4.2.8 -->

---

## Phase 5: Parent Portal Features

### 5.1 Parent Dashboard

- [x] **[Page]** Create `src/app/(dashboard)/parent/page.tsx` (Dashboard overview) <!-- id: 5.1.1 -->
- [x] **[Component]** Create `FamilySummaryCard` showing family member count and quick actions <!-- id: 5.1.2 -->
- [x] **[Component]** Create `UpcomingClassesCard` showing next 5 scheduled classes for family <!-- id: 5.1.3 -->
- [x] **[Component]** Create `RecentPaymentsCard` showing last 3 payments <!-- id: 5.1.4 -->
- [x] **[Component]** Create `PendingEnrollmentsCard` showing enrollments awaiting payment <!-- id: 5.1.5 -->

---

### 5.2 Family Management - Server Actions

- [x] **[Action]** Create `src/lib/actions/family.ts` with base structure <!-- id: 5.2.1 -->
- [x] **[Action]** Implement `getFamilyMembers` action (fetch parent's family) <!-- id: 5.2.2 -->
- [x] **[Action]** Implement `createFamilyMember` action with validation <!-- id: 5.2.3 -->
- [x] **[Action]** Implement `updateFamilyMember` action with ownership check <!-- id: 5.2.4 -->
- [x] **[Action]** Implement `deleteFamilyMember` action with ownership check <!-- id: 5.2.5 -->
- [x] **[Action]** Add audit logging to family member mutations <!-- id: 5.2.6 -->

---

### 5.3 Family Management - UI

- [x] **[Page]** Create `src/app/(dashboard)/parent/family/page.tsx` (Family list) <!-- id: 5.3.1 -->
- [x] **[Component]** Create `src/components/family/FamilyMemberList.tsx` <!-- id: 5.3.2 -->
- [x] **[Component]** Create `src/components/family/FamilyMemberCard.tsx` with edit/delete actions <!-- id: 5.3.3 -->
- [x] **[Component]** Create `src/components/family/AddFamilyMemberDialog.tsx` with form <!-- id: 5.3.4 -->
- [x] **[Component]** Create `src/components/family/EditFamilyMemberDialog.tsx` with form <!-- id: 5.3.5 -->
- [x] **[Component]** Create `src/components/family/DeleteFamilyMemberDialog.tsx` confirmation <!-- id: 5.3.6 -->

---

### 5.4 Student Linking (Email-based)

- [x] **[Action]** Create `src/lib/actions/invites.ts` with base structure <!-- id: 5.4.1 -->
- [x] **[Action]** Implement `linkStudentByEmail` action (search for student, link if exists) <!-- id: 5.4.2 -->
- [x] **[Action]** Implement `createPendingLink` action (if student doesn't exist yet) <!-- id: 5.4.3 -->
- [x] **[Action]** Implement `completePendingLink` action (called when student registers) <!-- id: 5.4.4 -->
- [x] **[Logic]** Add validation to prevent double-linking (student already linked to another parent) <!-- id: 5.4.5 -->
- [x] **[Component]** Create `src/components/family/LinkStudentDialog.tsx` with email input <!-- id: 5.4.6 -->
- [x] **[Component]** Add linked status badge to FamilyMemberCard <!-- id: 5.4.7 -->

---

### 5.5 Class Browsing

- [x] **[Action]** Create `src/lib/actions/classes.ts` with base structure <!-- id: 5.5.1 -->
- [x] **[Action]** Implement `getAvailableClasses` action (active classes with capacity) <!-- id: 5.5.2 -->
- [x] **[Action]** Implement `getClassById` action (single class details) <!-- id: 5.5.3 -->
- [x] **[Action]** Add filtering by teacher, day of week, time slot <!-- id: 5.5.4 -->
- [x] **[Page]** Create `src/app/(dashboard)/parent/browse/page.tsx` (Class catalog) <!-- id: 5.5.5 -->
- [x] **[Component]** Create `src/components/classes/ClassFilters.tsx` (filter controls) <!-- id: 5.5.6 -->
- [x] **[Component]** Create `src/components/classes/ClassGrid.tsx` (responsive grid) <!-- id: 5.5.7 -->
- [x] **[Component]** Create `src/components/classes/ClassCard.tsx` with teacher info and availability <!-- id: 5.5.8 -->
- [x] **[Page]** Create `src/app/(dashboard)/parent/browse/[id]/page.tsx` (Class detail view) <!-- id: 5.5.9 -->

---

### 5.6 Enrollment

- [x] **[Action]** Create `src/lib/actions/enrollments.ts` with base structure <!-- id: 5.6.1 -->
- [x] **[Action]** Implement `enrollStudent` action with capacity check <!-- id: 5.6.2 -->
- [x] **[Action]** Add logic: If capacity full, add to waitlist instead <!-- id: 5.6.3 -->
- [x] **[Action]** Implement `getEnrollmentsForFamily` action <!-- id: 5.6.4 -->
- [x] **[Action]** Implement `cancelEnrollment` action (before payment) <!-- id: 5.6.5 -->
- [x] **[Action]** Add check for teacher blocks (student cannot enroll if blocked) <!-- id: 5.6.6 -->
- [x] **[Component]** Create `src/components/classes/EnrollStudentDialog.tsx` (select child, confirm) <!-- id: 5.6.7 -->
- [x] **[Component]** Create `src/components/classes/EnrollmentStatusBadge.tsx` <!-- id: 5.6.8 -->
- [x] **[Page]** Create `src/app/(dashboard)/parent/enrollments/page.tsx` (Enrollment history) <!-- id: 5.6.9 -->
- [x] **[Component]** Create `src/components/classes/EnrollmentTable.tsx` <!-- id: 5.6.10 -->

---

### 5.7 Waitlist Management

- [x] **[Action]** Create `src/lib/actions/waitlist.ts` with base structure <!-- id: 5.7.1 -->
- [x] **[Action]** Implement `addToWaitlist` action (set waitlist_position) <!-- id: 5.7.2 -->
- [x] **[Action]** Implement `removeFromWaitlist` action <!-- id: 5.7.3 -->
- [x] **[Action]** Implement `promoteFromWaitlist` action (when spot opens) <!-- id: 5.7.4 -->
- [x] **[Logic]** Add automatic waitlist promotion when enrollment is cancelled <!-- id: 5.7.5 -->
- [x] **[Component]** Create `WaitlistPositionBadge` component <!-- id: 5.7.6 -->

---

## Phase 6: Teacher Portal Features

### 6.1 Teacher Dashboard

- [x] **[Page]** Create `src/app/(dashboard)/teacher/page.tsx` (Dashboard overview) <!-- id: 6.1.1 -->
- [x] **[Component]** Create `TeacherStatsCards` (total classes, total students, upcoming sessions) <!-- id: 6.1.2 -->
- [x] **[Component]** Create `TeacherClassList` (list of teacher's classes with quick actions) <!-- id: 6.1.3 -->
- [x] **[Component]** Create `TodayScheduleCard` (today's sessions) <!-- id: 6.1.4 -->

---

### 6.2 Class Management - Server Actions
- [x] **[Action]** Implement `createClass` action in `classes.ts` <!-- id: 6.2.1 -->
- [x] **[Action]** Implement `updateClass` action with ownership check <!-- id: 6.2.2 -->
- [x] **[Action]** Implement `deleteClass` action (drafts only, soft-delete published) <!-- id: 6.2.3 -->
- [x] **[Action]** Implement `publishClass` action (draft -> active status) <!-- id: 6.2.4 -->
- [x] **[Action]** Implement `cancelClass` action (with enrollment handling) <!-- id: 6.2.5 -->
- [x] **[Action]** Implement `completeClass` action (mark as finished) <!-- id: 6.2.6 -->
- [x] **[Action]** Implement `getTeacherClasses` action <!-- id: 6.2.7 -->
- [x] **[Logic]** Add default schedule as "To Be Announced" for teacher-created classes <!-- id: 6.2.8 -->

---

### 6.3 Class Management - UI

- [x] **[Page]** Create `src/app/(dashboard)/teacher/classes/page.tsx` (Class list) <!-- id: 6.3.1 -->
- [x] **[Component]** Create `src/components/teacher/ClassManagementTable.tsx` <!-- id: 6.3.2 -->
- [x] **[Page]** Create `src/app/(dashboard)/teacher/classes/new/page.tsx` (Create class form) <!-- id: 6.3.3 -->
- [x] **[Component]** Create `src/components/teacher/ClassForm.tsx` with all fields <!-- id: 6.3.4 -->
- [x] **[Page]** Create `src/app/(dashboard)/teacher/classes/[id]/page.tsx` (Class detail & roster) <!-- id: 6.3.5 -->
- [x] **[Page]** Create `src/app/(dashboard)/teacher/classes/[id]/edit/page.tsx` (Edit class) <!-- id: 6.3.6 -->
- [x] **[Component]** Create class status transition buttons (Publish, Cancel, Complete) <!-- id: 6.3.7 -->

---

### 6.4 Student Roster

- [x] **[Action]** Implement `getClassRoster` action in `enrollments.ts` <!-- id: 6.4.1 -->
- [x] **[Action]** Add student contact info (via parent) to roster data <!-- id: 6.4.2 -->
- [x] **[Component]** Create `src/components/teacher/StudentRosterTable.tsx` <!-- id: 6.4.3 -->
- [x] **[Component]** Add parent contact info column to roster <!-- id: 6.4.4 -->
- [x] **[Component]** Add attendance status column (placeholder for future) <!-- id: 6.4.5 -->

---

### 6.5 Student Blocking

- [x] **[Action]** Implement `blockStudent` action (create class_blocks record) <!-- id: 6.5.1 -->
- [x] **[Action]** Implement `unblockStudent` action (remove class_blocks record) <!-- id: 6.5.2 -->
- [x] **[Action]** Implement `getBlockedStudents` action for teacher <!-- id: 6.5.3 -->
- [x] **[Component]** Create `BlockStudentDialog.tsx` with reason field <!-- id: 6.5.4 -->
- [x] **[Component]** Add "Blocked" badge to roster for blocked students <!-- id: 6.5.5 -->
- [x] **[Page]** Create `src/app/(dashboard)/teacher/blocked/page.tsx` (Blocked students list) <!-- id: 6.5.6 -->

---

### 6.6 Class Materials

- [x] **[Action]** Create `src/lib/actions/materials.ts` with base structure <!-- id: 6.6.1 -->
- [x] **[Action]** Implement `addMaterial` action (save URL, type, title) <!-- id: 6.6.2 -->
- [x] **[Action]** Implement `updateMaterial` action <!-- id: 6.6.3 -->
- [x] **[Action]** Implement `deleteMaterial` action <!-- id: 6.6.4 -->
- [x] **[Action]** Implement `getMaterialsForClass` action <!-- id: 6.6.5 -->
- [x] **[Component]** Create `src/components/teacher/MaterialsList.tsx` <!-- id: 6.6.6 -->
- [x] **[Component]** Create `src/components/teacher/AddMaterialDialog.tsx` (URL input, type select) <!-- id: 6.6.7 -->
- [x] **[Page]** Create `src/app/(dashboard)/teacher/classes/[id]/materials/page.tsx` <!-- id: 6.6.8 -->

---

## Phase 7: Student Portal Features

### 7.1 Student Dashboard

- [x] **[Page]** Create `src/app/(dashboard)/student/page.tsx` (Dashboard overview) <!-- id: 7.1.1 -->
- [x] **[Component]** Create `StudentStatsCards` (enrolled classes count, upcoming sessions) <!-- id: 7.1.2 -->
- [x] **[Component]** Create `NextClassCard` (next upcoming class with countdown) <!-- id: 7.1.3 -->
- [x] **[Logic]** Add check: Require linked account to view dashboard <!-- id: 7.1.4 -->

---

### 7.2 Student Schedule View

- [x] **[Action]** Implement `getStudentSchedule` action (all enrolled class events) <!-- id: 7.2.1 -->
- [x] **[Page]** Create `src/app/(dashboard)/student/schedule/page.tsx` <!-- id: 7.2.2 -->
- [x] **[Component]** Create `src/components/classes/WeeklyScheduleView.tsx` calendar component <!-- id: 7.2.3 -->
- [x] **[Component]** Add day/week view toggle to schedule <!-- id: 7.2.4 -->
- [x] **[Component]** Create `ScheduleEvent` card showing class name, time, location <!-- id: 7.2.5 -->

---

### 7.3 Student Class Detail

- [x] **[Page]** Create `src/app/(dashboard)/student/classes/[id]/page.tsx` <!-- id: 7.3.1 -->
- [x] **[Component]** Create `ClassDetailCard` with teacher info and description <!-- id: 7.3.2 -->
- [x] **[Component]** Create `ClassLocationCard` with address/room info <!-- id: 7.3.3 -->
- [x] **[Component]** Create `ClassMaterialsList` (read-only view of materials) <!-- id: 7.3.4 -->
- [x] **[Component]** Create `ClassScheduleCard` showing recurring schedule pattern <!-- id: 7.3.5 -->

---

## Phase 8: Admin Portal Features

### 8.1 Admin Dashboard

- [x] **[Page]** Create `src/app/(dashboard)/admin/page.tsx` (Dashboard overview) <!-- id: 8.1.1 -->
- [x] **[Component]** Create `SystemStatsCards` (total users, classes, enrollments, revenue) <!-- id: 8.1.2 -->
- [x] **[Component]** Create `RecentActivityFeed` (last 10 system activities from audit_logs) <!-- id: 8.1.3 -->
- [x] **[Component]** Create `PendingActionsCard` (items needing attention) <!-- id: 8.1.4 -->

---

### 8.2 User Management - Server Actions

- [x] **[Action]** Create `src/lib/actions/admin.ts` with base structure <!-- id: 8.2.1 -->
- [x] **[Action]** Implement `getAllUsers` action with pagination <!-- id: 8.2.2 -->
- [x] **[Action]** Implement `getUserById` action <!-- id: 8.2.3 -->
- [x] **[Action]** Implement `updateUserRole` action with constraint validation <!-- id: 8.2.4 -->
- [x] **[Action]** Add constraint: Teachers cannot be Class Schedulers <!-- id: 8.2.5 -->
- [x] **[Action]** Add constraint: Class Schedulers cannot be Teachers <!-- id: 8.2.6 -->
- [x] **[Action]** Implement `deleteUser` action (soft delete or cascade logic) <!-- id: 8.2.7 -->
- [x] **[Action]** Add audit logging to all admin actions <!-- id: 8.2.8 -->
- [x] **[Logic]** Implement immediate privilege revocation on role demotion <!-- id: 8.2.9 -->

---

### 8.3 User Management - UI

- [x] **[Page]** Create `src/app/(dashboard)/admin/users/page.tsx` (User list) <!-- id: 8.3.1 -->
- [x] **[Component]** Create `src/components/admin/UserManagementTable.tsx` with sorting/filtering <!-- id: 8.3.2 -->
- [x] **[Component]** Create `UserRoleSelect.tsx` dropdown with constraints displayed <!-- id: 8.3.3 -->
- [x] **[Component]** Create `ChangeRoleDialog.tsx` with confirmation <!-- id: 8.3.4 -->
- [x] **[Component]** Create `DeleteUserDialog.tsx` with impact warning <!-- id: 8.3.5 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/users/[id]/page.tsx` (User detail) <!-- id: 8.3.6 -->

---

### 8.4 Admin Class Management

- [x] **[Action]** Implement `getAllClasses` action with admin override <!-- id: 8.4.1 -->
- [x] **[Action]** Implement `adminUpdateClass` action (can edit any class) <!-- id: 8.4.2 -->
- [x] **[Action]** Implement `adminDeleteClass` action <!-- id: 8.4.3 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/classes/page.tsx` <!-- id: 8.4.4 -->
- [x] **[Component]** Create `src/components/admin/AdminClassTable.tsx` <!-- id: 8.4.5 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/classes/[id]/page.tsx` (Class detail with admin controls) <!-- id: 8.4.6 -->

---

### 8.5 Admin Enrollment Management

- [x] **[Action]** Implement `adminForceEnroll` action (bypass capacity/blocks) <!-- id: 8.5.1 -->
- [x] **[Action]** Implement `adminCancelEnrollment` action with refund flag <!-- id: 8.5.2 -->
- [x] **[Action]** Implement `adminRemoveEnrollment` action (hard delete) <!-- id: 8.5.3 -->
- [x] **[Action]** Implement `getAllEnrollments` action with filters <!-- id: 8.5.4 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/enrollments/page.tsx` <!-- id: 8.5.5 -->
- [x] **[Component]** Create `src/components/admin/EnrollmentManagementTable.tsx` <!-- id: 8.5.6 -->
- [x] **[Component]** Create `ForceEnrollDialog.tsx` <!-- id: 8.5.7 -->
- [x] **[Component]** Create `CancelEnrollmentDialog.tsx` with refund option <!-- id: 8.5.8 -->

---

### 8.6 Admin Payment Management

- [x] **[Action]** Implement `getAllPayments` action with date/status filters <!-- id: 8.6.1 -->
- [x] **[Action]** Implement `updatePaymentStatus` action (for manual corrections) <!-- id: 8.6.2 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/payments/page.tsx` <!-- id: 8.6.3 -->
- [x] **[Component]** Create `src/components/admin/PaymentTable.tsx` with revenue totals <!-- id: 8.6.4 -->
- [x] **[Component]** Create `PaymentDetailDialog.tsx` showing full transaction info <!-- id: 8.6.5 -->

---

### 8.7 System Settings

- [x] **[Action]** Create `src/lib/actions/settings.ts` with base structure <!-- id: 8.7.1 -->
- [x] **[Action]** Implement `getSetting` action (key-value lookup) <!-- id: 8.7.2 -->
- [x] **[Action]** Implement `updateSetting` action (admin only) <!-- id: 8.7.3 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/settings/page.tsx` <!-- id: 8.7.4 -->
- [x] **[Component]** Create settings form for: Registration Open Date, Semester Dates <!-- id: 8.7.5 -->
- [x] **[Component]** Create settings form for: Default Class Capacity, Payment Deadline Days <!-- id: 8.7.6 -->

---

### 8.8 CSV Export

- [x] **[Endpoint]** Create `src/app/api/export/route.ts` (API route for CSV download) <!-- id: 8.8.1 -->
- [x] **[Logic]** Add export type parameter: `users`, `classes`, `enrollments`, `payments` <!-- id: 8.8.2 -->
- [x] **[Logic]** Implement CSV generation with proper escaping <!-- id: 8.8.3 -->
- [x] **[Logic]** Add formula injection protection (prefix cells with `'`) <!-- id: 8.8.4 -->
- [x] **[Logic]** Add admin role verification <!-- id: 8.8.5 -->
- [x] **[Component]** Create `ExportButton.tsx` with type selection dropdown <!-- id: 8.8.6 -->

---

### 8.9 Audit Logs

- [x] **[Action]** Implement `getAuditLogs` action with pagination and filters <!-- id: 8.9.1 -->
- [x] **[Page]** Create `src/app/(dashboard)/admin/audit/page.tsx` <!-- id: 8.9.2 -->
- [x] **[Component]** Create `src/components/admin/AuditLogTable.tsx` <!-- id: 8.9.3 -->
- [x] **[Component]** Add user, action type, and date range filters <!-- id: 8.9.4 -->

---

## Phase 9: Class Scheduler Portal Features

### 9.1 Scheduler Dashboard

- [x] **[Page]** Create `src/app/(dashboard)/class-scheduler/page.tsx` (Dashboard overview) <!-- id: 9.1.1 -->
- [x] **[Component]** Create `SchedulerStatsCards` (total classes, pending schedules, conflicts) <!-- id: 9.1.2 -->
- [x] **[Component]** Create `UnscheduledClassesList` (classes awaiting schedule) <!-- id: 9.1.3 -->
- [x] **[Component]** Create `ConflictAlertsList` (detected scheduling conflicts) <!-- id: 9.1.4 -->

---

### 9.2 Scheduler Class Management

- [x] **[Action]** Implement `getClassesForScheduler` action (all classes, any teacher) <!-- id: 9.2.1 -->
- [x] **[Action]** Implement `schedulerUpdateClass` action (schedule editing) <!-- id: 9.2.2 -->
- [x] **[Action]** Implement `schedulerCreateClass` action (can create for any teacher) <!-- id: 9.2.3 -->
- [x] **[Page]** Create `src/app/(dashboard)/class-scheduler/classes/page.tsx` <!-- id: 9.2.4 -->
- [x] **[Component]** Create `src/components/class-scheduler/SchedulerClassTable.tsx` <!-- id: 9.2.5 -->
- [x] **[Page]** Create `src/app/(dashboard)/class-scheduler/classes/new/page.tsx` <!-- id: 9.2.6 -->
- [x] **[Page]** Create `src/app/(dashboard)/class-scheduler/classes/[id]/page.tsx` <!-- id: 9.2.7 -->

---

### 9.3 Conflict Detection

- [x] **[Logic]** Create `src/lib/logic/scheduler.ts` with conflict detection algorithm <!-- id: 9.3.1 -->
- [x] **[Logic]** Implement `checkScheduleOverlap` function (same teacher, overlapping times) <!-- id: 9.3.2 -->
- [x] **[Logic]** Implement `checkRoomConflict` function (same location, overlapping times) <!-- id: 9.3.3 -->
- [x] **[Logic]** Implement `getConflictingClasses` function (return all conflicts for a schedule) <!-- id: 9.3.4 -->
- [x] **[Action]** Add conflict check to `schedulerUpdateClass` action <!-- id: 9.3.5 -->
- [x] **[Action]** Add conflict check to `schedulerCreateClass` action <!-- id: 9.3.6 -->

---

### 9.4 Calendar View

- [x] **[Page]** Create `src/app/(dashboard)/class-scheduler/calendar/page.tsx` <!-- id: 9.4.1 -->
- [x] **[Component]** Create `src/components/class-scheduler/MasterCalendarGrid.tsx` <!-- id: 9.4.2 -->
- [x] **[Component]** Add week/month view toggle <!-- id: 9.4.3 -->
- [x] **[Component]** Add teacher filter to calendar <!-- id: 9.4.4 -->
- [x] **[Component]** Add location filter to calendar <!-- id: 9.4.5 -->
- [x] **[Component]** Create `CalendarEventCard.tsx` for each class session <!-- id: 9.4.6 -->
- [x] **[Component]** Highlight conflicts in red on calendar <!-- id: 9.4.7 -->
- [x] **[API]** Enforce room conflict prevention in server actions <!-- id: 9.4.8 -->

---

### 9.5 Drag & Drop Scheduling (Future Enhancement)

- [x] **[Feature]** Implement Drag & Drop Logic for Scheduler <!-- id: 9.5.1 -->
  - [x] Add drag-and-drop capability to MasterCalendarGrid (optimistic UI)
  - [x] Implement drop handler with conflict validation (server action)
  - [x] Implement optimistic update with rollback on conflict <!-- id: 9.5.3 -->

---

## Phase 10: Super Admin Features

### 10.1 God Mode Access

- [x] **[Component]** Create `SuperAdminViewSwitcher.tsx` (global portal selector) <!-- id: 10.1.1 -->
- [x] **[Component]** Add all portal options: Admin, Scheduler, Teacher, Parent <!-- id: 10.1.2 -->
- [x] **[Logic]** Skip all view constraint checks for super_admin role <!-- id: 10.1.3 -->
- [x] **[Component]** Add visual indicator when in "borrowed" view (e.g., banner) <!-- id: 10.1.4 -->

---

### 10.2 RLS Bypass

- [x] **[Logic]** Ensure Super Admin actions use service role key for RLS bypass <!-- id: 10.2.1 -->
- [x] **[Logic]** Add audit logging for all Super Admin bypassed operations <!-- id: 10.2.2 -->
- [x] **[Logic]** Verify full data access and RLS bypass <!-- id: 10.2.3 -->

---

## Phase 11: Payment Integration (Stripe)

### 11.1 Checkout Flow

- [x] **[Endpoint]** Create `src/app/api/checkout/route.ts` <!-- id: 11.1.1 -->
- [x] **[Logic]** Verify user owns the enrollment being paid for <!-- id: 11.1.2 -->
- [x] **[Logic]** Ensure enrollment is in `pending` status <!-- id: 11.1.3 -->
- [x] **[Logic]** Create Stripe Checkout Session with class fee as line item <!-- id: 11.1.4 -->
- [x] **[Logic]** Create pending payment record in database <!-- id: 11.1.5 -->
- [x] **[Logic]** Return Stripe session URL for redirect <!-- id: 11.1.6 -->
- [x] **[Page]** Create `src/app/checkout/success/page.tsx` <!-- id: 11.1.7 -->
- [x] **[Page]** Create `src/app/checkout/cancel/page.tsx` <!-- id: 11.1.8 -->
- [x] **[Component]** Create `PaymentButton.tsx` component for pending enrollments <!-- id: 11.1.9 -->

---

### 11.2 Webhook Handler

- [x] **[API]** Create `src/app/api/webhooks/stripe/route.ts` <!-- id: 11.2.1 -->
- [x] **[Logic]** Handle `checkout.session.completed` (fulfill enrollment) <!-- id: 11.2.2 -->
- [x] **[Logic]** Handle `checkout.session.expired` (cancel pending enrollment) <!-- id: 11.2.3 -->
- [x] **[Logic]** Handle `charge.refunded` (update status) <!-- id: 11.2.4 -->
- [x] **[Logic]** Update enrollment status to `confirmed` <!-- id: 11.2.5 -->
- [x] **[Logic]** Implement idempotency check (check if already processed) <!-- id: 11.2.6 -->
- [x] **[Logic]** Handle `checkout.session.expired` event (mark payment failed) <!-- id: 11.2.7 -->
- [x] **[Logic]** Handle `charge.refunded` event (update payment status) <!-- id: 11.2.8 -->

---

### 11.3 Refunds

- [x] **[Action]** Create `src/lib/actions/refunds.ts` with base structure <!-- id: 11.3.1 -->
- [x] **[Action]** Implement `processRefund` action (call Stripe refund API) <!-- id: 11.3.2 -->
- [x] **[Action]** Update payment status to `refunded` <!-- id: 11.3.3 -->
- [x] **[Action]** Revert enrollment status appropriately <!-- id: 11.3.4 -->
- [x] **[Logic]** Release class capacity on refund (for waitlist promotion) <!-- id: 11.3.5 -->
- [x] **[Component]** Create `RefundButton.tsx` for admin use <!-- id: 11.3.6 -->
- [x] **[Component]** Create `RefundConfirmDialog.tsx` with amount input <!-- id: 11.3.7 -->

---

### 11.4 Invoice Generation

- [x] **[API]** Create `src/app/api/invoice/route.ts` (HTML invoice) <!-- id: 11.4.1 -->
- [x] **[Logic]** Verify user can access invoice (owner or admin) <!-- id: 11.4.2 -->
- [x] **[Component]** Create `InvoiceTemplate.tsx` server component <!-- id: 11.4.3 -->
- [x] **[Component]** Include student, class, dates, amount, transaction ID <!-- id: 11.4.4 -->
- [x] **[Component]** Add "View Invoice" button to Payment History <!-- id: 11.4.5 -->

---

## Phase 12: Zoho Books Integration

### 12.1 API Client

- [x] **[Lib]** Implement OAuth token refresh logic in `zoho.ts` <!-- id: 12.1.1 -->
- [x] **[Lib]** Create `getAccessToken` function with automatic refresh <!-- id: 12.1.2 -->
- [x] **[Lib]** Create Zoho API helper functions with error handling <!-- id: 12.1.3 -->

---

### 12.2 Data Sync Functions

- [x] **[Logic]** Implement `searchOrCreateContact` function (parent -> Zoho Contact) <!-- id: 12.2.1 -->
- [x] **[Logic]** Implement `createInvoice` function (enrollment -> Zoho Invoice) <!-- id: 12.2.2 -->
- [x] **[Logic]** Implement `recordPayment` function (payment -> Zoho Customer Payment) <!-- id: 12.2.3 -->

---

### 12.3 Webhook Integration

- [x] **[Logic]** Add Zoho sync trigger to Stripe webhook (after DB write success) <!-- id: 12.3.1 -->
- [x] **[Logic]** Make Zoho sync asynchronous (don't block checkout confirmation) <!-- id: 12.3.2 -->
- [x] **[Logic]** Add `sync_status` column to payments table for retry tracking <!-- id: 12.3.3 -->
- [x] **[Logic]** Log Zoho API failures for manual retry (fault tolerance) <!-- id: 12.3.4 -->

---

## Phase 13: Email Integration (Resend)

### 13.1 Email Templates

- [x] **[Email]** Create `src/lib/email.ts` with Resend client configuration <!-- id: 13.1.1 -->
- [x] **[Email]** Create `EnrollmentConfirmation` email template <!-- id: 13.1.2 -->
- [x] **[Email]** Create `PaymentReceipt` email template <!-- id: 13.1.3 -->
- [x] **[Email]** Create `WaitlistNotification` email template <!-- id: 13.1.4 -->
- [x] **[Email]** Create `ClassCancellation` email template <!-- id: 13.1.5 -->
- [x] **[Email]** Create `PasswordReset` email template <!-- id: 13.1.6 -->

---

### 13.2 Email Triggers

- [x] **[Logic]** Send enrollment confirmation on `checkout.session.completed` <!-- id: 13.2.1 -->
- [x] **[Logic]** Send payment receipt after payment record created <!-- id: 13.2.2 -->
- [x] **[Logic]** Send waitlist notification when promoted from waitlist <!-- id: 13.2.3 -->
- [x] **[Logic]** Send class cancellation email when admin cancels class <!-- id: 13.2.4 -->
- [x] **[Logic]** Send schedule change email when class details change <!-- id: 13.2.5 -->
- [x] **[Logic]** Send password reset email <!-- id: 13.2.6 -->

---

## Phase 14: Testing

### 14.1 Unit Tests (Vitest)

- [x] **[Test]** Create test setup file `vitest.setup.ts` with test utilities <!-- id: 14.1.1 -->
- [x] **[Test]** Create Supabase Fake client in `src/__integration__/fakes/supabase.ts` <!-- id: 14.1.2 -->
- [x] **[Test]** Create Stripe Fake provider in `src/__integration__/fakes/stripe.ts` <!-- id: 14.1.3 -->
- [x] **[Test]** Unit test all Zod schemas in `validations.ts` <!-- id: 14.1.4 -->
- [x] **[Test]** Unit test `cn` utility function <!-- id: 14.1.5 -->
- [x] **[Test]** Unit test scheduler conflict detection logic <!-- id: 14.1.6 -->

---

### 14.2 Server Action Tests

- [x] **[Test]** Test `signUp` action happy path and validation errors <!-- id: 14.2.1 -->
- [x] **[Test]** Test `signIn` action with valid/invalid credentials <!-- id: 14.2.2 -->
- [x] **[Test]** Test `createFamilyMember` with ownership verification <!-- id: 14.2.3 -->
- [x] **[Test]** Test `enrollStudent` with capacity check logic <!-- id: 14.2.4 -->
- [x] **[Test]** Test `enrollStudent` with block check logic <!-- id: 14.2.5 -->
- [x] **[Test]** Test `createClass` with schedule validation <!-- id: 14.2.6 -->
- [x] **[Test]** Test `updateUserRole` with role constraints <!-- id: 14.2.7 -->
- [x] **[Test]** Test `processRefund` with Stripe mock <!-- id: 14.2.8 -->

---

### 14.3 Integration Tests

- [x] **[Test]** Integration test: Enrollment Flow (User -> Family -> Enroll) <!-- id: 14.3.1 -->
- [x] **[Test]** Integration test: Waitlist Flow (Full -> Waitlist -> Promotion) <!-- id: 14.3.2 -->
- [x] **[Test]** Integration test: Admin Flow (Force Enroll -> Cancel) <!-- id: 14.3.3 -->
- [x] **[Test]** Integration test: Multi-role logic (Covered in Admin Flow) <!-- id: 14.3.4 -->

---

### 14.4 E2E Tests (Playwright)

- [x] 14.4.1 E2E: Auth: Parent registration and login flow <!-- id: 14.4.1 -->
- [x] **[Test]** E2E: Parent adds family member <!-- id: 14.4.2 --> <!-- agent cannot seem to get this to work -->
- [x] **[Test]** E2E: Parent browses and enrolls child in class <!-- id: 14.4.3 --><!-- agent cannot seem to get this to work -->
- [x] 14.4.4 E2E: Teacher creates and publishes a class <!-- id: 14.4.4 -->
- [x] **[Test]** E2E: Admin changes user role <!-- id: 14.4.5 --><!-- agent cannot seem to get this to work -->
- [x] 14.4.6 E2E: Admin exports CSV data <!-- id: 14.4.6 -->
- [x] **[Test]** E2E: Class Scheduler creates schedule and detects conflict <!-- id: 14.4.7 --><!-- agent cannot seem to get this to work -->

---

## Phase 15: Deployment & CI/CD

### 15.1 Vercel Configuration

- [x] **[Deploy]** Create Vercel project and link to GitHub repository <!-- id: 15.1.1 -->
- [x] **[Deploy]** Configure environment variables in Vercel dashboard (Production) <!-- id: 15.1.2 -->
- [x] **[Deploy]** Configure environment variables in Vercel dashboard (Preview) <!-- id: 15.1.3 -->
- [x] **[Deploy]** Configure build settings (Next.js framework preset) <!-- id: 15.1.4 -->

---

### 15.2 Database Setup

- [~] **[Deploy]** Run all migrations on Supabase Production database <!-- id: 15.2.1 --> <!-- Skipped: Manual step, requires production CLI access -->
- [x] **[Deploy]** Verify RLS policies are active on all tables <!-- id: 15.2.2 -->
- [x] **[Deploy]** Create initial Super Admin user via SQL <!-- id: 15.2.3 -->

---

### 15.3 Stripe Production

- [~] **[Deploy]** Create Stripe production webhook endpoint <!-- id: 15.3.1 --> <!-- Skipped: Manual dashboard step -->
- [~] **[Deploy]** Configure webhook to listen for required events <!-- id: 15.3.2 --> <!-- Skipped: Manual dashboard step -->
- [~] **[Deploy]** Update `STRIPE_WEBHOOK_SECRET` env var with production secret <!-- id: 15.3.3 --> <!-- Skipped: Manual dashboard step -->

---

### 15.4 CI/CD Pipeline

- [x] **[Deploy]** Ensure automatic Preview deploys on PR creation <!-- id: 15.4.1 -->
- [x] **[Deploy]** Ensure automatic Staging deploy on main branch push <!-- id: 15.4.2 -->
- [x] **[Deploy]** Document manual Production promotion process <!-- id: 15.4.3 -->
- [x] **[Deploy]** Add pre-deploy test verification to pipeline <!-- id: 15.4.4 -->

---

### 15.5 Production Verification

- [~] **[Deploy]** Verify user registration flow in Production <!-- id: 15.5.1 --> <!-- Skipped: Manual verification required -->
- [~] **[Deploy]** Verify Stripe test payment in Production using the Stripe sandbox <!-- id: 15.5.2 --> <!-- Skipped: Manual verification required -->
- [~] **[Deploy]** Verify webhook delivery in Stripe dashboard <!-- id: 15.5.3 --> <!-- Skipped: Manual verification required -->
- [~] **[Deploy]** Verify email delivery via Resend logs <!-- id: 15.5.4 --> <!-- Skipped: Manual verification required -->

---

## Summary

| Phase                       | Tasks |
| --------------------------- | ----- |
| Phase 1: Foundation         | 33    |
| Phase 2: Database Schema    | 31    |
| Phase 3: Auth               | 16    |
| Phase 4: Dashboard Layout   | 14    |
| Phase 5: Parent Portal      | 37    |
| Phase 6: Teacher Portal     | 29    |
| Phase 7: Student Portal     | 13    |
| Phase 8: Admin Portal       | 38    |
| Phase 9: Class Scheduler    | 22    |
| Phase 10: Super Admin       | 6     |
| Phase 11: Stripe Payment    | 22    |
| Phase 12: Zoho Integration  | 9     |
| Phase 13: Email Integration | 10    |
| Phase 14: Testing           | 22    |
| Phase 15: Deployment        | 15    |
| Phase 16: Refactoring       | 7     |

**Total Tasks: ~324**

---

## Phase 16: Refactoring to Block System (Completed)

- [x] **[Refactor]** Update DB Schema (Add Day/Block, Remove Time) <!-- id: 16.1.1 -->
- [x] **[Refactor]** Update TypeScript Interfaces (Class, CalendarEvent) <!-- id: 16.1.2 -->
- [x] **[Refactor]** Update Zod Schemas (validations.ts) <!-- id: 16.1.3 -->
- [x] **[Refactor]** Update Server Actions (classes.ts, student.ts) <!-- id: 16.1.4 -->
- [x] **[Refactor]** Update UI: ClassForm (Teacher Portal) <!-- id: 16.1.5 -->
- [x] **[Refactor]** Update UI: MasterCalendarGrid (Scheduler) <!-- id: 16.1.6 -->
- [x] **[Refactor]** Update UI: Student Schedule View & ClassGrid <!-- id: 16.1.7 -->
