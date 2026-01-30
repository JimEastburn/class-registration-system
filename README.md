# Class Registration System

A web-based class registration system for middle and high school students, built with modern web technologies.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Accounting**: Zoho Books (Integration)
- **Deployment**: Vercel

## Features

- 👨‍👩‍👧‍👦 **Parent Portal**: Manage family members, enroll children in classes.
- 👨‍🏫 **Teacher Portal**: Manage own classes AND their own family members (Dual-Role support).
- 👨‍🎓 **Student Portal**: View class schedule, materials, and locations.
- 🛠️ **Admin Portal**: Full system access, users management, and data exports.
- **Class Schedule Portal**: Schedule classes
- 💳 **Reliable Payments**: Secure Stripe integration with idempotency safeguards.
- 📊 **Accounting Sync**: Automatic synchronization of payments to Zoho Books.

## Safety & Integrity Constraints

The system implements mission-critical safeguards to ensure data integrity:

- **Webhook Idempotency**: Prevents double-billing or redundant syncing from duplicate Stripe events.
- **Fault Tolerance**: Registration completes even if external services (Zoho) are temporarily unavailable.
- **Capacity Hand-off**: Atomically managed class capacity and waitlist transitions.
- **CSV Hardening**: Data exports are hardened against spreadsheet formula injection.
- **Privilege Revocation**: Immediate permission lockout upon role demotion.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd class-registration-system
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local` with your Supabase and Stripe credentials.

4. Run the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── parent/        # Parent dashboard
│   │   ├── teacher/       # Teacher dashboard
│   │   ├── student/       # Student dashboard
│   │   └── admin/         # Admin dashboard
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── classes/           # Class-related components
│   ├── family/            # Family member components
│   └── payments/          # Payment components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── supabase/          # Supabase client configuration
│   └── actions/           # Server actions
└── types/                 # TypeScript type definitions
```

## Testing

```bash
# Run all tests (Vitest + Playwright)
npm test

# Run Vitest tests only (currently 217 passing)
npm run test:run

# Run Vitest tests in watch mode
npm run test:watch
```

For more detailed information, refer to the [Testing Guide](./docs/TESTING.md).

## Deployment

The application is deployed to Vercel with the following environments:

| Environment    | URL                                              |
| -------------- | ------------------------------------------------ |
| **Production** | https://class-registration-system-two.vercel.app |
| **Preview**    | Created per-branch on push or via CLI            |

### Quick Commands

```bash
npx vercel          # Deploy preview/staging
npx vercel --prod   # Deploy to production
npx vercel env pull # Sync env vars from Vercel
```

For detailed setup instructions, see the [Deployment Guide](./docs/DEPLOYMENT.md).

## Documentation

- [System Requirements](./docs/REGISTRATION_SYSTEM_DESCRIPTION.md)
- [Architecture Decisions](./docs/architecture_decision_document.md)
- [API Specification](./docs/api_planning_document.md)
- [Zoho Integration Flow](./docs/zoho_integration_flow.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Task List](./docs/TASKS.md)

## License

MIT
