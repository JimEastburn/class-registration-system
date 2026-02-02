# Class Registration System - Master Task List

This document tracks the development progress of the Class Registration System. It consolidates tasks from the initial setup, functional requirements, and architectural decisions.

## Phase 1: Foundation & Infrastructure

### Environment & Project Setup

- [ ] Determine if Next.js 16 project with TypeScript and App Router has been initialized, and if not, initialize it
- [ ] Determine if Tailwind CSS v4 has been configured, and if not, configure it
- [ ] Determine if shadcn/ui components have been installed and configured, and if not, install and configure them
- [ ] Determine if ESLint and Prettier configuration has been set up, and if not, set up ESLint and Prettier configuration
- [ ] Determine if `vercel.json` for Vercel deployment has been configured, and if not, configure it
- [ ] Determine if `docs/DEPLOYMENT.md` guide has been created, and if not, create it
- [ ] Determine if environment variables locally (`.env.local`) have been set up, and if not, set them up

### Database & Authentication (Supabase)

- [ ] Initialize Supabase project
- [ ] Create Database Schema (Profiles, Families, Classes, Enrollments, Payments)
- [ ] **[Security]** Enable Row Level Security (RLS) policies for all tables
- [ ] **[Security]** Create PostgreSQL trigger for "Belt and Suspenders" Profile creation (handle new user signup)
- [ ] Configure Supabase Auth (Email/Password, Login links)
- [ ] Implement Auth Middleware for protected routes
- [ ] Determine if `signIn` server action with profile verification check has been created, and if not, create it

### Database & Authentication (Multi-Role Support)

- [ ] Create `profiles` table to support multiple roles (e.g., `roles: text[]` or `user_roles` table)
- [ ] Implement "Role Promotion" logic (Add Role vs Set Role)
- [ ] **[Feature]** Profile View Switching
  - [ ] Implement strict "View Toggle" logic (e.g., Teacher <-> Parent)
  - [ ] Implement "God Mode" Switcher for Super Admin (Access ALL views)
- [ ] **[Validation]** Enforce Role Combinations & Constraints:
  - [ ] `Parent` + `Teacher`/`Admin`/`Scheduler` (Allowed - Default View: Role, Toggle: Parent)
  - [ ] `Class Scheduler` + `Teacher` (Forbidden)
  - [ ] `Class Scheduler` + `Student` (Forbidden)
  - [ ] `Admin` + `Class Scheduler` View (Forbidden for Regular Admin)
  - [ ] `Super Admin` (Universal Access, Bypasses all constraints)

## Phase 2: Core Feature Implementation

### Shared Components & Layouts

- [ ] Determine if responsive Dashboard Layout (Sidebar, Topbar, Footer) has been created, and if not, create it
- [ ] **[UI]** Determine if "Role Badge" component (Pills) has been implemented, and if not, implement it
  - [ ] Support displaying multiple pills for multi-role users (e.g. "Parent" AND "Teacher")
  - [ ] Color-code roles for visual distinction
- [ ] Determine if "Portal Switcher" for multi-role users (e.g., Teachers accessing Parent view) has been implemented, and if not, implement it
- [ ] Determine if Authentication Pages (Login, Register, Forgot Password) have been built, and if not, build them
- [ ] Determine if `src/lib/utils.ts` and core validation schemas (`validations.ts`) have been implemented, and if not, implement them. The core validation schemas (`validations.ts`) may just need to be updated to follow the new profile schema and the multi-role support.

### Parent Portal Features

- [ ] **Dashboard**: View family enrollment summary
- [ ] **Family Management**: Add/Edit/Delete children profiles
- [ ] **Student Linking**: Link child accounts via email
- [ ] **Class Browsing**: View available classes with filtering
- [ ] **Enrollment Flow**: Select class -> Check Capacity -> Pending Enrollment
- [ ] **Payment**: Stripe Checkout implementation

### Teacher Portal Features

- [ ] **Dashboard**: View assigned classes and student counts
- [ ] **Class Management**: Create/Edit details, Publish/Cancel classes
- [ ] **Roster View**: View enrolled students per class

### Student Portal Features

- [ ] **Dashboard**: View personal class schedule
- [ ] **Class Details**: View location, teacher, syllabus

### Class Scheduler Portal

- [ ] **Access Control**: Verify Class Scheduler role permissions
- [ ] **Global Management**: View and Create classes for _any_ teacher
- [ ] **Master Schedule**: View system-wide class calendar
- [ ] **[UI]** Build Calendar Grid Layout (Rows by Pattern)
- [ ] **[UI]** Build Staging Area for unassigned classes
- [ ] **[Logic]** Implement `dnd-kit` drag and drop context
- [ ] **[Logic]** Implement Conflict Detection (Teacher availability Check)
- [ ] **[Feature]** Click-to-create class in empty slot

### Admin Portal Features

- [ ] **User Management**:
  - [ ] View all users with all active roles indicated
  - [ ] **Promote User**: Add additional role (e.g., make a Parent also a Teacher)
  - [ ] **Demote User**: Remove specific role (e.g., remove Teacher access, keep Parent)
- [ ] **[Safety]** Implement strict role demotion logic (revoke privileges immediately)
- [ ] **Class Management**: Override/Edit any class
- [ ] **Enrollment Management**: Force add/remove students
- [ ] **Payment Management**: View transaction history and statuses
- [ ] **Data Export**: Export tables to CSV **[Safety: Escape sensitive chars]**

### Super Admin Portal Features

- [ ] **God Mode Access**:
  - [ ] Implement "Universal Bypass" for all RLS policies (Super Admin reads/writes ALL)
  - [ ] **[UI]** "Global View Switcher": Dropdown to access Admin, Scheduler, Teacher, or Parent views
- [ ] **Audit Logging**:
  - [ ] **[Security]** Log all "God Mode" view switches and actions (Action: `super_admin_switch`, Target: `view_name`)
  - [ ] **[Security]** Log all "Admin" view switches and actions (Action: `admin_switch`, Target: `view_name`)
  - [ ] **[Security]** Log all "Scheduler" view switches and actions (Action: `scheduler_switch`, Target: `view_name`)
  - [ ] **[Security]** Log all "Teacher" view switches and actions (Action: `teacher_switch`, Target: `view_name`)
  - [ ] **[Security]** Log all "Parent" view switches and actions (Action: `parent_switch`, Target: `view_name`)
  - [ ] View Audit Log Dashboard (Super Admin only)

## Phase 3: Integrations & Advanced Logic

### Payments (Stripe)

- [ ] detailed Stripe Setup (Products, Prices in Stripe Dashboard)
- [ ] Implement Checkout Session creation
- [ ] Create Webhook Handler (`api/webhooks/stripe`)
- [ ] **[Safety]** Implement Webhook Idempotency checked against DB
- [ ] Handle payment success/failure states

### Accounting Sync (Zoho Books)

- [ ] Implement Zoho Authentication/Token refresh
- [ ] Create "Sync to Zoho" background job (triggered by Stripe Webhook)
- [ ] Map Data: Profile -> Contact, Enrollment -> Invoice, Payment -> Customer Payment
- [ ] **[Reliability]** Implement retry logic for failed syncs
- [ ] Add `sync_status` tracking column to database

### Emails (Resend)

- [ ] Configure Resend API
- [ ] Implement Enrollment Confirmation Email
- [ ] Implement Payment Receipt Email

## Phase 4: Verification & Quality Assurance

### Testing Strategy

- [ ] **Unit Tests**: Test utility functions and validation logic
- [ ] **Integration Tests**:
  - [ ] Test Server Actions and Database Triggers
  - [ ] **[Multi-Role]** Verify role promotion/demotion logic (adding/removing roles)
  - [ ] **[Multi-Role]** Verify conflicting role constraints (e.g. Teacher cannot be Class Scheduler)
- [ ] **E2E Tests (Playwright)**:
  - [ ] Parent Enrollment Flow
  - [ ] Teacher Class Creation
  - [ ] Admin User Management
- [ ] **Manual Verification**: Validate "Student Linking" and multi-role switching

### Optimization & Launch

- [ ] Audit Accessibility (WCAG 2.2)
- [ ] Verify Mobile Responsiveness on all portals
- [ ] Perform detailed capacity hand-off test (Waitlist logic)
- [ ] Deploy to Vercel Production
- [ ] Deploy to Vercel Staging environment
- [ ] Deploy to Vercel Preview environment
- [ ] Create a ci/cd pipeline to Vercel Staging and Production environments. There should be a button to click to deploy from Staging to Production. Deployment to staging should be automatic when a PR is merged to master branch.
