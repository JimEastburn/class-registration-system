# Preferred Tech Stack & Implementation Rules

When generating code or UI components for this brand, you **MUST** strictly adhere to the following technology choices.

## Core Frontend Stack

- **Framework:** Next.js 16 (App Router)
- **Library:** React 19.2.0
- **Language:** TypeScript
- **Styling Engine:** Tailwind CSS
- **Component Library:** shadcn/ui (Radix UI primitives)
- **Icons:** Lucide React
- **Form Validation:** Zod

## Implementation Guidelines

### 1. Tailwind Usage

- Use utility classes directly in JSX.
- Utilize the color tokens defined in `design-tokens.json` (e.g., use `bg-primary text-primary-foreground` instead of hardcoded hex values).
- **Dark Mode:** Support dark mode using Tailwind's `dark:` variant modifier.

### 2. Component Patterns

- **Buttons:** Primary actions must use the solid Primary color. Secondary actions should use the 'Ghost' or 'Outline' variants from shadcn/ui.
- **Forms:**
  - Labels must always be placed _above_ input fields.
  - Use standard Tailwind spacing (e.g., `gap-4` between form items).
  - Use Zod schemas for client-side validation logic and error state handling.
- **Layout:** Use Flexbox and CSS Grid via Tailwind utilities for all layout structures.
- **Navigation:** Use Next.js `<Link>` component for internal navigation.
- **Images:** Use Next.js `<Image>` component for optimized asset loading.

### 3. Forbidden Patterns

- Do NOT use jQuery.
- Do NOT use Bootstrap classes.
- Do NOT create new CSS files; keep styles located within component files via Tailwind.
- Do NOT use standard `<a>` tags for internal links; use Next.js `Link`.
