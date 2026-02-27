# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Next.js 16 class registration system (single process, no Docker/containers). All external services (Supabase, Stripe, Resend, Zoho) are remote SaaS — no local databases to run.

### Running services

- **Dev server**: `npm run dev` (port 3000, Turbopack). See `CLAUDE.md` for all commands.
- A `.env.local` with placeholder credentials is sufficient to start the dev server and render UI pages; actual auth/payments require real Supabase + Stripe credentials.

### Testing

- **Unit/integration tests** use in-memory fakes (no env vars needed): `npm run test:run` (266 tests, 38 files)
- **E2E tests** require Playwright browsers: `npx playwright install --with-deps chromium`
- E2E tests (`npm run test:e2e`) require a running dev server and real Supabase credentials to function.
- Lint: `npm run lint` — pre-existing lint warnings/errors in the repo are not regressions.
- Format: `npm run format:check` — some pre-existing formatting issues exist.

### Gotchas

- `src/lib/stripe.ts` throws at import time if `STRIPE_SECRET_KEY` is not set. Any server action that imports Stripe will fail without this env var, but the dev server still starts since it's a runtime (not build-time) check.
- No `.env.example` file exists in the repo; env var documentation is in `CLAUDE.md`.
- Tests use `@vitejs/plugin-react` with jsdom; the `vitest.setup.ts` mocks Next.js navigation (`next/navigation`, `next/headers`).
- Node.js 18+ required (22.x works fine).
