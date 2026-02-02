# Class Registration System - Master Task List

This document tracks the detailed development tasks for the Class Registration System. It is designed to be consumed by autonomous agents, with atomic, testable tasks.

## Phase 1: Foundation & Infrastructure

### 1.1 Project & Environment Setup

- [ ] **[Setup]** Initialize Next.js 16 (App Router) project with TypeScript `create-next-app` <!-- id: 1.1.1 -->
- [ ] **[Setup]** Configure Tailwind CSS v4 (ensure `postcss` and `autoprefixer` removed if using v4 native) <!-- id: 1.1.2 -->
- [ ] **[Setup]** Initialize `shadcn/ui` and install core components `button`, `input`, `label`, `card`, `toast`, `dialog`, `select`, `dropdown-menu`, `avatar`, `badge`, `table` <!-- id: 1.1.3 -->
- [ ] **[Setup]** Configure ESLint and Prettier with `prettier-plugin-tailwindcss` <!-- id: 1.1.4 -->
- [ ] **[Setup]** Create `vercel.json` configuration for deployment settings <!-- id: 1.1.5 -->
- [ ] **[Setup]** Create `.env.local` template (populate from `.env.example`) <!-- id: 1.1.6 -->
- [ ] **[Setup]** Configure `vitest` and `playwright` testing environments <!-- id: 1.1.7 -->

### 1.2 core Libraries & Utilities

- [ ] **[Lib]** Create `src/lib/utils.ts` with `cn` helper (clsx + tailwind-merge) <!-- id: 1.2.1 -->
- [ ] **[Lib]** Create `src/lib/supabase/client.ts` (Client Component client) <!-- id: 1.2.2 -->
- [ ] **[Lib]** Create `src/lib/supabase/server.ts` (Server Component client using `createServerClient`) <!-- id: 1.2.3 -->
- [ ] **[Lib]** Create `src/lib/supabase/middleware.ts` (Middleware client for auth guarding) <!-- id: 1.2.4 -->
- [ ] **[Lib]** Create `src/lib/validations.ts` with Zod schemas for `profile`, `family`, `class`, `enrollment` <!-- id: 1.2.5 -->
- [ ] **[Type]** Create `src/types/index.ts` with shared TypeScript interfaces matching DB schema <!-- id: 1.2.6 -->

### 1.3 Database Schema (Supabase)

- [ ] **[DB]** Create `profiles` table (id, email, role, first_name, last_name, phone) <!-- id: 1.3.1 -->
- [ ] **[DB]** Create `family_members` table (id, parent_id, student_user_id, first_name, last_name, grade, dob) <!-- id: 1.3.2 -->
- [ ] **[DB]** Create `classes` table (id, teacher_id, title, description, capacity, price, location, schedule_config) <!-- id: 1.3.3 -->
- [ ] **[DB]** Create `enrollments` table (id, student_id, class_id, status, created_at) <!-- id: 1.3.4 -->
- [ ] **[DB]** Create `payments` table (id, enrollment_id, stripe_payment_intent, amount, status, created_at) <!-- id: 1.3.5 -->
- [ ] **[DB]** Create `class_blocks` table (teacher_id, student_id, reason) <!-- id: 1.3.6 -->
- [ ] **[DB]** Enable RLS on all tables and create "Deny All" default policies <!-- id: 1.3.7 -->

### 1.4 Database Security & Triggers

- [ ] **[RLS]** Create RLS policies for `profiles` (Users view own, Admins view all, Teachers view enrolled students) <!-- id: 1.4.1 -->
- [ ] **[RLS]** Create RLS policies for `classes` (Public read active, Teachers edit own, Admin/Scheduler edit all) <!-- id: 1.4.2 -->
- [ ] **[RLS]** Create RLS policies for `enrollments` (Parents view own family's, Teachers view their classes', Admin view all) <!-- id: 1.4.3 -->
- [ ] **[Trigger]** Create `handle_new_user` Postgres trigger to auto-create profile on Auth signup <!-- id: 1.4.4 -->
- [ ] **[Trigger]** Create `on_enrollment_created` trigger (if needed for counters) or rely on count queries <!-- id: 1.4.5 -->

### 1.5 Authentication & Middleware

- [ ] **[Auth]** Create `src/middleware.ts` to handle session refresh and protected route redirection <!-- id: 1.5.1 -->
- [ ] **[Auth]** Implement `src/app/(auth)/login/page.tsx` with Zod form validation <!-- id: 1.5.2 -->
- [ ] **[Auth]** Implement `src/app/(auth)/register/page.tsx` with Zod form validation <!-- id: 1.5.3 -->
- [ ] **[Auth]** Implement `src/app/(auth)/forgot-password/page.tsx` <!-- id: 1.5.4 -->
- [ ] **[Action]** Create `src/lib/actions/auth.ts`: `signIn`, `signUp`, `signOut` <!-- id: 1.5.5 -->
- [ ] **[Action]** Update `signIn` to verify/create profile existence ("Belt & Suspenders") <!-- id: 1.5.6 -->

## Phase 2: Core Feature Implementation

### 2.1 Multi-Role & Layout Architecture

- [ ] **[Feature]** Implement `switchProfileView` Server Action (sets cookie) <!-- id: 2.1.1 -->
- [ ] **[Component]** Create `RoleBadge` component (displays current role context) <!-- id: 2.1.2 -->
- [ ] **[Component]** Create `PortalSwitcher` component (dropdown to toggle Parent/Teacher/Admin views) <!-- id: 2.1.3 -->
- [ ] **[Layout]** Create `src/app/(dashboard)/layout.tsx` (Shared App Shell: Sidebar, Topbar) <!-- id: 2.1.4 -->
- [ ] **[Layout]** Create `src/components/dashboard/Sidebar.tsx` with role-based navigation links <!-- id: 2.1.5 -->

### 2.2 Parent Portal Features

- [ ] **[Page]** `src/app/(dashboard)/parent/page.tsx` (Dashboard: Family Summary) <!-- id: 2.2.1 -->
- [ ] **[Page]** `src/app/(dashboard)/parent/family/page.tsx` (List Family Members) <!-- id: 2.2.2 -->
- [ ] **[Action]** `src/lib/actions/family.ts`: `addFamilyMember`, `updateFamilyMember`, `deleteFamilyMember` <!-- id: 2.2.3 -->
- [ ] **[Feature]** Implement Student Linking via Email (UI + Action) <!-- id: 2.2.4 -->
- [ ] **[Page]** `src/app/(dashboard)/parent/browse/page.tsx` (Class Catalog) <!-- id: 2.2.5 -->
- [ ] **[Component]** `ClassCard` component with "Enroll" button <!-- id: 2.2.6 -->
- [ ] **[Action]** `src/lib/actions/enrollment.ts`: `enrollStudent` (Capacity Check -> Pending Status) <!-- id: 2.2.7 -->

### 2.3 Teacher Portal Features

- [ ] **[Page]** `src/app/(dashboard)/teacher/page.tsx` (Dashboard: My Classes) <!-- id: 2.3.1 -->
- [ ] **[Page]** `src/app/(dashboard)/teacher/classes/new/page.tsx` (Create Class Form) <!-- id: 2.3.2 -->
- [ ] **[Action]** `src/lib/actions/classes.ts`: `createClass`, `updateClass`, `publishClass`, `cancelClass` <!-- id: 2.3.3 -->
- [ ] **[Page]** `src/app/(dashboard)/teacher/classes/[id]/page.tsx` (Class Detail & Roster) <!-- id: 2.3.4 -->
- [ ] **[Component]** `StudentRosterTable` component <!-- id: 2.3.5 -->
- [ ] **[Feature]** Implement Class Materials Upload (UI only, file storage later) <!-- id: 2.3.6 -->

### 2.4 Student Portal Features

- [ ] **[Page]** `src/app/(dashboard)/student/page.tsx` (Dashboard: My Schedule) <!-- id: 2.4.1 -->
- [ ] **[Page]** `src/app/(dashboard)/student/classes/[id]/page.tsx` (Class Detail View) <!-- id: 2.4.2 -->
- [ ] **[Component]** `WeeklyScheduleView` component <!-- id: 2.4.3 -->

### 2.5 Admin Portal Features

- [ ] **[Page]** `src/app/(dashboard)/admin/users/page.tsx` (User Management Table) <!-- id: 2.5.1 -->
- [ ] **[Action]** `src/lib/actions/admin.ts`: `updateUserRole` (Promote/Demote logic) <!-- id: 2.5.2 -->
- [ ] **[Page]** `src/app/(dashboard)/admin/classes/page.tsx` (All Classes Management) <!-- id: 2.5.3 -->
- [ ] **[Page]** `src/app/(dashboard)/admin/payments/page.tsx` (Transaction History) <!-- id: 2.5.4 -->
- [ ] **[Endpoint]** `src/app/api/export/route.ts` (CSV Export with formula injection protection) <!-- id: 2.5.5 -->

### 2.6 Class Scheduler Portal Features

- [ ] **[Page]** `src/app/(dashboard)/class-scheduler/page.tsx` (Master Schedule Dashboard) <!-- id: 2.6.1 -->
- [ ] **[Component]** `MasterCalendarGrid` (Drag & Drop Interface placeholder) <!-- id: 2.6.2 -->
- [ ] **[Logic]** Implement Conflict Detection algorithm in `src/lib/scheduler.ts` <!-- id: 2.6.3 -->

### 2.7 Super Admin Features

- [ ] **[Feature]** Implement "God Mode" view switcher (Bypass constraints) <!-- id: 2.7.1 -->
- [ ] **[Policy]** Update RLS policies to allow Super Admin universal access <!-- id: 2.7.2 -->
- [ ] **[Log]** Create `audit_logs` table and logging helper <!-- id: 2.7.3 -->

## Phase 3: Integrations & Payments

### 3.1 Stripe Integration

- [ ] **[Setup]** Configure Stripe SDK client in `src/lib/stripe.ts` <!-- id: 3.1.1 -->
- [ ] **[Endpoint]** `src/app/api/checkout/route.ts` (Create Checkout Session) <!-- id: 3.1.2 -->
- [ ] **[Page]** `src/app/checkout/success/page.tsx` <!-- id: 3.1.3 -->
- [ ] **[Page]** `src/app/checkout/cancel/page.tsx` <!-- id: 3.1.4 -->
- [ ] **[Webhook]** `src/app/api/webhooks/stripe/route.ts` (Handle `checkout.session.completed`) <!-- id: 3.1.5 -->
- [ ] **[Logic]** Implement Idempotency check in Webhook (prevent double-fulfillment) <!-- id: 3.1.6 -->

### 3.2 Zoho Books Integration

- [ ] **[Lib]** Create `src/lib/zoho.ts` (Auth & Token Refresh logic) <!-- id: 3.2.1 -->
- [ ] **[Logic]** Implement `syncProfileToContact` function <!-- id: 3.2.2 -->
- [ ] **[Logic]** Implement `syncEnrollmentToInvoice` function <!-- id: 3.2.3 -->
- [ ] **[Logic]** Implement `syncPaymentToCustomerPayment` function <!-- id: 3.2.4 -->
- [ ] **[Webhook]** Update Stripe Webhook to trigger Zoho Sync asynchronously <!-- id: 3.2.5 -->

### 3.3 Email Integration

- [ ] **[Setup]** Configure Resend SDK in `src/lib/resend.ts` <!-- id: 3.3.1 -->
- [ ] **[Template]** Create Email Template for `EnrollmentConfirmation` <!-- id: 3.3.2 -->
- [ ] **[Template]** Create Email Template for `PaymentReceipt` <!-- id: 3.3.3 -->
- [ ] **[Webhook]** Update Stripe Webhook to send emails on success <!-- id: 3.3.4 -->

## Phase 4: Verification & QA

### 4.1 Automated Testing

- [ ] **[Test]** Unit verify `validations.ts` schemas (Vitest) <!-- id: 4.1.1 -->
- [ ] **[Test]** Unit verify `scheduler.ts` conflict logic (Vitest) <!-- id: 4.1.2 -->
- [ ] **[Test]** Integration verify `createClass` and RLS permissions (Vitest + Supabase Fakes) <!-- id: 4.1.3 -->
- [ ] **[Test]** E2E Parent Enrollment Flow (Playwright) <!-- id: 4.1.4 -->
- [ ] **[Test]** E2E Teacher Class Management (Playwright) <!-- id: 4.1.5 -->

### 4.2 Manual Verification

- [ ] **[Manual]** Verify Student Linking (Email invite flow) <!-- id: 4.2.1 -->
- [ ] **[Manual]** Verify Multi-Role Switching (Teacher perspective) <!-- id: 4.2.2 -->
- [ ] **[Manual]** Verify Admin CSV Export (Security check) <!-- id: 4.2.3 -->

## Phase 5: Deployment

### 5.1 Vercel Configuration

- [ ] **[Deploy]** Configure Vercel Project Settings (Env Vars) <!-- id: 5.1.1 -->
- [ ] **[Deploy]** Deploy to Staging <!-- id: 5.1.2 -->
- [ ] **[Deploy]** Promote Staging to Production <!-- id: 5.1.3 -->
