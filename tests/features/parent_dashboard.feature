Feature: Parent Dashboard & Enrollment
  As a Parent
  I want to manage my family profile and enroll my children in classes
  So that they can attend courses

  # Key Files: src/lib/actions/family.ts, src/lib/actions/enrollments.ts

  Background:
    Given I am a logged-in user with role "parent"

  # Profile Management
  Scenario: Update Parent Profile
    Given I am on my profile page
    When I update my phone number to "555-0199"
    And I save the changes
    Then my profile should be updated
    # Why: To ensure I receive important notifications about my children

  # Family Management
  Scenario: Add a Child to Family Profile
    Given I am on the Family Management page
    When I add a new family member with:
      | firstName    | Timmy        |
      | lastName     | Doe          |
      | relationship | Child        |
      | gradeLevel   | 5th Grade    |
      | birthDate    | 2015-05-20   |
    Then the new family member "Timmy Doe" should appear in my list
    And the database should record "parent_id" as my user ID
    # Why: So that I can enroll them in classes

  Scenario: Update Child Details
    Given I have a child "Timmy Doe"
    When I update "Timmy Doe" grade level to "6th Grade"
    Then the child's profile should reflect "6th Grade"
    # Why: To keep their academic information current for eligibility

  Scenario: Delete a Child Profile
    Given I have a family member named "Timmy Doe"
    When I delete the family member "Timmy Doe"
    Then "Timmy Doe" should be removed from my family list
    And any associated pending enrollments should be handled (cancelled/removed)

  # Class Browsing & Enrollment
  Scenario: Enroll Child in an Open Class
    Given a class "Math 101" exists and is active
    And "Math 101" has available seats (Current: 5, Max: 20)
    And I have a child "Timmy Doe" registered
    When I request to enroll "Timmy Doe" in "Math 101"
    Then the enrollment status should be "pending"
    And "Timmy Doe" should appear in the "Math 101" roster as pending
    And I should receive an enrollment confirmation email

  Scenario: Attempt Enrollment in Full Class (Capacity Logic)
    Given a class "Science 101" exists and is active
    And "Science 101" is full (Current: 20, Max: 20)
    When I request to enroll "Timmy Doe" in "Science 101"
    Then the enrollment should fail with error "Class is full"
    # Note: Waitlist logic would trigger here if implemented

  Scenario: Prevent Duplicate Enrollment
    Given "Timmy Doe" is already enrolled in "Math 101" (Status: Pending or Confirmed)
    When I request to enroll "Timmy Doe" in "Math 101" again
    Then the enrollment should fail with error "Student is already enrolled in this class"

  Scenario: Enroll Blocked Student
    Given "Timmy Doe" has been blocked from "Math 101" by a teacher
    When I request to enroll "Timmy Doe" in "Math 101"
    Then the enrollment should fail with error "Student is blocked from enrolling in this class"

  # Enrollment Management
  Scenario: Cancel Enrollment
    Given "Timmy Doe" has a "pending" enrollment in "Math 101"
    When I cancel the enrollment
    Then the enrollment status should update to "cancelled"
    And the seat should be released in "Math 101"

    When the enrollment is confirmed (via payment webhook or admin)
    Then the enrollment status should become "confirmed"
    # Why: To finalize the seat reservation

  # Payment Method Management
  Scenario: Add Payment Method
    Given I am on the Billing page
    When I add a new credit card ending in "4242"
    Then the card should be saved to my customer profile in Stripe
    # Why: To facilitate quick checkout for future enrollments

  Scenario: Remove Payment Method
    Given I have a saved card ending in "1234"
    When I delete the payment method
    Then the card should be removed from my profile
    # Why: To remove expired or unused cards for security

