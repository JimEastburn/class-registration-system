# Integration Tests for Server Actions

This directory contains integration tests for the server actions. Unlike unit tests, these tests interact with a **real Supabase instance**.

## Prerequisites

To run these tests, you must have the following environment variables set in your `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Required for setup/teardown and admin actions)

## Recommended: Using a Supabase Branch

We highly recommend running these tests against a dedicated Supabase Branch or a local Supabase instance to avoid polluting your production database.

### Running with a Branch

1. Create a new branch:
   ```bash
   # If you have the Supabase CLI authenticated
   npx supabase branches create integration-tests
   ```
2. Get the API URL and Keys for the branch from the Supabase Dashboard.
3. Update your `.env.local` temporarily or pass them as environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:integration
   ```

## Robustness Features

- **Isolation**: Each test creates its own unique test users via the Supabase Admin API.
- **Cleanup**: Test users are deleted in `afterEach`, which triggers a cascade delete of all associated data (profiles, family members, enrollments).
- **Real Auth**: Tests simulate real sessions by signing in test users and using their JWTs for subsequent requests.

## Running Tests

```bash
npm run test:integration
```
