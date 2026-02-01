Feature: Profile View Switching
  As a User with multiple roles (e.g., Teacher/Admin AND Parent)
  I want to switch between my Role View and Parent View
  So that I can manage my classes/system AND manage my own children

  # Key Files: src/components/dashboard/DashboardLayout.tsx

  Background:
    Given I am a logged-in user

  Scenario: Teacher Switches to Parent View
    Given I am a "teacher"
    And I am currently in "Teacher View"
    When I click the "Parent View" toggle
    Then I should be redirected to the Parent Dashboard "/parent"
    And the interface should show parent-specific navigation

  Scenario: Teacher Switches Back to Teacher View
    Given I am a "teacher"
    And I am currently in "Parent View"
    When I click the "Teacher View" toggle
    Then I should be redirected to the Teacher Dashboard "/teacher"
    And the interface should show teacher-specific navigation

  Scenario: Admin Switches to Parent View
    Given I am an "admin"
    And I am currently in "Admin View"
    When I click the "Parent View" toggle
    Then I should be redirected to the Parent Dashboard "/parent"

  Scenario: Admin Switches Back to Admin View
    Given I am an "admin"
    And I am currently in "Parent View"
    When I click the "Admin View" toggle
    Then I should be redirected to the Admin Dashboard "/admin"
    And the interface should show admin-specific navigation

  Scenario: Class Scheduler Switches to Parent View
    Given I am a "class_scheduler"
    And I am currently in "Scheduler View"
    When I click the "Parent View" toggle
    Then I should be redirected to the Parent Dashboard "/parent"

  Scenario: Class Scheduler Switches Back to Scheduler View
    Given I am a "class_scheduler"
    And I am currently in "Parent View"
    When I click the "Scheduler View" toggle
    Then I should be redirected to the Scheduler Dashboard "/class_scheduler"

  Scenario: General Admin Denied Scheduler Access
    Given I am an "admin" (but NOT the Class Scheduler)
    When I navigate to the Class Scheduler Dashboard "/class_scheduler"
    Then I should be redirected to "/admin"
    And I should see an error "Access Denied"

  Scenario: Super Admin Can Access Scheduler View
    Given I am a "super_admin"
    When I navigate to the Class Scheduler Dashboard "/class_scheduler"
    Then I should be granted access
    And I should see the Scheduler tools

    When I open the View Switcher
    Then I should see toggles for "Admin View", "Scheduler View", and "Parent View"

  Scenario: Super Admin Switches to Parent View
    Given I am a "super_admin"
    And I am also a "parent"
    When I click the "Parent View" toggle
    Then I should be redirected to the Parent Dashboard "/parent"
    And I should see my children's enrollments


  Scenario: Student Has No View Switch
    Given I am a "student"
    When I view the dashboard header
    Then I should NOT see a "View Toggle" option
    And I should only see Student navigation

  Scenario: Pure Parent Has No View Switch
    Given I am a "parent" (and NOT a teacher/admin/scheduler)
    When I view the dashboard header
    Then I should NOT see a "View Toggle" option
