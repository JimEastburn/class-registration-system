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
- **[Supabase Mocks](./vitest.setup.ts)**: We use custom mocks for the Supabase client to isolate tests from the database.
- **[Stripe Mocks]**: Mocked for payment processing tests.

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

## Mocking Strategy

### Supabase
We mock the Supabase client globally in `vitest.setup.ts`. This allows us to simulate database responses without requiring a live Supabase project.

Example of mocking a Supabase call:
```typescript
mockSupabase.from('classes').select.mockResolvedValue({ 
    data: [{ id: '1', name: 'Art Class' }], 
    error: null 
});
```

### Next.js Navigation
We mock `next/navigation` to test redirects and routing without actually changing the page.

### Stripe
Stripe is mocked in relevant tests (e.g., `refunds.test.ts`) using a class-based mock that satisfies the `new Stripe()` constructor.

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
