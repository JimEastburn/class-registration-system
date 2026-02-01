Feature: Class Materials Management
  As a Teacher
  I want to share resources with my students
  So that they have access to study materials

  # Key Files: src/lib/actions/materials.ts

  Background:
    Given I am a logged-in user

  Scenario: Teacher Adds Material
    Given I am a "teacher"
    And I teach the class "Physics 101"
    When I upload a file "Notes.pdf"
    And I set the visibility to "Public"
    Then the material should be added to the "Physics 101" class
    And students enrolled in "Physics 101" should be able to see it

  Scenario: Teacher Deletes Material
    Given I am a "teacher"
    And I uploaded a material "Old Notes.pdf" to "Physics 101"
    When I choose to delete the material
    Then the material should be removed from the database
    And it should no longer appear in the class list

  Scenario: Student Views Materials
    Given I am a "student"
    And I am enrolled in "Physics 101"
    When I view the "Physics 101" class details
    Then I should see a list of available materials
    And I should be able to download "Notes.pdf"

  Scenario: Access Control (Non-Teacher)
    Given I am a "teacher"
    But I do NOT teach "Chemistry 101"
    When I attempt to add material to "Chemistry 101"
    Then the system should display an error "You do not have permission to add materials to this class"
