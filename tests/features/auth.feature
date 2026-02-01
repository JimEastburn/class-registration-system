Feature: Authentication
  As a user
  I want to sign up, sign in, and manage my account
  So that I can access the Class Registration System securely

  # Key Files: src/lib/actions/auth.ts, src/app/(auth)/*

  Scenario: Successful Sign Up (Parent)
    Given I am on the registration page
    When I submit the registration form with:
      | email           | parent@example.com |
      | password        | SecurePass123!     |
      | firstName       | Jane               |
      | lastName        | Doe                |
      | role            | parent             |
      | phone           | 555-0100           |
      | codeOfConduct   | true               |
    Then a new user account should be created
    And a corresponding profile should be created with role "parent"
    And I should be redirected to the email confirmation page

  Scenario: Registration Password Validation
    Given I am on the registration page
    When I submit the registration form with an invalid password "weak"
    Then I should see validation errors:
      | error | Password must be at least 8 characters |
      | error | Password must contain at least one uppercase letter |
      | error | Password must contain at least one number |

  Scenario: Code of Conduct Required
    Given I am on the registration page
    When I submit the form without accepting the Code of Conduct
    Then I should see a validation error "You must agree to the Community Code of Conduct"

  Scenario: Functionally Correct Sign In (Parent)
    Given I have a registered account with role "parent"
    When I submit the login form with valid credentials
    Then I should be successfully authenticated
    And I should be redirected to "/parent"

  Scenario: Functionally Correct Sign In (Teacher)
    Given I have a registered account with role "teacher"
    When I submit the login form with valid credentials
    Then I should be successfully authenticated
    And I should be redirected to "/teacher"

  Scenario: Sign In Implementation Logic (Missing Profile Fallback)
    Given I have a Supabase Auth user without a profile in the "profiles" table
    When I submit the login form with valid credentials
    Then the system should automatically create a profile entry
    And I should be successfully logged in

  Scenario: Sign Out
    Given I am currently logged in
    When I click the "Sign Out" button
    Then my session should be invalidated
    And I should be redirected to "/login"

  Scenario: Password Reset Request
    Given I am on the Forgot Password page
    When I submit my email address "user@example.com"
    Then a password reset link should be sent to "user@example.com"

  Scenario: Password Update
    Given I have clicked a valid password reset link
    When I submit a new password
    Then my password should be updated
    And I should be able to log in with the new password
