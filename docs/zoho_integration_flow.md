# Zoho Books Integration Flow

This plan outlines the data flow from the `class-registration-system` to Zoho Books, ensuring that Stripe payments are correctly recorded for accounting.

## Architecture Diagram

```mermaid
sequenceDiagram
    participant P as Parent/User
    participant App as This Repository (Next.js)
    participant S as Stripe
    participant DB as Supabase
    participant Z as Zoho Books API

    P->>App: 1. Selects Class & Submits Enrollment
    App->>DB: 2. Saves "Pending" Enrollment
    App->>S: 3. Creates Checkout Session
    S->>P: 4. Redirects to Payment Page
    P->>S: 5. Completes Payment
    S-->>App: 6. Stripe Webhook (checkout.session.completed)

    note over App: Processing Webhook

    App->>DB: 7. Mark Enrollment "Completed"
    App->>DB: 8. Create Payment Record

    note right of App: Zoho Sync Trigger (New)

    App->>Z: 9. Search/Create "Contact" (Parent Email)
    App->>Z: 10. Create "Invoice" (Class Fee)
    App->>Z: 11. Record "Payment" (Reference Stripe ID)
    Z-->>App: 200 OK
```

## Data Mapping

| Local Entity | Zoho Entity | Key Fields |
| :--- | :--- | :--- |
| **Profile (Parent)** | **Contact** | email, first_name, last_name, phone |
| **Class** | **Item** | name, fee (as rate) |
| **Enrollment** | **Invoice** | invoice_number (Local ID), contact_id |
| **Payment (Stripe)** | **Customer Payment** | amount, date, reference_number (Stripe ID) |

## Implementation Strategy

1. **Trigger**: Add a background sync job in [src/app/api/webhooks/stripe/route.ts](file:///Users/jam/Documents/repos-personal/class-registration-system/src/app/api/webhooks/stripe/route.ts) after the Supabase database write is successful.
2. **Error Handling**: Use a "sync_status" column in your `payments` table to track whether the Zoho sync succeeded, allowing for retries if the Zoho API is down.
3. **Queueing**: For high volume, a queue (like Inngest or Upstash) would be ideal, but for starters, a asynchronous fetch call in the webhook handler is sufficient.
