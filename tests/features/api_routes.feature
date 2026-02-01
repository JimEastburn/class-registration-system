Feature: Integration & API Routes
  As the System Integrator
  I want to process webhooks and sync data between services
  So that financial and enrollment records are consistent

  # Key Files: src/app/api/webhooks/stripe/*, src/lib/actions/zoho.ts

  # Stripe Webhooks
  Scenario: Handle Successful Payment Webhook
    Given a Stripe event "checkout.session.completed"
    And the event payload contains a valid Customer and Price ID
    When the webhook endpoint "/api/webhooks/stripe" receives the event
    Then the system should identify the pending enrollment
    And update the enrollment status to "confirmed"
    And create a payment record in the database
    And trigger the Zoho Books sync

  Scenario: Idempotency Check (Duplicate Webhook)
    Given a "checkout.session.completed" event has already been processed with ID "evt_123"
    When the webhook endpoint receives the same event "evt_123" again
    Then the system should acknowledge the request (200 OK)
    But perform no further database updates (idempotency)

  # Zoho Integration
  Scenario: Sync Payment to Zoho Books (Success)
    Given a new payment record "pay_abc" has been created
    When the Zoho sync process runs handling "pay_abc"
    Then it should find/create a Zoho Contact for the parent
    And create a Zoho Invoice
    And record the Payment in Zoho
    And update the local payment record with "sync_status: synced"

  Scenario: Sync Payment to Zoho Books (Failure/Retry)
    Given the Zoho API is temporarily down (500 Error)
    When the Zoho sync process runs handling "pay_abc"
    Then it should log the error
    And update the local payment record with "sync_status: failed"
    # Note: A retry mechanism (Cron/Queue) would pick this up later

  # Emails
  Scenario: Send Enrollment Confirmation
    Given a student has successfully enrolled in "Math 101"
    When the enrollment logic completes
    Then an email should be sent to the parent's address
    And the email should contain class details (Time, Location, Teacher)
