# Class Registration System

A web-based class registration system for middle and high school students, built with modern web technologies.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Vercel

## Features

- 👨‍👩‍👧‍👦 **Parent Portal**: Manage family members, enroll children in classes. (Accessible by all roles).
- 👨‍🏫 **Teacher Portal**: Create and manage classes, view enrolled students. Includes access to the Parent Portal.
- 👨‍🎓 **Student Portal**: View class schedule, materials, and locations.
- 🛠️ **Admin Portal**: Full system access. Includes access to the Parent Portal.
- 💳 **Payment Processing**: Secure payments via Stripe.
- 🔐 **Authentication**: Email/password with centralized role-based access (Profiles table).

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

## Development

```bash
# Run development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run all tests (Vitest + Playwright)
npm test

# Run Vitest tests only
npm run test:run

# Run Vitest tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (Playwright)
npm run test:e2e
```

## Testing

For more detailed information about our testing strategy, including component, server action, and E2E testing, please refer to the [Testing Guide](./docs/TESTING.md).

### User Roles & Permissions

The system uses the `public.profiles` table as the **single source of truth** for roles. Role changes take effect immediately and are checked on every page load.

### Promoting a User to Admin

1.  **Via Admin Portal**: If you are already an admin, go to `/admin/users` and promote the user.
2.  **Via SQL**: Run the following in the Supabase SQL Editor:
    ```sql
    UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
    ```
3.  **Via Supabase Dashboard**: Update the `role` field in the user's metadata under Authentication, and ensure the `profiles` table is updated to match.

## Documentation

- [System Requirements](./docs/REGISTRATION_SYSTEM_DESCRIPTION.md)
- [Architecture Decisions](./docs/architecture_decision_document.md)
- [API Specification](./docs/api_planning_document.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Task List](./docs/TASKS.md)

## License

MIT