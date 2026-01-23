# Manual Testing Guide: Class Registration System

This document provides a comprehensive end-to-end manual testing checklist for the Class Registration System. Use this guide to verify the platform's functionality across all user roles.

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Universal Functionality](#2-universal-functionality)
3. [Parent Portal Testing](#3-parent-portal-testing)
4. [Teacher Portal Testing](#4-teacher-portal-testing)
5. [Student Portal Testing](#5-student-portal-testing)
6. [Admin Portal Testing](#6-admin-portal-testing)
7. [Cross-Role Integration Flows](#7-cross-role-integration-flows)
8. [Edge Cases & Error Handling](#8-edge-cases--error-handling)

---

## 1. Prerequisites
Before testing, ensure you have:
- Access to the local development environment (`npm run dev`) or a staging environment.
- Access to the Supabase project (to verify data manually if needed).
- A valid Stripe test card (e.g., `4242 4242 4242 4242`).
- Multiple email addresses (or use `+` aliases, e.g., `user+parent@example.com`) to test different roles.

---

## 2. Universal Functionality
*Applies to all users.*

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
*Goal: Manage family and enroll children.*

### Family Management
- [ ] **Add Member**: Create a family member (child). Verify all fields (Name, Grade, Birth Date, Relationship) save correctly.
- [ ] **Edit Member**: Change a child's grade level and verify the update.
- [ ] **Delete Member**: Remove a child and verify they no longer appear in the family list.

### Student Link Codes
- [ ] **Generate Code**: Click "Generate Student Link Code" on a child's card. Verify a 6-character code is displayed.
- [ ] **Copy Code**: Click the "Copy" button and verify the code is copied to clipboard.
- [ ] **Code Persistence**: Refresh the page; verify clicking the button again shows the same code (not a new one).
- [ ] **Linked Badge**: After a student redeems the code, verify the "Linked" badge appears on the family member card.
- [ ] **Button Hidden When Linked**: Verify the "Generate Student Link Code" button no longer appears for linked family members.
- [ ] **Only Children**: Verify the link code button only appears for family members with relationship "child".

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
*Goal: Manage own classes and track students.*

### Class Management
- [ ] **Create Class**: Create a new class with status set to "Draft".
- [ ] **Publish Class**: Change class status from "Draft" to "Active".
- [ ] **Edit Class**: Update class capacity or schedule and save changes.
- [ ] **Syllabus Upload**: (If implemented) Upload a syllabus file and verify it can be downloaded.
- [ ] **Cancel Class**: Change status to "Cancelled" and verify students/parents are notified (if applicable).
- [ ] **Delete Class**: Delete a draft class and verify it is removed from the list.

### Student Roster
- [ ] **View Roster**: Click on a class to view the list of enrolled students.
- [ ] **Student Info**: Verify student names and grades match what the parent entered.

### Portal Switching
- [ ] **Switch to Parent**: As a Teacher, use the user menu to switch to the Parent Portal.
- [ ] **Manage Family**: Add a child to your own family profile while in Parent mode.

---

## 5. Student Portal Testing
*Goal: View own schedule and materials.*

### Account Linking
- [ ] **Unlinked State**: Log in as a new student; verify the dashboard prompts to enter an invite code.
- [ ] **Enter Code**: Enter the 6-character code from parent. Verify success message and redirect to classes.
- [ ] **Invalid Code**: Enter an incorrect code. Verify error message is displayed.
- [ ] **Expired Code**: Test with a code older than 7 days. Verify "code expired" error.
- [ ] **Already Used**: Test with a code that was already redeemed. Verify "already used" error.
- [ ] **Already Linked**: Attempt to enter a code when already linked. Verify appropriate error.

### Dashboard & Schedule
- [ ] **Linked Dashboard**: After linking, verify the full dashboard with schedule/classes cards is shown.
- [ ] **Weekly Schedule**: Verify that confirmed enrollments appear in the calendar/list view.
- [ ] **Class Materials**: Access class details to view materials provided by the teacher.

---

## 6. Admin Portal Testing
*Goal: System-wide oversight and management.*

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

---

## 7. Cross-Role Integration Flows
*Test how roles interact.*

1. **The Full Loop**:
   - **Admin/Teacher**: Create an "Active" class.
   - **Parent**: Add a child, find that class, and pay for enrollment.
   - **Teacher**: Check the class roster; verify the new student is listed.
   - **Student**: Log in as the child (if applicable); verify the class is in their schedule.
   - **Admin**: Verify the payment appears in the system-wide payment log.

---

## 8. Edge Cases & Error Handling

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
