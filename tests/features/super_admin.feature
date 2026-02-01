Feature: Super Admin God Mode
  As a Super Admin
  I want to have unrestricted access to ALL system features
  So that I can manage any aspect of the platform without role limitations

  # Key Files: src/types/index.ts (New Role), src/lib/auth.ts

  Background:
    Given I am a logged-in user with role "super_admin"

  Scenario: Super Admin Accesses Scheduler Dashboard
    When I navigate to the Class Scheduler Dashboard "/class_scheduler"
    Then I should be granted access
    And I should see all scheduling tools
    And I should NOT be redirected to "/admin"

  Scenario: Super Admin Accesses Admin Dashboard
    When I navigate to the Admin Dashboard "/admin"
    Then I should be granted access

  Scenario: Super Admin Accesses Teacher Portal
    # Super Admins might need to debug teacher views
    When I navigate to the Teacher Dashboard "/teacher"
    Then I should be granted access

  Scenario: Super Admin Switches Views
    Given I am in "Admin View"
    When I open the "View Switcher"
    Then I should see options for "Admin", "Teacher", "Scheduler", and "Parent"
    And I should be able to toggle between them freely
