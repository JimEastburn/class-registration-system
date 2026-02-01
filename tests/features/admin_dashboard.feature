Feature: Admin Dashboard & System Management
  As an Admin
  I want to have full control over users, classes, and system data
  So that I can manage the school's operations

  # Key Files: src/lib/actions/admin.ts

  Background:
    Given I am a logged-in user with role "admin"

  # User Management
  Scenario: Promote User Role
    Given a user "Jane Parent" with role "parent" exists
    When I update "Jane Parent" role to "class_scheduler"
    Then "Jane Parent" should have role "class_scheduler" in the database
    And the role should be synced to Supabase Auth metadata

  Scenario: Assign Class Scheduler Role (Singleton Enforcement)
    Given no user currently has the role "class_scheduler"
    When I update "Jane Parent" role to "class_scheduler"
    Then the update should succeed
    And "Jane Parent" should be the "class_scheduler"
    # Why: To designate a specific user for schedule management

  Scenario: Edit User Details
    Given a user "Jane Parent" exists
    When I update her email address
    Then the email should be updated in the system
    # Why: To correct user data entry errors or changes

  Scenario: Prevent Multiple Class Schedulers
    Given "Existing Scheduler" already has the role "class_scheduler"
    When I attempt to promote "New Guy" to "class_scheduler"
    Then the system should prevent the update
    And display an error "Only one user can be the Class Scheduler"

  Scenario: Prevent Assigning Scheduler Role to Teacher
    Given a user "Mr. Teacher" with role "teacher" exists
    When I attempt to promote "Mr. Teacher" to "class_scheduler"
    Then the system should prevent the update
    And return an error "Teachers cannot be Class Schedulers"

  Scenario: Prevent Assigning Scheduler Role to Student
    Given a user "Student Sam" with role "student" exists
    When I attempt to promote "Student Sam" to "class_scheduler"
    Then the update should fail
    And return an error "Students cannot be Class Schedulers"

  Scenario: Demote User Role (Safety)
    Given a user "Mr. Teacher" with role "teacher" exists
    When I demote "Mr. Teacher" to "parent"
    Then "Mr. Teacher" should lose access to the Teacher Portal
    And "Mr. Teacher" should behave as a regular parent

  Scenario: Delete User
    Given a user "Bad User" exists
    When I delete the user "Bad User"
    Then the user account and profile should be permanently removed

  # Class Management (Override)
  Scenario: Admin Update Class Details
    Given a class "Math 101" exists (created by any teacher)
    When I update the class fee to 200.00
    Then the class fee should be updated to 200.00
    And the change should be persisted

  Scenario: Admin Delete Any Class
    Given a class "Math 101" exists (even if active)
    When I delete the class
    Then the class should be removed

  # Enrollment Management (Force)
  Scenario: Force Cancel Enrollment
    Given "Timmy Doe" has a "confirmed" enrollment in "Math 101"
    When I manually update the enrollment status to "cancelled"
    Then the enrollment should be cancelled
    And the seat should be released

  # Payment Management
  Scenario: Manual Payment Update
    Given a payment record exists with status "pending"
    When I manually update the status to "completed"
    Then the system should record the payment as complete

  # Refund Processing
  Scenario: Process Full Refund
    Given a completed payment "pay_123" exists for "Math 101"
    And the student enrollment is "confirmed"
    When I process a refund for "pay_123"
    Then a refund request should be sent to Stripe
    And the payment status should update to "refunded"
    And the student enrollment status should revert to "pending"

  Scenario: Prevent Invalid Refunds
    Given a payment "pay_456" is "pending" or already "refunded"
    When I attempt to refund "pay_456"
    Then the system should return an error "Cannot refund this payment"
    And no request should be sent to Stripe

  # System Configuration
  Scenario: Update Global Settings
    Given I am on the System Settings page
    When I update the "Registration Open Date"
    Then the new date should be saved
    And registration should be blocked before that date
    # Why: To control when parents can begin enrolling children

