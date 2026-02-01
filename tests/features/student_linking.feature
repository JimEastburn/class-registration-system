Feature: Student Linking (Family Invites)
  As a User (Parent or Student)
  I want to link student accounts to family profiles using the student email address
  So that students can see their specific class schedules

  # Key Files: src/lib/actions/invites.ts

  Background:
    Given I am a logged-in user

  Scenario: Parent Enters Student Email
    Given I am a "parent"
    When I choose to add "Bobby Jr." to my family profile
    Then the parent should enter the student's email address
    And the student should be added to the family profile if student has already registered with that email
    And the student should not be added to the family profile if student has not registered with that email

  Scenario: Student Register with Email
    Given I am a "student"
    When I register in the system, 
    Then I am required to enter an email as a part of my registration data
    And if my parent has already registered me, including my email, my account should be linked to their family profile
    And if my parent has not registered me, my account should not be linked to any family profile


  Scenario: Prevent Double Linking
    Given I am a "student"
    And my account is already linked to my family profile
    When another parent attempts to link my account to their family profile
    Then the system should display an error "Your account is already linked to a family"
