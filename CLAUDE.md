# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack (Next.js 16)
npm run build            # Production build
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without writing

# Testing
npm test                 # Run Vitest in watch mode
npm run test:run         # Run all Vitest tests once (47+ test files)
npm run test:coverage    # Generate coverage report
npm run test:integration # Run integration tests
npm run test:api         # Test API endpoints
npm run test:e2e         # Run Playwright E2E tests
npm run test:e2e:ui      # Run Playwright with UI

# Database
npm run db:types         # Generate TypeScript types from Supabase schema

# Deployment
npx vercel               # Deploy preview
npx vercel --prod        # Deploy to production (manual promotion recommended)
npx vercel env pull      # Sync environment variables from Vercel
```

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 16 with App Router, Turbopack, and Server Components
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Payments**: Stripe with Checkout Sessions and Webhooks
- **Accounting**: Zoho Books (async sync)
- **Email**: Resend for transactional emails
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Hosting**: Vercel with two-environment workflow (Preview → Production)
- **Testing**: Vitest (unit/integration), Playwright (E2E), Testing Library (components)

### Role-Based Access Control (RBAC)

The system has **six roles** with specific permissions:

- `parent` - Default role, manages family members and enrollments
- `teacher` - Creates/manages classes, can also act as parent (dual-role)
- `student` - Limited access, tied to family_member records
- `admin` - System administration, can switch to parent view (dual-role)
- `class_scheduler` - Can set class schedules and manage master calendar
- `super_admin` - "God Mode" - can access ALL portals and bypass RLS constraints

**Key constraints:**

- Teachers **cannot** set class schedules (forced to "To Be Announced")
- Only class_schedulers and admins can set day/block schedules
- Class schedulers cannot be teachers (conflict of interest)
- Admins cannot access class scheduler view (separation of concerns)
- Super admins can access all views via global portal switcher
- Admin, teacher, and class_scheduler users can switch to parent view
- Roles stored in `profiles.role` (database) - this is the single source of truth

**Authorization layers:**

1. Database RLS (Row-Level Security) using `SECURITY DEFINER` functions
2. Application-level checks in server actions via `profiles.role` (NOT user_metadata)
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

- **Don't** manually update `classes.current_enrollment` - let database triggers handle it
- **Don't** create admin operations without using admin client (`src/lib/supabase/admin.ts`)
- **Don't** skip idempotency checks in webhooks (always check if `transaction_id` already processed)
- **Don't** automatically process waitlist (use manual promotion to avoid race conditions)
- **Don't** let teachers set schedules - enforce "To Be Announced" for teacher-created classes
- **Don't** use `user_metadata.role` for authorization - always fetch from `profiles.role` (single source of truth)
- **Don't** skip reading files before editing - understand existing patterns first
- **Don't** create commits without explicit user request
- **Don't** add unnecessary abstractions - keep code simple and direct
- **Don't** use blocks 5-6 or Monday/Friday in schedules - these are not allowed
- **Don't** forget to test currency conversions - database stores dollars, Stripe uses cents
- **Don't** allow class publishing until day and block are set by admin

### Testing Strategy

**Philosophy**: Fakes over Mocks - prioritize stateful in-memory implementations over generic mocks to test behavior/state rather than interactions.

**Test coverage**: 47+ test files covering:
- **16 files**: Unit tests for server actions (auth, classes, enrollments, family, profile, admin, scheduler, dashboard, refunds, payments, blocking, etc.)
- **4 files**: Unit tests for logic (scheduling conflicts, student linking, role separation, currency formatting)
- **3 files**: Unit tests for utilities (validations, utils, email templates)
- **8 files**: Component tests (forms, buttons, dialogs)
- **1 file**: Component data helpers (NextClassCard)
- **4 files**: API route tests (checkout, webhook, export, invoice)
- **3 files**: Integration tests (enrollment flow, admin flow, waitlist flow)
- **2 files**: Test infrastructure (Stripe fake, Supabase fake)
- **6 files**: E2E tests with Playwright (auth, enrollment, family, teacher, export)

**Test file location**: Place in `__tests__` directories relative to source

**Key test infrastructure**:
- **Supabase Fake**: In-memory database implementation (`src/__integration__/fakes/supabase.ts`)
- **Stripe Fake**: In-memory payment ledger for testing payment flows
- **Next.js Navigation**: Mocked in `vitest.setup.ts` for redirect testing

**Key test patterns**:
- Test both success and error paths
- Verify authorization checks in server actions
- Use `beforeEach` to reset fakes/mocks
- Test idempotency for webhooks
- Verify RLS behavior in integration tests
- Test currency conversion (dollars ↔ cents) thoroughly
- Validate Zod schemas comprehensively

**See**: `docs/TESTING.md` for detailed testing guide and `docs/MANUAL_TESTING.md` for comprehensive manual test checklist

## Database Migrations

Migrations located in `supabase/migrations/` (36 migration files total). Key migrations include:

- `001_initial_schema.sql` - Core tables and RLS
- `004_waitlist.sql` - Waitlist feature
- `20240124_class_blocks.sql` - Student blocking system
- `20260122112000_robust_profile_trigger.sql` - Self-healing profiles
- `20260124120000_fix_admin_rls.sql` - RLS recursion fix with SECURITY DEFINER
- Various other migrations for triggers, capacity management, schedule validation, etc.

**Full schema:** `supabase/full_schema.sql` contains complete unified schema.

To apply migrations:

```bash
supabase db push
```

## Environment Variables

Required for development (copy `.env.example` to `.env.local`):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For admin client and webhooks

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret  # From Stripe webhook endpoint

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# Zoho Books (Accounting Integration)
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_ORGANIZATION_ID=your_zoho_organization_id
ZOHO_INVOICE_SUBJECT="AAC Fall '26 Registration"
```

**Note**: `BYPASS_EMAIL_CONFIRMATION` can be set to `true` in development to skip email verification (not in `.env.example` but supported).

## Key Files & Directories

**Server Actions:** `src/lib/actions/`

- `admin.ts` - Role management, user administration, system stats
- `audit.ts` - Audit log tracking for admin actions
- `auth.ts` - Registration, login, self-healing profiles, password reset
- `blocking.ts` - Teacher blocking students from classes
- `classes.ts` - Class CRUD, publishing, schedule restrictions
- `dashboard.ts` - Dashboard data (stats, recent payments, upcoming classes)
- `enrollments.ts` - Enrollment creation, capacity checks, cancellation
- `export.ts` - CSV export for admin (classes, users, enrollments)
- `family.ts` - Family member CRUD operations
- `invites.ts` - Student invite system (if applicable)
- `materials.ts` - Class materials/syllabus management
- `payments.ts` - Payment status updates, transaction logs
- `profile.ts` - User profile updates, view switching
- `refunds.ts` - Stripe refund processing, waitlist promotion
- `scheduler.ts` - Class scheduler stats, unscheduled classes
- `settings.ts` - System settings management
- `student.ts` - Student-specific actions, schedule viewing
- `waitlist.ts` - Waitlist management, position tracking, manual promotion

**Database:** `supabase/`

- `migrations/` - Incremental schema changes
- `full_schema.sql` - Complete database schema

**API Routes:** `src/app/api/`

- `checkout/route.ts` - Stripe checkout session creation
- `export/route.ts` - CSV export endpoint (admin-only)
- `health/route.ts` - Health check endpoint for monitoring
- `invoice/route.ts` - Invoice generation and download
- `webhooks/stripe/route.ts` - Webhook processing with idempotency (handles checkout.session.completed, checkout.session.expired, charge.refunded)

**Documentation:** `docs/`

- `TESTING.md` - Testing strategy, frameworks, and best practices
- `MANUAL_TESTING.md` - Comprehensive manual testing checklist with automation coverage matrix
- `DEPLOYMENT.md` - Vercel deployment guide (two-environment workflow)
- `RELEASE_PROCESS.md` - Production promotion procedure
- `PRODUCTION_SETUP.md` - Production environment setup
- `architecture_decision_document.md` - Detailed architectural decisions and rationale
- `DESIGN_SYSTEM.md` - Color palette, typography, component inventory
- `REGISTRATION_SYSTEM_DESCRIPTION.md` - Original system requirements
- `CALENDAR_DESIGN_PLANNING.md` - Calendar/schedule design decisions
- `SEED_DATA.md` - Database seeding instructions
- `TASKS.md` - Project task tracking
- `VERCEL_BROWSER_AUTOMATION.md` - Vercel deployment automation
- `ZOHO_REFUND_SYNC.md` - Zoho Books refund sync details
- `api_planning_document.md` - API design planning
- `profile_view_logic.md` - Multi-role portal switching logic
- `zoho_integration_flow.md` - Zoho Books integration architecture

## Live Environments

| Environment           | URL                                                                           | Branch       | Database                                   |
| --------------------- | ----------------------------------------------------------------------------- | ------------ | ------------------------------------------ |
| **Preview (Staging)** | https://class-registration-system-git-master-jimeastburns-projects.vercel.app | `master`     | `class-registration-system`                |
| **Production**        | https://class-registration.austinaac.org                                      | `production` | `production-AAC-class-registration-system` |
| **Vercel Dashboard**  | https://vercel.com/jimeastburns-projects/class-registration-system            | —            | —                                          |

**Deployment Workflow**: Push to `master` → Auto-deploy to Preview → Manual "Promote to Production" via Vercel Dashboard

**See**: `docs/DEPLOYMENT.md` for detailed deployment guide and `docs/RELEASE_PROCESS.md` for production promotion procedure

## UI/UX & Design System

The application uses a comprehensive design system documented in `docs/DESIGN_SYSTEM.md`:

- **Tailwind CSS v4**: Modern CSS with `@theme inline` bridge, zero-config
- **shadcn/ui**: Copy-paste accessible components (Dialog, Select, Form, Card, etc.)
- **Color Palette**: Austin-centric theme with Steel Blue (#4C7C92), Sky Blue (#9BBFD3), Sunset Gold (#FBBF24)
- **Typography**: Inter (sans-serif) and Geist Mono (monospace) loaded as local woff2 files
- **Dark Mode**: Supported via `.dark` class with semantic color tokens
- **Components**: 25+ UI components in `src/components/ui/`
- **Icons**: Lucide React for all iconography
- **Loading States**: Global spinner, skeleton loaders, button loading states
- **Toasts**: Sonner with theme-aware styling

**Role-specific colors**: Parent (Blue), Teacher (Green), Student (Purple), Admin (Red), Scheduler (Orange)

## Business Constraints & Schedule Configuration

- **Allowed Days**: Tuesday, Thursday, Wednesday only (no Monday/Friday)
- **Allowed Blocks**: 1-4 only (blocks 5-6 removed)
- **Schedule Conflicts**:
  - Tuesday/Thursday classes share the same block space (conflict detection handles this)
  - Room conflicts detected across all schedule configs
  - Student schedule conflicts prevent double-booking
- **Teacher Restrictions**:
  - Teachers cannot set schedules (forced to "To Be Announced")
  - Only class_schedulers and admins can assign day/block
- **Class Publication**: Classes cannot be published until day and block are set by an admin

**See**: `docs/CALENDAR_DESIGN_PLANNING.md` for detailed schedule design decisions

## Additional Context

- **TDD workflow**: Write tests first (Red), implement code (Green), refactor (Blue) - see `GEMINI.md`
- **Database schema changes**: Always create migrations in `supabase/migrations/`
- **Code of Conduct**: `AAC - 2025-26 Community Code of Conduct.pdf` linked in footer and registration
- **Git workflow**: Feature branches → PR → Preview deployment → Merge to `master` → Manual promotion to production
- **Super Admin**: Can switch between all portal views (Admin, Teacher, Scheduler, Parent) via global view switcher
- **Self-healing**: Missing profiles are automatically created on login to prevent auth/database sync issues
- **Email-based linking**: Students are linked to parents via email (no invite codes)
- **Idempotency**: Stripe webhook events use `transaction_id` to prevent double-processing
- **Async accounting**: Zoho Books sync happens asynchronously; failures don't block enrollments
