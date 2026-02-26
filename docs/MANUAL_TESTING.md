# Manual Testing Guide: Class Registration System

This document provides a comprehensive end-to-end manual testing checklist for the Class Registration System. Each item notes whether it is covered by **automated tests** (✅), **partially covered** (⚠️), or **manual-only** (🔲).

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Universal Functionality](#2-universal-functionality)
3. [Parent Portal Testing](#3-parent-portal-testing)
4. [Teacher Portal Testing](#4-teacher-portal-testing)
5. [Student Portal Testing](#5-student-portal-testing)
6. [Admin Portal Testing](#6-admin-portal-testing)
7. [Class Scheduler Portal Testing](#7-class-scheduler-portal-testing)
8. [Super Admin Portal Testing](#8-super-admin-portal-testing)
9. [Cross-Role Integration Flows](#9-cross-role-integration-flows)
10. [Edge Cases & Error Handling](#10-edge-cases--error-handling)
11. [Automated Test Inventory](#11-automated-test-inventory)

---

## 1. Prerequisites

Before testing, ensure you have:

- Access to the local development environment (`npm run dev`) or a staging environment.
- Access to the Supabase project (to verify data manually if needed).
- A valid Stripe test card (e.g., `4242 4242 4242 4242`).
- Multiple email addresses (or use `+` aliases, e.g., `user+parent@example.com`) to test different roles.

---

## 2. Universal Functionality

_Applies to all users._

### Registration & Login

- ✅ **Account Creation**: Register a new account for each role (Parent, Teacher, Student).
  - _Unit: `auth.test.ts` — signUp success/error; Component: `RegisterForm.test.tsx` — role selection validation, code of conduct; E2E: `auth.spec.ts` — full registration flow, `parent-family.spec.ts` — register + login flow_
- 🔲 **Email Verification**: Confirm that a verification email is sent (if enabled) and it works.
  - _Not automated — requires real email delivery._
- ✅ **Authentication**: Log in with correct credentials; verify it fails with incorrect credentials.
  - _Unit: `auth.test.ts` — signIn success/error; Component: `LoginForm.test.tsx` — redirect error handling, no password placeholder; E2E: `auth.spec.ts` — login form validation, navigation to login_
- 🔲 **Logout**: Log out and ensure you are redirected to the landing page and cannot access protected routes.
  - _Partially covered: `SupabaseFake` tests `signOut()`. E2E `parent-enrollment.spec.ts` tests logout via `NavigationComponent.signOut()`._
- 🔲 **Persistence**: Refresh the page while logged in; verify session persists.
  - _Not automated._

### Profile Management

- ✅ **Edit Profile**: Update first name, last name, and phone number.
  - _Unit: `profile.test.ts` — update success, auth check, error handling._
- 🔲 **Avatar**: (If implemented) Upload/remove profile picture.
  - _Not automated._
- ✅ **Password Reset**: Verify the "Forgot Password" flow from the login page.
  - _Unit: `email.test.ts` — `sendPasswordReset` template generation._

### Input Validation

- ✅ **Zod Schema Validation**: All form schemas are comprehensively validated.
  - _Unit: `validations.test.ts` — login, register, password reset, profile, family member, schedule config, class, enrollment, calendar event, settings schemas._

---

## 3. Parent Portal Testing

_Goal: Manage family and enroll children._

### Family Management

- ✅ **Add Member**: Create a family member with required Email, Relationship, and Grade (for Students).
  - _Unit: `family.test.ts` — create success, ownership enforcement, auth check; Component: `AddFamilyMemberDialog.test.tsx` — dialog open, email field visible, form submission; E2E: `parent-family.spec.ts`, `family-management.spec.ts` — full add-member flow with grade selection_
- ✅ **Edit Member**: Change a member's details. Verify validation logic persists.
  - _Unit: `family.test.ts` — update success, ownership check._
- ✅ **Delete Member**: Remove a child and verify they no longer appear.
  - _Unit: `family.test.ts` — delete success, ownership check._

### Student Linking (Email-Based)

- ✅ **Auto-Link**: If the student account exists with that email, verify it links automatically.
  - _Unit: `student-link.test.ts` — `resolveStudentFamilyMember`: existing link, email fallback, self-healing of missing `student_user_id`._
- 🔲 **Pending Status**: Verify the status shows "Pending" if the student account doesn't exist yet.
  - _Not automated._
- 🔲 **Double Link Prevention**: Attempt to link the same student email to another parent.
  - _Not automated._

### Class Browsing

- 🔲 **Search/Filter**: View the "Browse Classes" page. Ensure only "Active" classes are visible.
  - _Not automated._
- 🔲 **Detail View**: Click "View Details" on a class; verify all information is accurate.
  - _Not automated for UI, but E2E `parent-enrollment.spec.ts` navigates to browse, clicks class, and verifies heading._

### Enrollment & Payments

- ✅ **Start Enrollment**: Select a child for a class and proceed to checkout.
  - _Unit: `enrollments.test.ts` — enrollStudent with existing enrollment, capacity, waitlist, free class checks; Component: `EnrollButton.test.tsx` — opens dialog, selects family member, proceeds to payment; Integration: `enrollment-flow.test.ts` — full create-student-then-enroll flow_
- ✅ **Stripe Checkout**: Complete a payment using a Stripe test card.
  - _API: `checkout.test.ts` — auth check, enrollmentId validation, ownership check, session creation + payment record; Webhook: `stripe.test.ts` — `checkout.session.completed` updates payment/enrollment status, sends receipt_
- 🔲 **Success Redirect**: Verify redirection to the success page after payment.
  - _Not automated (requires real Stripe redirect)._
- ✅ **Status Check**: Verify enrollment status is "Confirmed" after payment.
  - _Webhook: `stripe.test.ts` — enrollment updated to 'confirmed' on `checkout.session.completed`._
- ✅ **Payment History**: Check the transaction record.
  - _Unit: `dashboard.test.ts` — `getRecentPayments` retrieval and currency formatting._
- ✅ **Waitlist Flow**: Enroll when class is full, verify waitlisted status.
  - _Component: `EnrollButton.test.tsx` — waitlist toast; Integration: `waitlist-flow.test.ts` — full waitlist scenario._
- ✅ **Pay Later Flow**: Enroll without immediate payment.
  - _Component: `EnrollButton.test.tsx` — pay-later button, no Stripe checkout triggered, disabled when no member selected._
- ✅ **Invoice Generation**: View/download invoice for a payment.
  - _API: `invoice.test.ts` — auth, payment ID validation, authorization, HTML invoice generation._

---

## 4. Teacher Portal Testing

_Goal: Manage own classes and track students._

### Class Management

- ✅ **Create Class**: Create a new class with status set to "Draft".
  - _Unit: `classes.test.ts` — createClass with draft status, role checks, schedule config mapping; Component: `ClassForm.test.tsx` — renders create form, required fields, "Create Class" button; E2E: `teacher-classes.spec.ts` — full create flow_
- ✅ **Publish Class**: Change class status from "Draft" to "Published".
  - _Unit: `classes.test.ts` — publishClass action; E2E: `teacher-classes.spec.ts` — create + publish class, `parent-enrollment.spec.ts` — teacher publishes class_
- ✅ **Edit Class**: Update class details and save changes.
  - _Unit: `classes.test.ts` — updateClass with role check; Component: `ClassForm.test.tsx` — renders edit mode with "Save Changes" button, pre-fills existing values._
- 🔲 **Cancel/Delete Class**: Cancel or delete a class.
  - _Not automated._
- ✅ **Validation Errors**: Submit empty form, verify error messages.
  - _E2E: `teacher-classes.spec.ts` — submits empty form, verifies error summary with "Name must be at least 3 characters"._

### Class Materials

- 🔲 **Upload/Download/Delete Material**: Full materials workflow.
  - _Not automated (mock exists for `upsertSyllabusLink` in SchedulerClassForm tests)._

### Student Roster

- 🔲 **View Roster**: Click on a class to view enrolled students.
  - _Not automated._

### Student Blocking

- ✅ **Block Student**: Block a student from a teacher's classes and cancel their enrollments.
  - _Unit: `blocking.test.ts` — blockStudent: auth check, already-blocked check, successful block, block + enrollment cancellation._
- ✅ **Unblock Student**: Remove a block.
  - _Unit: `blocking.test.ts` — unblockStudent: auth check, access denied for non-owner, successful unblock._
- ✅ **View Blocked Students**: List all blocked students for a teacher.
  - _Unit: `blocking.test.ts` — getBlockedStudents: auth check, successful retrieval._

### Portal Switching (Multi-Role)

- ✅ **Role-Based View Access**: Strict role separation verified.
  - _Unit: `strict-role.test.ts` — `getAllowedViews` for teacher, admin, parent, super_admin with parent-context awareness._
- 🔲 **Switch to Parent View**: As a Teacher/Admin, switch to Parent View.
  - _Logic automated; UI switching not tested._
- 🔲 **Persistence**: Refresh the page while in "Parent View".
  - _Not automated._

---

## 5. Student Portal Testing

_Goal: View own schedule and materials._

### Dashboard & Schedule

- ✅ **Next Class Card**: Calendar event data mapping and sorting for upcoming classes.
  - _Unit: `NextClassCard.test.ts` — `resolveBlockName` (event/class/schedule_config/TBA fallback), `toUpcomingClass` (full mapping, location fallback), `sortUpcomingClasses` (date + block sorting, immutability)._
- 🔲 **Linked Dashboard**: After linking, verify the full dashboard with schedule/classes cards is shown.
  - _Not automated._
- 🔲 **Weekly Schedule**: Verify that confirmed enrollments appear in the calendar/list view.
  - _Not automated._
- 🔲 **Class Materials**: Access class details to view materials provided by the teacher.
  - _Not automated._

---

## 6. Admin Portal Testing

_Goal: System-wide oversight and management._

### User Management

- ✅ **Role Modification**: Change a user's role.
  - _Unit: `admin.test.ts` — `updateUserRole` with admin privilege check._
- ✅ **Account Deletion**: Delete a user account.
  - _Unit: `admin.test.ts` — `deleteUser` with admin privilege check._

### System-Wide Classes/Enrollments

- ✅ **Admin Class Form**: Create/edit classes with teacher assignment, day/block options.
  - _Component: `AdminClassForm.test.tsx` — correct day options (Tue/Thur/Wed only, no Mon/Fri), correct block options (1-4 only, no 5-6)._
- ✅ **Force Enrollment**: Admin can force-enroll a student bypassing capacity.
  - _Integration: `admin-flow.test.ts` — `adminForceEnroll` succeeds despite 0 capacity._
- ✅ **Cancel Enrollment**: Admin can cancel confirmed enrollments.
  - _Integration: `admin-flow.test.ts` — `cancelEnrollment` by admin succeeds; non-admin blocked with "Access denied"._

### Payments & Dashboard

- ✅ **Transaction Log**: View all system-wide payments with filters.
  - _Unit: `payments.test.ts` — `getAllPayments` with auth check, admin check, filter application (status, date range)._
- ✅ **Update Payment Status**: Manually change payment status and auto-confirm enrollment.
  - _Unit: `payments.test.ts` — `updatePaymentStatus` success, enrollment auto-confirmed on 'completed'._
- ✅ **Revenue Stats / Dashboard**: Verify dashboard statistics.
  - _Unit: `admin.test.ts` — `getSystemStats` with data aggregation; `dashboard.test.ts` — parent/teacher dashboard stats._
- ✅ **Refund Processing**: Process refunds through Stripe, update enrollment, promote waitlisted students.
  - _Unit: `refunds.test.ts` (x2) — `processRefund` with admin auth, Stripe refund, enrollment cancellation, waitlist promotion, notification; Component: `RefundButton.test.tsx` — renders, opens dialog, calls processRefund with correct dollar-to-cents conversion; Webhook: `stripe.test.ts` — `charge.refunded` updates payment/enrollment + Zoho sync._

### Data Exports

- ✅ **CSV Export**: Export Classes, Users, and Enrollments to CSV.
  - _API: `export.test.ts` — admin auth check, users CSV, classes CSV with teacher names, enrollments CSV, CSV injection protection (formula escaping), invalid export type error; E2E: `admin-export.spec.ts` — admin login, click export, download CSV file._

### System Configuration

- 🔲 **Global Settings**: Update "Registration Open Date" and "Current Semester".
  - _Not automated._

---

## 7. Class Scheduler Portal Testing

_Goal: Manage the Master Schedule._

- ✅ **Access Control**: Verify ONLY Class Schedulers can access scheduler actions.
  - _Unit: `scheduler.test.ts` — `getSchedulerStats` and `getUnscheduledClasses` role checks._
- ✅ **Scheduler Stats**: View total classes, unscheduled classes, conflict counts.
  - _Unit: `scheduler.test.ts` — `getSchedulerStats` data retrieval._
- ✅ **Unscheduled Classes**: Fetch draft classes needing scheduling.
  - _Unit: `scheduler.test.ts` — `getUnscheduledClasses` retrieval._
- ✅ **Scheduler Class Form**: Day/block options match business constraints.
  - _Component: `SchedulerClassForm.test.tsx` — correct day options (Tue/Thur/Wed only), correct block options (1-4 only)._
- ✅ **Conflict Detection**: Schedule conflicts detected for rooms and students.
  - _Unit: `scheduling.test.ts` — `validateScheduleConfig`, `checkRoomConflict`, `detectBatchConflicts`, `checkScheduleConflict` (Tue/Thu overlap handling), `checkStudentScheduleConflict`._
- 🔲 **Master Calendar**: View the calendar grid with ALL classes.
  - _Not automated._

---

## 8. Super Admin Portal Testing

_Goal: God Mode capabilities._

- ✅ **View Access**: Super admin gets access to all views.
  - _Unit: `strict-role.test.ts` — `getAllowedViews('super_admin')` returns all views._
- 🔲 **Global View Switcher**: Use the special dropdown to switch between views.
  - _Not automated._
- 🔲 **Bypass RLS**: View restricted data.
  - _Not automated._
- 🔲 **Audit Logs**: Perform a "God Mode" action and verify it appears in the Audit Log.
  - _Not automated (but `logAuditAction` is mocked/called in multiple test suites)._

---

## 9. Cross-Role Integration Flows

_Test how roles interact._

1. ✅ **The Full Loop** (partially automated):
   - **Teacher creates + publishes class** → **Parent adds child + enrolls** → verified in E2E: `parent-enrollment.spec.ts`
   - **Payment flow** → verified in API: `checkout.test.ts` + webhook: `stripe.test.ts`
   - **Enrollment confirmation** → verified across integration tests and webhook tests
   - 🔲 **Student views schedule** → _Not automated._
   - ✅ **Admin views payment log** → _Unit: `payments.test.ts`_

---

## 10. Edge Cases & Error Handling

### Business Logic

- ✅ **Capacity Limit**: Attempt to enroll in a full class. Verify waitlist logic.
  - _Unit: `enrollments.test.ts` — waitlist when capacity exceeded; Integration: `waitlist-flow.test.ts`._
- ✅ **Duplicate Enrollment**: Attempt to enroll the same child in the same class twice.
  - _Unit: `enrollments.test.ts` — existing enrollment check._
- ✅ **Schedule Conflict**: Prevent enrollment when student has a conflicting class (same day + block).
  - _Unit: `scheduling.test.ts` — `checkStudentScheduleConflict` with Tue/Thu overlap detection._
- ✅ **Unauthorized Access**: Verify role-based access control.
  - _Covered across: `admin.test.ts` (admin-only checks), `scheduler.test.ts` (scheduler-only checks), `export.test.ts` (401 for non-admins), `invoice.test.ts` (403 for unauthorized), `checkout.test.ts` (401/403), `blocking.test.ts` (access denied for non-owners)._

### Form Validation

- ✅ **Empty Fields**: Attempt to save with missing required fields.
  - _Unit: `validations.test.ts` — comprehensive schema validation for all forms; E2E: `teacher-classes.spec.ts` — empty form submission shows error summary._
- ✅ **Invalid Data**: Enter invalid dates or negative values.
  - _Unit: `validations.test.ts` — invalid email, short password, negative capacity, etc._

### Currency & Financial Integrity

- ✅ **Currency Formatting**: DB stores dollars; Stripe uses cents.
  - _Unit: `currency-formatting.test.ts` — regression guards: $30 displays as $30.00 not $0.30, round-trip dollar↔cents conversion, `formatAmountForStripe`/`formatAmountFromStripe`._
- ✅ **Refund Button Conversion**: Dollar-to-cents conversion for Stripe.
  - _Component: `RefundButton.test.tsx` — $50 amount correctly sent as 5000 cents to `processRefund`._

### Technical Failures

- ✅ **Stripe Cancel**: Start a payment but cancel on the Stripe hosted page.
  - _Webhook: `stripe.test.ts` — `checkout.session.expired` updates payment but preserves enrollment as 'pending'._
- ✅ **Webhook Idempotency**: Duplicate events handled correctly.
  - _Webhook: `stripe.test.ts` — signature validation, event type routing._
- 🔲 **Database Integrity**: Delete a class with active enrollments; verify handling.
  - _Not automated._

### Email Notifications

- ✅ **Enrollment Confirmation Email**: Sent with correct student/class/parent details.
  - _Unit: `email.test.ts` — `sendEnrollmentConfirmation` HTML content verification._
- ✅ **Schedule Change Notification**: Sent with correct old/new schedule details.
  - _Unit: `email.test.ts` — `sendScheduleChangeNotification` content._
- ✅ **Payment Receipt**: Sent on successful checkout.
  - _Webhook: `stripe.test.ts` — `sendPaymentReceipt` called after `checkout.session.completed`._

---

## 11. Automated Test Inventory

### Summary

| Category                        | Files  | Key Areas                                                                                                                 |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| **Unit Tests (Server Actions)** | 16     | Auth, classes, enrollments, family, profile, admin, scheduler, dashboard, refunds (×2), payments, blocking                |
| **Unit Tests (Logic)**          | 3      | Scheduling conflicts, student linking, strict role separation                                                             |
| **Unit Tests (Utilities)**      | 4      | Validations, utils, email templates, currency formatting                                                                  |
| **Component Tests**             | 8      | LoginForm, RegisterForm, ClassForm, AdminClassForm, SchedulerClassForm, EnrollButton, AddFamilyMemberDialog, RefundButton |
| **Component Tests (Data)**      | 1      | NextClassCard helpers                                                                                                     |
| **API Route Tests**             | 4      | Checkout, Stripe webhook, CSV export, Invoice                                                                             |
| **Integration Tests**           | 3      | Enrollment flow, admin flow, waitlist flow                                                                                |
| **Test Infrastructure**         | 2      | Stripe fake, Supabase fake                                                                                                |
| **E2E (Playwright)**            | 6      | Auth, parent enrollment, parent family, teacher classes, family management, admin export                                  |
| **Total**                       | **47** |                                                                                                                           |

### Running Tests

```bash
# All unit + integration tests
npm run test

# Specific test file
npx vitest run src/lib/actions/enrollments.test.ts

# E2E tests (requires running dev server)
npx playwright test

# Specific E2E spec
npx playwright test e2e/auth.spec.ts
```

### Coverage Gaps (Manual Only)

The following areas have **no automated coverage** and require manual verification:

1. **Email delivery** — real email sending (templates are tested)
2. **Session persistence** — page refresh preserves login
3. **Student portal** — dashboard, schedule view, materials access (after linking)
4. **Global settings** — registration open date, current semester effects
5. **Master calendar UI** — visual calendar grid in scheduler portal
6. **Super Admin bypass** — RLS bypass, audit log verification
7. **View switcher persistence** — refresh while in alternate view
8. **Database cascade** — delete class with active enrollments
9. **Browse classes UI** — search/filter on browse page
10. **Class materials CRUD** — upload, download, delete materials
