# Project Guidelines

Use Context7 MCP server.
Reminder that database schema changes may need to have a migration script created in the `db/migrations` directory.
Write tests for all new code first, run the tests to make sure they fail, then write the code to make the tests pass. Run the tests again to make sure they pass.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript, React 19.2.0
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Validation**: Zod

## Context7 Library IDs

Use these pre-resolved Library IDs when querying Context7 to ensure version compatibility. Run `resolve-library-id` if these are missing or outdated.

| Library          | Version         | Context7 ID                   |
| ---------------- | --------------- | ----------------------------- |
| **Next.js**      | 16 (App Router) | `/vercel/next.js`             |
| **React**        | 19              | `/facebook/react`             |
| **Tailwind CSS** | v4              | `/websites/tailwindcss`       |
| **Supabase**     | Latest          | `/supabase/supabase-js`       |
| **Stripe**       | Latest          | `/stripe/stripe-node`         |
| **Zod**          | v4              | `/colinhacks/zod`             |
| **Shadcn/UI**    | Latest          | `/shadcn-ui/ui`               |
| **Resend**       | Latest          | `/resend/resend-node`         |
| **Zoho Books**   | v3 API          | `/websites/zoho_books_api_v3` |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, register pages
│   ├── (dashboard)/       # Role-based dashboards
│   │   ├── parent/        # Parent portal
│   │   ├── teacher/       # Teacher portal
│   │   ├── student/       # Student portal
│   │   ├── admin/         # Admin portal
│   │   └── class-scheduler/ # Class Scheduler portal
│   └── api/               # API routes (checkout, webhooks)
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── admin/             # Admin action components
│   ├── auth/              # Auth forms
│   ├── classes/           # Class & enrollment components
│   ├── dashboard/         # Shared dashboard layout
│   ├── family/            # Family member components
│   ├── payments/          # Payment components
│   └── class-scheduler/   # Class Scheduler components
├── lib/
│   ├── supabase/          # Supabase client config
│   ├── actions/           # Server actions
│   └── validations.ts     # Zod schemas
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## Documentation

- [System Requirements](./docs/REGISTRATION_SYSTEM_DESCRIPTION.md)
- [Architecture Decisions](./docs/architecture_decision_document.md)
- [API Specification](./docs/api_planning_document.md)
- [Zoho Integration Flow](./docs/zoho_integration_flow.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Testing Guide](./docs/TESTING.md)
- [Manual Testing Guide](./docs/MANUAL_TESTING.md)
- [Design System](./docs/DESIGN_SYSTEM.md)
- [Task List](./docs/TASKS.md)

> [!NOTE]
> Skills are available in the `.agent/skills` directory.

## Development Commands

```bash
npm run dev    # Start dev server (Turbopack)
npm run build  # Production build
npm run lint   # Run ESLint
npm run test   # Run all tests

```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # For webhooks

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## User Roles

| Role      | Access                                                      |
| --------- | ----------------------------------------------------------- |
| `parent`  | Manage family, enroll children, pay fees                    |
| `teacher` | Create/manage classes, view students, AND manage own family |
| `student` | View schedule and class details                             |
| `admin`   | Full system access, data exports, AND manage own family     |

## Safety & Integrity Constraints

The following business logic safeguards are strictly enforced:

- **Webhook Idempotency**: Stripe `checkout.session.completed` events are checked against the database. Duplicate webhooks skip side-effects (Sync/Email) to prevent redundant billing.
- **Fault Tolerance**: Zoho sync failures do not block enrollment confirmation. Data is preserved for later manual or automated retry.
- **Capacity Hand-off**: Class capacity is atomically checked. Vacated spots (cancellations/deletions) correctly release capacity for the waitlist.
- **CSV Hardening**: All administrative data exports are escaped using `'` to prevent spreadsheet formula injection.
- **Privilege Revocation**: Role demotions (Admin/Teacher/Class Scheduler -> Parent) immediately revoke all elevated action access.
