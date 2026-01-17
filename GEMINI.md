# Project Guidelines

Use Context7 MCP server if that helps you.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Validation**: Zod

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, register pages
│   ├── (dashboard)/       # Parent, teacher, student dashboards
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Feature-specific components
├── lib/supabase/          # Supabase client config
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript types
```

## Documentation

- [Architecture Decisions](./docs/architecture_decision_document.md)
- [API Specification](./docs/api_planning_document.md)
- [Task List](./docs/TASKS.md)
- [System Requirements](./REGISTRATION_SYSTEM_DESCRIPTION.md)

## Development Commands

```bash
npm run dev    # Start dev server (Turbopack)
npm run build  # Production build
npm run lint   # Run ESLint
```

## Environment Variables

Copy `.env.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`