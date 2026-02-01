# Testing Guide

This document outlines the testing strategy, frameworks, and best practices for the Class Registration System.

## Testing Strategy

We employ a multi-layered testing strategy to ensure the reliability and maintainability of the application:

1.  **Unit Tests**: Test individual utility functions and validation schemas in isolation.
2.  **Component Tests**: Verify the behavior and rendering of UI components using React Testing Library.
3.  **Server Action Tests**: Test server-side logic, database interactions, and authorization.
4.  **Integration Tests**: Verify the interaction between multiple components or modules.
5.  **E2E Tests**: Test the entire application flow from the user's perspective using Playwright.

## Frameworks and Tools

- **[Vitest](https://vitest.dev/)**: Our primary testing framework for unit, integration, and server action tests.
- **[React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)**: Used for component testing.
- **[Playwright](https://playwright.dev/)**: Used for end-to-end testing across different browsers.
- **[Supabase Fakes](./vitest.setup.ts)**: We use in-memory Fakes for Supabase to simulate database state reliably.
- **[Stripe Fakes]**: We use an in-memory Fake Stripe provider to test payment flows without external API calls.

## Running Tests

### Unit, Integration, and Server Action Tests

```bash
# Run all Vitest tests
npm run test:run

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests

```bash
# First-time setup: Install Playwright browsers
npx playwright install

# Run Playwright tests
npm run test:e2e

# Run Playwright tests with UI
npx playwright test --ui
```

## Test Isolation Strategy: Fakes over Mocks

We prioritize **Fakes** (stateful in-memory implementations) over generic Mocks. Mocks make tests brittle by checking _interactions_ (e.g., "was this function called?"), whereas Fakes allow us to check _behavior/state_ (e.g., "did the balance change?").

### Supabase (Database)

Instead of mocking individual `supabase.from().select()` calls, we use a **Fake Supabase Client** backed by an in-memory database.

- **Why**: Allows complex queries and multiple operations (insert then select) to work naturally in tests.
- **Implementation**: See `src/__integration__/fakes/supabase.ts`.

### Stripe (Payments)

We use a **Fake Stripe Provider** that maintains an in-memory ledger of customers and charges.

- **Why**: Allows testing full payment flows (charge -> refund -> balance check) without hitting the real Stripe API.

### Next.js Navigation

We mock `next/navigation` to test redirects and routing without actually changing the page.

### Stripe

Stripe is faked in relevant tests (e.g., `refunds.test.ts`) using a class-based fake that satisfies the `new Stripe()` constructor.

## Writing New Tests

- **Location**: Place test files in `__tests__` directories relative to the source file (e.g., `src/lib/actions/__tests__/auth.test.ts`).
- **Naming**: Use `.test.ts` or `.test.tsx` extensions.
- **Patterns**:
  - Use `describe` blocks to group related tests.
  - Use `beforeEach` to reset mocks and setup state.
  - Test both success and error paths (failure cases).
  - Verify authorization checks in server actions.

## Code Coverage

We target a high level of code coverage for core business logic. Run `npm run test:coverage` to generate a report and view areas that need more testing.
