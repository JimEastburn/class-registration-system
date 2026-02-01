Feature: Teacher Dashboard & Class Management
  As a Teacher
  I want to create and manage my classes and view my students
  So that I can deliver courses effectively

  # Key Files: src/lib/actions/classes.ts

  Background:
    Given I am a logged-in user with role "teacher"

  # Profile Management
  Scenario: Update Teacher Bio
    Given I am on my teacher profile
    When I update my bio to "Ph.D. in Physics with 10 years experience"
    Then my profile should be updated
    # Why: To showcase my qualifications to parents looking for classes

  # Class Management
  Scenario: Create a New Class (Draft)
    Given I am on the Class Management page
    When I create a new class with:
      | name        | Intro to Physics |
      | description | Basic physics    |
      | fee         | 150.00           |
      | maxStudents | 20               |
      | syllabus    | File upload...   |
    Then the class "Intro to Physics" should be created with status "draft"
    And the schedule should be "To Be Announced" (default for teachers)
    And I should be listed as the teacher
    # Why: To prepare a new course offering for the semester

  Scenario: Update Class Details
    Given I have a draft class "Intro to Physics"
    When I change the fee to 175.00
    And I update the description
    Then the class details should be updated
    # Why: To correct mistakes or adjust curriculum before publishing

  Scenario: Publish a Class (Status Change)
    Given I have a class "Intro to Physics" with status "draft"
    When I update the status to "active"
    Then the class should be visible to parents for enrollment

  Scenario: Delete a Draft Class
    Given I have a class "Intro to Physics" with status "draft"
    When I delete the class
    Then the class should be removed from the system

  Scenario: Cannot Delete Active Class
    Given I have a class "Advanced Physics" with status "active"
    When I attempt to delete the class
    Then the deletion should fail with error "Only draft classes can be deleted"

  Scenario: Validate Class Dates
    Given I am creating a new class
    When I set the Start Date to "2024-12-31" and End Date to "2024-01-01"
    Then I should see a validation error "End date must be after start date"
    And the class should not be saved

  # Student Management
  Scenario: Block a Student
    Given "Timmy Doe" is enrolled in my class "Advanced Physics"
    When I block "Timmy Doe" with reason "Disruptive behavior"
    Then "Timmy Doe" should be removed from the class
    And "Timmy Doe" should be prevented from re-enrolling

    Then "Timmy Doe" should be allowed to enroll again
    # Why: To restore access after behavior issues are resolved or misunderstanding cleared

  # Schedule Management (Restriction)
  Scenario: Teacher Cannot Create Schedule
    Given I have a class "Advanced Physics"
    When I view the class details
    Then I should not see an option to make a schedule for the class
