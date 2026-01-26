# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm run lint             # Run ESLint

# Testing
npm run test:run         # Run all Vitest tests (217+ tests)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright with UI

# Deployment
npx vercel               # Deploy preview/staging
npx vercel --prod        # Deploy to production
npx vercel env pull      # Sync environment variables from Vercel
```

## Architecture Overview

### Role-Based Access Control (RBAC)

The system has **five roles** with specific permissions:

- `parent` - Default role, manages family members and enrollments
- `teacher` - Creates/manages classes, can also act as parent (dual-role)
- `student` - Limited access, tied to family_member records
- `admin` - Full system access, can also act as parent (dual-role)
- `class_scheduler` - Can set class schedules (restricted to parents/admins only)

**Key constraints:**
- Teachers **cannot** set class schedules (forced to "To Be Announced")
- Only class_schedulers and admins can set schedules
- Admin, teacher, and class_scheduler users can switch to parent view
- Roles stored in `profiles.role` (database) and synced to `auth.users.user_metadata.role`

**Authorization layers:**
1. Database RLS (Row-Level Security) using `SECURITY DEFINER` functions
2. Application-level checks in server actions via `user.user_metadata?.role`
3. UI conditional rendering (not security boundary)

### Server Actions Pattern

All server actions follow this pattern (`src/lib/actions/*`):

```typescript
'use server'
↓
createClient() with cookies
↓
getUser() authentication check
↓
Role-based authorization
↓
RLS-protected database operations
↓
revalidatePath() for cache invalidation
↓
Return ActionResult type
```

**Important:** Never skip reading files before modifying. Server actions rely on RLS policies for security.

### Database Architecture

**Core relationships:**
```
auth.users (1:1) → profiles (1:N parent_id) → family_members (1:N student_id) → enrollments (1:1) → payments
                                                                                ↑
                                                                      classes (1:N) ←─ created by teachers
```

**Capacity management:**
- `classes.current_enrollment` automatically maintained by database trigger
- Trigger: `update_enrollment_count()` increments/decrements on enrollment status changes
- Only 'confirmed' enrollments count toward capacity
- Application checks capacity before enrollment: `current_enrollment >= max_students`

**Waitlist system:**
- Separate `waitlist` table with position tracking
- Manual promotion (no automatic processing to avoid race conditions)
- UNIQUE constraint on (class_id, student_id) prevents duplicates

**Class blocks:**
- Teachers can block specific students from their classes
- Trigger automatically cancels enrollments when block is added
- Checked before new enrollments are created

### Payment & Stripe Integration

**Three-phase flow:**

**Phase 1 - Checkout (`/api/checkout/route.ts`):**
1. Verify enrollment exists with status 'pending'
2. Create Stripe checkout session
3. Store pending payment with `transaction_id = session.id`

**Phase 2 - Webhook (`/api/webhooks/stripe/route.ts`):**
1. Verify webhook signature
2. **Idempotency check** - skip if payment already processed
3. Update payment status to 'completed'
4. Update enrollment status to 'confirmed' (triggers capacity increment)
5. Fire-and-forget Zoho sync (async, doesn't block)
6. Send receipt email

**Phase 3 - Zoho Sync (`src/lib/zoho.ts`):**
- Asynchronous, failures don't affect enrollment
- Sync status tracked: pending → synced/failed
- Failed syncs can be retried via admin panel

**Critical pattern:** Idempotency via `transaction_id` prevents double-processing of duplicate webhooks.

### Supabase Client Types

Three client configurations for different contexts:

1. **Server Client** (`src/lib/supabase/server.ts`) - RLS-enabled, cookie-based auth
2. **Admin Client** (`src/lib/supabase/admin.ts`) - Service role, bypasses RLS
3. **Middleware Client** (`src/lib/supabase/middleware.ts`) - Session refresh

**Important:** Only use admin client for webhooks and admin operations. All user actions must use server client with RLS.

### Authentication Flow

**Registration:**
- Standard flow sends confirmation email
- Test users (`test.*` or `test+*` emails) bypass confirmation via admin API
- Profile creation handled by database trigger (`on_auth_user_created`)

**Self-healing login:**
- If profile is missing during login, it's created on-the-fly using auth metadata
- Prevents system breakage from auth/database sync issues

**Middleware:**
- Refreshes session on every request
- Protects routes: `/parent`, `/teacher`, `/student`, `/admin`
- Redirects authenticated users away from `/login`, `/register`

## Important Patterns & Constraints

### Safety Constraints

1. **Webhook Idempotency:** Always check if Stripe session already processed before running side effects
2. **Fault Tolerance:** Zoho sync failures don't block enrollment confirmation
3. **Capacity Atomicity:** Use database triggers for capacity counting, never manual increment/decrement
4. **CSV Hardening:** Escape exports with `'` prefix to prevent formula injection
5. **RLS Recursion:** Use `SECURITY DEFINER` functions to check roles without triggering RLS on profiles table

### Common Pitfalls

- Don't manually update `classes.current_enrollment` - let triggers handle it
- Don't create admin operations without using admin client
- Don't skip idempotency checks in webhooks
- Don't automatically process waitlist (race conditions)
- Teachers cannot set schedules - enforce this restriction

### Testing Strategy

**Test file location:** Place in `__tests__` directories relative to source
**Test coverage:** 217+ tests covering unit, integration, and security boundaries
**Mocking:** Supabase, Stripe, and Next.js navigation are globally mocked in `vitest.setup.ts`

**Key test patterns:**
- Test both success and error paths
- Verify authorization checks in server actions
- Use `beforeEach` to reset mocks
- Test idempotency for webhooks
- Verify RLS behavior in integration tests

## Database Migrations

Migrations located in `supabase/migrations/`. Key migrations:

- `001_initial_schema.sql` - Core tables and RLS
- `004_waitlist.sql` - Waitlist feature
- `20240124_class_blocks.sql` - Student blocking system
- `20260122112000_robust_profile_trigger.sql` - Self-healing profiles
- `20260124120000_fix_admin_rls.sql` - RLS recursion fix with SECURITY DEFINER

**Full schema:** `supabase/full_schema.sql` contains complete unified schema.

To apply migrations:
```bash
supabase db push
```

## Environment Variables

Required for development (copy `.env.example` to `.env.local`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # For admin client and webhooks

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=           # From Stripe webhook endpoint

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Key Files & Directories

**Server Actions:** `src/lib/actions/`
- `admin.ts` - Role management, user administration
- `auth.ts` - Registration, login, self-healing profiles
- `classes.ts` - Class CRUD, schedule restrictions
- `enrollments.ts` - Enrollment creation, capacity checks
- `refunds.ts` - Stripe refund processing
- `waitlist.ts` - Waitlist management, position tracking

**Database:** `supabase/`
- `migrations/` - Incremental schema changes
- `full_schema.sql` - Complete database schema

**API Routes:** `src/app/api/`
- `checkout/route.ts` - Stripe checkout session creation
- `webhooks/stripe/route.ts` - Webhook processing with idempotency

**Documentation:** `docs/`
- `TESTING.md` - Testing strategy and frameworks
- `DEPLOYMENT.md` - Vercel deployment guide
- `architecture_decision_document.md` - Architectural decisions

## Live Environments

- **Production:** https://class-registration-system-two.vercel.app
- **Vercel Dashboard:** https://vercel.com/jimeastburns-projects/class-registration-system

## Additional Context

- TDD workflow: Write tests first, run to verify they fail, implement code, verify tests pass
- Database schema changes require migrations in `supabase/migrations/`
- Use Context7 MCP server for enhanced context if available
