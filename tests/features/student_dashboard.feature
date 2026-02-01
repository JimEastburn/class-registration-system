Feature: Student Dashboard
  As a Student
  I want to view my class schedule and details
  So that I know where and when to attend

  # Key Files: src/app/(dashboard)/student/*

  Background:
    Given I am a logged-in user with role "student"

  Scenario: View Personal Class Schedule
    Given I am enrolled in "Math 101" (Mon/Wed Block 1)
    And I am enrolled in "Science 101" (Tue/Thu Block 2)
    When I view my dashboard
    Then I should see "Math 101" and "Science 101" on my schedule
    And the block and location should be correct

  Scenario: View Class Details
    Given I am on my dashboard
    When I click on "Math 101"
    Then I should see the syllabus, teacher name, block, and location
    # Why: To be prepared for the lesson

  # Profile Management
  Scenario: Update Student Profile
    Given I am on my student profile
    When I update my preferred name to "Tim"
    Then my profile should show "Tim" as my display name
    # Why: To ensure teachers use my preferred name

