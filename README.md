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

- 👨‍👩‍👧‍👦 **Parent Portal**: Manage family members, enroll children in classes
- 👨‍🏫 **Teacher Portal**: Create and manage classes, view enrolled students
- 👨‍🎓 **Student Portal**: View class schedule, materials, and locations
- � **Admin Portal**: Full system access - manage users, classes, enrollments, payments
- �💳 **Payment Processing**: Secure payments via Stripe
- 🔐 **Authentication**: Email/password with role-based access

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
│   └── family/            # Family member components
├── hooks/                 # Custom React hooks
├── lib/
│   └── supabase/          # Supabase client configuration
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
```

## Creating an Admin User

Administrators have full access to manage all users, classes, enrollments, and payments.

### Option 1: Via Supabase Dashboard

1. Register a new user through the application at `/register`
2. Go to your Supabase project dashboard
3. Navigate to **Authentication** → **Users**
4. Find the user and click to view details
5. Under **user_metadata**, update the `role` field to `"admin"`

### Option 2: Via SQL (Supabase SQL Editor)

```sql
-- Update a user's role to admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### Option 3: Via Existing Admin

If you already have an admin user, they can promote other users:
1. Log in as admin
2. Go to `/admin/users`
3. Find the user and click **Actions** → **Set as Admin**

## Documentation

- [System Requirements](./docs/REGISTRATION_SYSTEM_DESCRIPTION.md)
- [Architecture Decisions](./docs/architecture_decision_document.md)
- [API Specification](./docs/api_planning_document.md)
- [Task List](./docs/TASKS.md)

## License

MIT