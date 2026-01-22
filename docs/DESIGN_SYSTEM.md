# Design System: Class Registration System

**Inspiration**: Austin Arts + Academic Collaborative (AAAC)
**Keywords**: Creative, Academic, Professional, Accessible, Austin-Centric.

## 1. Color Palette

### Primary Colors
Used for main actions, headers, and brand identity.
- **Deep Indigo**: `#4C1D95` (Academic, Professional) - *Similar to a "Riverbat" purple but distinct.*
- **Vibrant Teal**: `#0D9488` (Creative, Energetic) - *A nod to the arts and creativity.*

### Secondary & Accents
Used for highlights, call-to-actions (secondary), and visual interest.
- **Limestone Cream**: `#F8FAF8` (Backgrounds, Soft) - *Evocative of Austin limestone.*
- **Sunset Gold**: `#FBBF24` (Accents, Warnings, Highlights) - *Warmth and energy.*
- **Slate Gray**: `#334155` (Text, Borders, neutral UI elements).

### Functional Colors
- **Success**: `#10B981` (Emerald Green)
- **Error**: `#EF4444` (Red)
- **Warning**: `#F59E0B` (Amber)
- **Info**: `#3B82F6` (Blue)

## 2. Typography

**Font Family**: `Inter` (Sans-serif) - Clean, modern, and highly readable.

### Scale
- **H1 (Page Titles)**: 32px - 40px, Bold (700), Deep Indigo.
- **H2 (Section Headers)**: 24px - 30px, Semi-Bold (600), Slate Gray.
- **H3 (Card Titles)**: 20px - 24px, Medium (500).
- **Body**: 16px, Regular (400), Slate Gray.
- **Small/Label**: 14px, Medium (500), Muted Gray.

## 3. UI Components

### Buttons
- **Primary**: Solid Deep Indigo background, White text. Rounded corners (`rounded-md`).
- **Secondary**: Transparent background, Deep Indigo border & text.
- **Destructive**: Error Red background, White text.

### Cards
- White background with subtle shadow (`shadow-md` or `shadcn` default).
- Rounded corners (`rounded-lg`).
- Clean padding (p-6).

### Inputs
- White background.
- Slate gray border (light).
- Usage of `shadcn/ui` default input styles but tinted to match the slate theme.

## 4. Assets

Images and icons are stored in the `public/` directory and can be referenced directly (e.g., `/image-name.ext`).

### Available Images
- **`Together FADE.avif`**: A high-resolution image suitable for hero backgrounds or banners.
- **Icons**: `globe.svg`, `file.svg`, `window.svg`, `next.svg`, `vercel.svg`.
