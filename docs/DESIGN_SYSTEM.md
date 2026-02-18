# Design System: Class Registration System

**Inspiration**: Austin Arts + Academic Collaborative (AAC)
**Keywords**: Creative, Academic, Professional, Accessible, Austin-Centric

---

## 1. Color Palette

All colors are defined as CSS custom properties in [`globals.css`](file:///Users/jam/Documents/repos-personal/class-registration-system/src/app/globals.css) and consumed via Tailwind CSS v4's `@theme inline` bridge.

### Primary Colors

| Token                    | Light                                                             | Dark                                                              | Usage                                     |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `--primary`              | ![#4c7c92](https://img.shields.io/badge/-4c7c92-4c7c92) `#4C7C92` | ![#818CF8](https://img.shields.io/badge/-818CF8-818CF8) `#818CF8` | Primary brand, buttons, links, ring focus |
| `--primary-foreground`   | `#FFFFFF`                                                         | `#FFFFFF`                                                         | Text on primary backgrounds               |
| `--secondary`            | ![#9BBFD3](https://img.shields.io/badge/-9BBFD3-9BBFD3) `#9BBFD3` | ![#14B8A6](https://img.shields.io/badge/-14B8A6-14B8A6) `#14B8A6` | Secondary brand, calm accents             |
| `--secondary-foreground` | `#FFFFFF`                                                         | `#FFFFFF`                                                         | Text on secondary backgrounds             |

### Accent & Background

| Token                 | Light                                                             | Dark      | Usage                               |
| --------------------- | ----------------------------------------------------------------- | --------- | ----------------------------------- |
| `--background`        | ![#F8FAF8](https://img.shields.io/badge/-F8FAF8-F8FAF8) `#F8FAF8` | `#0F172A` | Page background (_Limestone Cream_) |
| `--foreground`        | ![#334155](https://img.shields.io/badge/-334155-334155) `#334155` | `#F8FAF8` | Default text color                  |
| `--accent`            | ![#FBBF24](https://img.shields.io/badge/-FBBF24-FBBF24) `#FBBF24` | `#1E293B` | Sunset Gold highlights, CTAs        |
| `--accent-foreground` | `#4C1D95`                                                         | `#F8FAF8` | Text on accent backgrounds          |
| `--muted`             | `#F1F5F9`                                                         | `#1E293B` | Subtle backgrounds, disabled areas  |
| `--muted-foreground`  | `#64748B`                                                         | `#94A3B8` | De-emphasized text                  |

### Surface Colors

| Token                  | Light     | Dark      | Usage                    |
| ---------------------- | --------- | --------- | ------------------------ |
| `--card`               | `#FFFFFF` | `#1E293B` | Card backgrounds         |
| `--card-foreground`    | `#334155` | `#F8FAF8` | Card text                |
| `--popover`            | `#FFFFFF` | `#1E293B` | Dropdown/dialog surfaces |
| `--popover-foreground` | `#334155` | `#F8FAF8` | Popover text             |

### Functional Colors

| Token           | Value                                                             | Usage                      |
| --------------- | ----------------------------------------------------------------- | -------------------------- |
| `--destructive` | ![#EF4444](https://img.shields.io/badge/-EF4444-EF4444) `#EF4444` | Error, destructive actions |
| `--border`      | `#E2E8F0` / `#1E293B`                                             | Borders, dividers          |
| `--input`       | `#E2E8F0` / `#1E293B`                                             | Input field borders        |
| `--ring`        | `#4C7C92` / `#818CF8`                                             | Focus ring color           |

### Chart Colors

Used for data visualizations. Maps to brand palette:

| Token       | Light     | Dark      | Semantic            |
| ----------- | --------- | --------- | ------------------- |
| `--chart-1` | `#4C7C92` | `#818CF8` | Steel Blue / Indigo |
| `--chart-2` | `#9BBFD3` | `#14B8A6` | Sky Blue / Teal     |
| `--chart-3` | `#FBBF24` | `#FBBF24` | Sunset Gold         |
| `--chart-4` | `#334155` | `#94A3B8` | Slate Gray          |
| `--chart-5` | `#10B981` | `#34D399` | Success Green       |

### Enrollment Status Tokens

Token-based system for enrollment badge colors. Each status has `dot`, `bg`, `fg`, and `border` variants defined for both light and dark modes.

| Status         | Dot (Light)                                             | Background | Text      | Border    |
| -------------- | ------------------------------------------------------- | ---------- | --------- | --------- |
| **Pending**    | ![#EAB308](https://img.shields.io/badge/-EAB308-EAB308) | `#FEFCE8`  | `#854D0E` | `#FDE68A` |
| **Confirmed**  | ![#22C55E](https://img.shields.io/badge/-22C55E-22C55E) | `#F0FDF4`  | `#166534` | `#BBF7D0` |
| **Waitlisted** | ![#F97316](https://img.shields.io/badge/-F97316-F97316) | `#FFF7ED`  | `#9A3412` | `#FDBA74` |
| **Cancelled**  | ![#FCA5A5](https://img.shields.io/badge/-FCA5A5-FCA5A5) | `#FFF1F2`  | `#9F1239` | `#FECDD3` |

Consumed via CSS variables in `EnrollmentStatusBadge.tsx`:

```tsx
className =
  'border-[var(--status-pending-border)] bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]';
```

### Role Badge Colors

Each portal view has a distinct color identity used in `RoleBadge.tsx`:

| Role          | Color  | Example Classes                                         |
| ------------- | ------ | ------------------------------------------------------- |
| **Parent**    | Blue   | `bg-blue-500/20 text-blue-400 border-blue-500/30`       |
| **Teacher**   | Green  | `bg-green-500/20 text-green-400 border-green-500/30`    |
| **Student**   | Purple | `bg-purple-500/20 text-purple-400 border-purple-500/30` |
| **Admin**     | Red    | `bg-red-500/20 text-red-400 border-red-500/30`          |
| **Scheduler** | Orange | `bg-orange-500/20 text-orange-400 border-orange-500/30` |

---

## 2. Typography

### Font Stack

Fonts are loaded as **local woff2 files** via `next/font/local` in `layout.tsx`:

| Font           | CSS Variable                        | Usage                       |
| -------------- | ----------------------------------- | --------------------------- |
| **Inter**      | `--font-inter` → `--font-sans`      | All body text, headings, UI |
| **Geist Mono** | `--font-geist-mono` → `--font-mono` | Code, monospace elements    |

Font files are stored in `public/fonts/`.

### Scale

| Level                    | Size                                 | Weight          | Color                           |
| ------------------------ | ------------------------------------ | --------------- | ------------------------------- |
| **H1** (Page Titles)     | `text-5xl` – `text-8xl` (responsive) | Bold (700)      | `--foreground` or white on dark |
| **H2** (Section Headers) | `text-2xl` – `text-3xl`              | Semi-Bold (600) | `--foreground`                  |
| **H3** (Card Titles)     | `text-xl` – `text-2xl`               | `font-semibold` | `--card-foreground`             |
| **Body**                 | `text-base` (16px)                   | Regular (400)   | `--foreground`                  |
| **Small / Label**        | `text-sm` (14px)                     | Medium (500)    | `--muted-foreground`            |
| **XS / Badge**           | `text-xs` (12px)                     | Medium (500)    | Context-dependent               |

---

## 3. Spacing & Radius

Base radius: `--radius: 0.625rem` (10px)

| Token                           | Value                  | Usage                  |
| ------------------------------- | ---------------------- | ---------------------- |
| `--radius-sm`                   | `calc(--radius - 4px)` | Small elements, badges |
| `--radius-md`                   | `calc(--radius - 2px)` | Buttons, inputs        |
| `--radius-lg`                   | `--radius`             | Cards, dialogs         |
| `--radius-xl`                   | `calc(--radius + 4px)` | Large cards            |
| `--radius-2xl` – `--radius-4xl` | +8px, +12px, +16px     | Hero sections          |

---

## 4. UI Components (shadcn/ui)

All components live in `src/components/ui/` and use [shadcn/ui](https://ui.shadcn.com/) with `class-variance-authority` for variant management.

### Component Inventory

| Component            | File                   | Key Variants                                                      |
| -------------------- | ---------------------- | ----------------------------------------------------------------- |
| **Alert**            | `alert.tsx`            | `default`, `destructive`                                          |
| **AlertDialog**      | `alert-dialog.tsx`     | —                                                                 |
| **Avatar**           | `avatar.tsx`           | —                                                                 |
| **Badge**            | `badge.tsx`            | `default`, `secondary`, `destructive`, `outline`                  |
| **Button**           | `button.tsx`           | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` |
| **Card**             | `card.tsx`             | Header, Title, Description, Action, Content, Footer slots         |
| **Checkbox**         | `checkbox.tsx`         | —                                                                 |
| **Dialog**           | `dialog.tsx`           | —                                                                 |
| **DropdownMenu**     | `dropdown-menu.tsx`    | —                                                                 |
| **Form**             | `form.tsx`             | React Hook Form integration                                       |
| **Input**            | `input.tsx`            | —                                                                 |
| **Label**            | `label.tsx`            | —                                                                 |
| **Modal**            | `modal.tsx`            | Custom wrapper                                                    |
| **Resizable**        | `resizable.tsx`        | —                                                                 |
| **ResponsiveTable**  | `responsive-table.tsx` | `ResponsiveTable`, `MobileCardList`                               |
| **ScrollArea**       | `scroll-area.tsx`      | —                                                                 |
| **Select**           | `select.tsx`           | —                                                                 |
| **Separator**        | `separator.tsx`        | —                                                                 |
| **Sheet**            | `sheet.tsx`            | —                                                                 |
| **Skeleton**         | `skeleton.tsx`         | Pulse animation on `bg-accent`                                    |
| **Sonner (Toaster)** | `sonner.tsx`           | Theme-aware, custom icons via Lucide                              |
| **Switch**           | `switch.tsx`           | —                                                                 |
| **Table**            | `table.tsx`            | Header, Body, Footer, Row, Head, Cell, Caption                    |
| **Tabs**             | `tabs.tsx`             | —                                                                 |
| **Textarea**         | `textarea.tsx`         | —                                                                 |
| **ToggleGroup**      | `toggle-group.tsx`     | —                                                                 |
| **Toggle**           | `toggle.tsx`           | —                                                                 |

### Button Variants

| Variant       | Appearance                                   |
| ------------- | -------------------------------------------- |
| `default`     | Solid `--primary` background, white text     |
| `destructive` | Solid `--destructive` background, white text |
| `outline`     | Bordered, transparent bg, accent hover       |
| `secondary`   | Solid `--secondary` background               |
| `ghost`       | Transparent, accent on hover                 |
| `link`        | Underline on hover, `--primary` text         |

Button sizes: `default` (h-9), `sm` (h-8), `lg` (h-10), `icon` (9×9), `icon-sm` (8×8), `icon-lg` (10×10).

Custom `isLoading` prop renders an animated `Loader2` spinner.

### Cards

- `bg-card` background, `text-card-foreground`
- `rounded-xl` corners, `shadow-sm` elevation
- `py-6` vertical padding, `px-6` content padding
- Slot-based architecture: `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`

### Inputs

- Transparent background with `border-input` border
- `rounded-md`, `shadow-xs`
- Focus: `border-ring` + `ring-ring/50` with 3px ring
- Invalid: `ring-destructive/20` + `border-destructive`

---

## 5. Layout Patterns

### Global Layout (`layout.tsx`)

- Fonts applied via CSS variables on `<body>`
- `antialiased` text rendering
- Bottom padding (`pb-24 md:pb-12`) to accommodate the sticky footer
- Global providers: `GlobalLoadingProvider` → `Footer` → `GlobalSpinner` → `Toaster`

### Sticky Footer (`Footer.tsx`)

- Fixed to bottom (`fixed bottom-0`), full width
- `bg-white/95` with `backdrop-blur-sm`
- Contains support email link and Code of Conduct PDF link
- Hidden on `/login` and `/register` routes

### Dashboard Layout

| Component            | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `Sidebar.tsx`        | Desktop navigation with role-specific links |
| `MobileNav.tsx`      | Sheet-based mobile navigation               |
| `Topbar.tsx`         | Header bar with navigation, user menu       |
| `PortalSwitcher.tsx` | Role/view context switching                 |
| `RoleBadge.tsx`      | Color-coded portal view indicator           |

### Hero Page (`page.tsx`)

- Full-viewport dark overlay (`bg-slate-900`) with background image
- Logo in nav, CTA buttons using `bg-amber-200/80` with `hover:bg-accent`
- Responsive hero text: `text-5xl` → `text-8xl`

---

## 6. Loading & Feedback

| Pattern             | Component             | Behavior                                                              |
| ------------------- | --------------------- | --------------------------------------------------------------------- |
| **Global Spinner**  | `global-spinner.tsx`  | Full-screen overlay via `createPortal`, `Loader2` icon, blur backdrop |
| **Button Loading**  | `button.tsx`          | `isLoading` prop disables + shows spinner                             |
| **Skeleton**        | `skeleton.tsx`        | `bg-accent animate-pulse rounded-md` placeholder                      |
| **Toast**           | `sonner.tsx`          | Sonner-based, theme-aware, positioned bottom-right with Lucide icons  |
| **Loading Spinner** | `loading-spinner.tsx` | Inline spinner for local loading states                               |

---

## 7. Icon System

- **Library**: [Lucide React](https://lucide.dev)
- **Default size**: `size-4` (16px) inside buttons/badges
- **Usage**: Inline via named imports (e.g., `Shield`, `GraduationCap`, `Loader2`)

---

## 8. Assets

Images and documents are stored in `public/` and referenced via absolute paths.

| File                                          | Purpose                   |
| --------------------------------------------- | ------------------------- |
| `AAC_FINAL.avif`                              | Logo — used in header/nav |
| `Together_FADE.avif`                          | Hero background image     |
| `AAC - 2025-26 Community Code of Conduct.pdf` | Linked in footer          |
| `fonts/UcC73Fwr...wU.woff2`                   | Inter (sans-serif)        |
| `fonts/or3nQ6H-...bA.woff2`                   | Geist Mono (monospace)    |

---

## 9. Dark Mode

- Activated via `.dark` class on a parent element
- All semantic tokens have dark-mode overrides in `globals.css`
- Enrollment status tokens shift to darker backgrounds with lighter text for contrast
- Chart colors adapt to lighter/more visible variants
- Sonner toaster auto-adapts via `next-themes`
- `@custom-variant dark (&:is(.dark *))` is used for Tailwind dark variant scoping
