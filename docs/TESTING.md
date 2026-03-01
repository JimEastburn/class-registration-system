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

Instead of mocking individual `supabase.from().select()` calls, we use a **Fake Supabase Client** (`SupabaseFake`) backed by an in-memory database.

- **Why**: Allows complex queries and multiple operations (insert then select) to work naturally in tests.
- **Implementation**: [`src/__integration__/fakes/supabase.ts`](../src/__integration__/fakes/supabase.ts)
- **Tests for the fake itself**: [`src/__integration__/fakes/supabase.test.ts`](../src/__integration__/fakes/supabase.test.ts)

#### Usage Pattern

```typescript
import { SupabaseFake } from '@/__integration__/fakes/supabase';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Profile, FamilyMember } from '@/types';

// 1. Use Supabase types for seed data (Pick<> for minimal shapes)
type SeedProfile = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'role'>;

const adminProfile: SeedProfile = {
  id: 'admin-1',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin',
};

// 2. Create and wire up the fake
function seedFake(overrides = {}): SupabaseFake {
  const fake = new SupabaseFake({
    profiles: [adminProfile] as unknown as Record<string, unknown>[],
    classes: [],
    enrollments: [],
    ...overrides,
  });
  fake.setAuthUser({ id: 'admin-1' });

  // Point both clients to the same fake
  const fakeClient = fake as unknown as Awaited<
    ReturnType<typeof createClient>
  >;
  vi.mocked(createClient).mockResolvedValue(fakeClient);
  vi.mocked(createAdminClient).mockResolvedValue(fakeClient);

  return fake;
}

// 3. Assert on behavior, not mock calls
it('deletes the user', async () => {
  const fake = seedFake({
    profiles: [adminProfile, targetProfile] as unknown as Record<
      string,
      unknown
    >[],
  });

  await deleteUser('target-1');

  // Verify state changed in the fake DB
  const remaining = fake.db.profiles.filter((p) => p.id === 'target-1');
  expect(remaining).toHaveLength(0);
});
```

#### Supported Query Features

| Feature          | Example                                                          | Notes                               |
| ---------------- | ---------------------------------------------------------------- | ----------------------------------- |
| Basic CRUD       | `insert`, `update`, `delete`, `select`                           | Full chain support                  |
| Filters          | `.eq()`, `.neq()`, `.in()`, `.gt()`, `.gte()`, `.lt()`, `.lte()` | All standard filters                |
| Count/head       | `select('*', { count: 'exact', head: true })`                    | Returns `{ count, data: null }`     |
| Relational joins | `select('*, classes:class_id (name, price)')`                    | FK-based resolution                 |
| Inner joins      | `classes!inner(name)`                                            | Filters out rows with no match      |
| Nested joins     | `classes(profiles(first_name))`                                  | Multi-level resolution              |
| Dot-path filters | `.eq('classes.status', 'published')`                             | Filters on joined columns           |
| Modifiers        | `.order()`, `.limit()`, `.single()`, `.maybeSingle()`            | Standard modifiers                  |
| Auth             | `fake.setAuthUser({ id })` / no-auth                             | Simulates `supabase.auth.getUser()` |
| UUID generation  | Auto-generated on `.insert()`                                    | Uses `crypto.randomUUID()`          |

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
