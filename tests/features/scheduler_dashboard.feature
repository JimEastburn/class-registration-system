Feature: Class Scheduler Dashboard
  As a Class Scheduler
  I want to manage the master schedule and assign classes to teachers
  So that the school year runs smoothly

  # Key Files: src/lib/actions/scheduler.ts, src/lib/actions/classes.ts

  Background:
    Given I am a logged-in user with role "class_scheduler" OR "super_admin"

  # Global Class Management
  Scenario: Create Class for a Teacher
    Given a teacher "Mr. Teacher" exists using user ID "teacher-123"
    When I create a new class "Chemistry" assigning "teacher-123" as instructor
    Then the class "Chemistry" should be created
    And the teacher should be "Mr. Teacher"
    # Why: To set up the course offerings for teachers

  Scenario: Delete a Class (Admin/Scheduler Override)
    Given a class "Chemistry" exists (Draft or Active)
    When I delete the class
    Then the class should be removed
    # Why: To remove classes that are cancelled or created in error

  # Scheduling Logic
  Scenario: Update Class Schedule
    Given a class "Chemistry" is scheduled for "Mon Block 1"
    When I move the class to "Wed Block 2"
    Then the schedule text should update to "Wed Block 2"
    And the database columns for day and time should be updated

  Scenario: Prevent Schedule Overlap (Same Teacher)
    Given "Mr. Teacher" has a class "Physics" on "Mon Block 1"
    When I search for "Mr. Teacher"
    And I try to schedule another class "Chemistry" for "Mon Block 1"
    Then the system should prevent the action
    And return an error "Teacher already has a class scheduled at this time"
    # Why: To prevent scheduling conflicts for teachers

  # Master Schedule Management
  Scenario: Define Semester Dates
    Given I am on the Master Schedule page
    When I set the semester start and end dates
    Then the dates should be saved
    # Why: To define the academic calendar for class validations

