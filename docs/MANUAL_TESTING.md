# Manual Testing Guide: Class Registration System

This document provides a comprehensive end-to-end manual testing checklist for the Class Registration System. Use this guide to verify the platform's functionality across all user roles.

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

- [ ] **Account Creation**: Register a new account for each role (Parent, Teacher, Student).
- [ ] **Email Verification**: Confirm that a verification email is sent (if enabled) and it works.
- [ ] **Authentication**: Log in with correct credentials; verify it fails with incorrect credentials.
- [ ] **Logout**: Log out and ensure you are redirected to the landing page and cannot access protected routes.
- [ ] **Persistence**: Refresh the page while logged in; verify session persists.

### Profile Management

- [ ] **Edit Profile**: Update first name, last name, and phone number.
- [ ] **Avatar**: (If implemented) Upload/remove profile picture.
- [ ] **Password Reset**: Verify the "Forgot Password" flow from the login page.

---

## 3. Parent Portal Testing

_Goal: Manage family and enroll children._

### Family Management

- [ ] **Add Member**: Create a family member. Verify **Email** is required. Select **Relationship** (Student vs Parent). Verify **Grade** is required ONLY for Students.
- [ ] **Edit Member**: Change a member's relationship or grade. Verify validation logic persists (e.g., changing to Parent clears/hides Grade requirement).
- [ ] **Delete Member**: Remove a child and verify they no longer appear in the family list.

### Student Linking (Email-Based)

_Goal: Link a child's account using their email address._

- [ ] **Enter Email**: Navigate to Family Management -> "Link Student". Enter a valid email address for the child.
- [ ] **Pending Status**: Verify the status shows "Pending" if the student account doesn't exist yet or hasn't accepted.
- [ ] **Auto-Link**: If the student account already exists with that email, verify it links immediately/automatically.
- [ ] **Double Link Prevention**: Attempt to link the same student email to another parent. Verify it is rejected or handled gracefully.

### Class Browsing

- [ ] **Search/Filter**: View the "Browse Classes" page. Ensure only "Active" classes are visible.
- [ ] **Detail View**: Click "View Details" on a class; verify all information (Teacher, Fee, Schedule) is accurate.

### Enrollment & Payments

- [ ] **Start Enrollment**: Select a child for a class and proceed to checkout.
- [ ] **Stripe Checkout**: Complete a payment using a Stripe test card.
- [ ] **Success Redirect**: Verify redirection to the success page after payment.
- [ ] **Status Check**: Go to "My Enrollments" and verify the status is "Confirmed".
- [ ] **Payment History**: Check the "Payments" tab to see the transaction record.

---

## 4. Teacher Portal Testing

_Goal: Manage own classes and track students._

### Class Management

- [ ] **Create Class**: Create a new class with status set to "Draft".
- [ ] **Publish Class**: Change class status from "Draft" to "Active".
- [ ] **Edit Class**: Update class capacity or schedule and save changes.
- [ ] **Syllabus Upload**: (If implemented) Upload a syllabus file and verify it can be downloaded.
- [ ] **Cancel Class**: Change status to "Cancelled" and verify students/parents are notified (if applicable).
- [ ] **Delete Class**: Delete a draft class and verify it is removed from the list.

### Class Materials

- [ ] **Upload Material**: Upload a PDF or add a Link to a class. Verify it appears in the list.
- [ ] **Download/Open**: Click the material to verify it opens/downloads correctly.
- [ ] **Delete Material**: Remove the material and verify it is gone.
- [ ] **View as Student**: (See Student Portal tests) Verify students can see these materials.

### Student Roster

- [ ] **View Roster**: Click on a class to view the list of enrolled students.
- [ ] **Student Info**: Verify student names and grades match what the parent entered.

### Portal Switching (Multi-Role)

- [ ] **Switch to Parent**: As a Teacher/Admin, use the user menu/top-bar to switch to the "Parent View".
- [ ] **Verify Context**: Ensure you are now seeing the Parent Dashboard and can manage _your_ family.
- [ ] **Switch Back**: Use the switcher to return to the "Teacher View".
- [ ] **Persistence**: Refresh the page while in "Parent View". Ensure you stay in Parent View.

---

## 5. Student Portal Testing

_Goal: View own schedule and materials._

### Account Linking

- [ ] **Accept Pending Link**: If a parent initiated the link, verify a notification or status update confirms the link.
- [ ] **Verify Family**: Check Profile/Settings to see the linked Parent account name.

### Dashboard & Schedule

- [ ] **Linked Dashboard**: After linking, verify the full dashboard with schedule/classes cards is shown.
- [ ] **Weekly Schedule**: Verify that confirmed enrollments appear in the calendar/list view.
- [ ] **Class Materials**: Access class details to view materials provided by the teacher.

---

## 6. Admin Portal Testing

_Goal: System-wide oversight and management._

### User Management

- [ ] **Role Modification**: Change a user's role (e.g., promote a parent to teacher).
- [ ] **Account Deletion**: Delete a user account and verify all linked data (enrollments, family) is handled correctly.

### System-Wide Classes/Enrollments

- [ ] **Edit Any Class**: Modify a class created by any teacher.
- [ ] **Handle Enrollments**: Manually change an enrollment status (e.g., from "Pending" to "Confirmed" to bypass payment).

### Payments & Dashboard

- [ ] **Transaction Log**: View all system-wide payments.
- [ ] **Revenue Stats**: Verify that dashboard stats (Total Revenue, Enrolled Students) reflect current data.

### Data Exports

- [ ] **CSV Export**: Export Classes, Users, and Enrollments to CSV. Verify the files open correctly in Excel/Sheets with no truncation.

### System Configuration

- [ ] **Global Settings**: Update "Registration Open Date" and "Current Semester". Verify these affect new enrollments.
- [ ] **Role Management**: Promote a Parent to Teacher. Verify they gain access to the Teacher Portal.

---

## 7. Class Scheduler Portal Testing

_Goal: Manage the Master Schedule._

- [ ] **Access Control**: Verify ONLY Class Schedulers can access `/class-scheduler`.
- [ ] **Master Calendar**: View the calendar grid with ALL classes.
- [ ] **Conflict Detection**: Try to schedule two classes in the same room at the same time. Verify warning/error.
- [ ] **Edit Other Teacher's Class**: Modify a class belonging to "Teacher A". Verify the change persists.

---

## 8. Super Admin Portal Testing

_Goal: God Mode capabilities._

- [ ] **Global View Switcher**: Use the special dropdown to switch to `Admin`, `Teacher`, `Scheduler`, or `Parent` views instantly.
- [ ] **Bypass RLS**: View a class or profile that implies restricted access (e.g., another Teacher's draft class) and verify visibility.
- [ ] **Audit Logs**: Perform a "God Mode" action. Verify it appears in the System Audit Log.

---

## 9. Cross-Role Integration Flows

_Test how roles interact._

1. **The Full Loop**:
   - **Admin/Teacher**: Create an "Active" class.
   - **Parent**: Add a child, find that class, and pay for enrollment.
   - **Teacher**: Check the class roster; verify the new student is listed.
   - **Student**: Log in as the child (if applicable); verify the class is in their schedule.
   - **Admin**: Verify the payment appears in the system-wide payment log.

---

## 10. Edge Cases & Error Handling

### Business Logic

- [ ] **Capacity Limit**: Attempt to enroll in a class that is already at 100% capacity. Verify the waitlist logic or "Full" status.
- [ ] **Duplicate Enrollment**: Attempt to enroll the same child in the same class twice.
- [ ] **Unauthorized Access**: Attempt to visit `/admin` as a Parent or Teacher. Verify redirect to unauthorized page or dashboard.

### Form Validation

- [ ] **Empty Fields**: Attempt to save a class or family member with missing required fields.
- [ ] **Invalid Data**: Enter invalid dates (e.g., end date before start date) or negative fees.

### Technical Failures

- [ ] **Stripe Cancel**: Start a payment but cancel on the Stripe hosted page. Verify the enrollment remains "Pending" and no payment record is created.
- [ ] **Database Integrity**: Delete a class that has active enrollments; verify if the system prevents this or handles it gracefully (e.g., cascading delete vs restriction).
