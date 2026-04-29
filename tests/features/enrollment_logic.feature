Feature: Enrollment Logic & Constraints
  As the System
  I want to enforce rules for class enrollments
  So that class sizes are respected and access is controlled

  # Key Files: src/lib/actions/enrollments.ts, src/lib/actions/waitlist.ts

  Background:
    Given a class "Chemistry 101" exists
    And the class has a maximum capacity of 20 students

  # Capacity Logic
  Scenario: Enroll in Class with Available Seats
    Given "Chemistry 101" has 19 enrolled students
    When a student attempts to enroll
    Then the enrollment should succeed
    And the class enrollment count should become 20

  Scenario: Reject Enrollment when Class is Full
    Given "Chemistry 101" has 20 enrolled students
    When a student attempts to enroll
    Then the enrollment should fail
    And an error "Class is full" should be returned

  # Waitlist Logic
  Scenario: Join Waitlist when Class is Full
    Given "Chemistry 101" is full
    And "Chemistry 101" has 2 students on the waitlist
    When a student attempts to join the waitlist
    Then the student should be added to the waitlist
    And their position should be 3

  Scenario: Prevent Waitlist Join if Spots Available
    Given "Chemistry 101" has 15 enrolled students (5 spots open)
    When a student attempts to join the waitlist
    Then the action should fail
    And they should be prompted to enroll directly

  # Integrity Checks
  Scenario: Prevent Double Booking
    Given "Timmy" is already enrolled in "Chemistry 101"
    When "Timmy" attempts to enroll again
    Then the system should reject the request

  Scenario: Enforce Block List
    Given "Timmy" is on the blocked list for "Chemistry 101"
    When "Timmy" attempts to enroll
    Then the system should reject the request with a "Blocked" error

  # Admin Enrollment
  Scenario: Admin Enrolls Student with Available Seats
    Given an admin user is logged in
    And "Chemistry 101" has 19 enrolled students
    When the admin enrolls "Timmy" in "Chemistry 101"
    Then the enrollment should be created as pending

  Scenario: Admin Enrolls Student when Class is Full
    Given an admin user is logged in
    And "Chemistry 101" has 20 enrolled students
    When the admin enrolls "Timmy" in "Chemistry 101"
    Then the student should be added to the waitlist

  Scenario: Admin Reactivates Cancelled Enrollment
    Given an admin user is logged in
    And "Timmy" has a cancelled enrollment in "Chemistry 101"
    When the admin enrolls "Timmy" in "Chemistry 101"
    Then the cancelled enrollment should be reactivated
