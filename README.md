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
- 💳 **Payment Processing**: Secure payments via Stripe
- 🔐 **Authentication**: Email/password, magic links, OAuth

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
│   │   └── student/       # Student dashboard
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

## Documentation

- [Architecture Decisions](./docs/architecture-decision-document.md)
- [API Specification](./docs/api-planning-document.md)

## License

MIT