# Tabibi Design System & Implementation Guide

> **Purpose:** This document serves as the single source of truth for the Tabibi User Interface. Provide this file to any AI model to replicate the Tabibi design aesthetic, component behavior, and code structure exactly.

---

## 1. Core Identity & Principles

*   **App Name:** Tabibi (طبيبي)
*   **Domain:** Healthcare SaaS (Clinic Management System)
*   **Primary Language:** Arabic (RTL - Right-to-Left)
*   **Design Philosophy:**
    *   **Clean & Clinical:** ample whitespace, distinct borders, trustworthy colors.
    *   **Mobile-First:** optimized for touch targets on tablets/phones.
    *   **Accessible:** High contrast text, clear focus states.
    *   **Performance:** Minimal animations, fast load times.

---

## 2. Technical Stack

*   **Framework:** React (Vite)
*   **Styling:** Tailwind CSS (v4)
*   **UI Library:** Shadcn UI (Headless Radix primitives + Tailwind)
*   **Icons:** Lucide React
*   **Fonts:** Google Fonts (Tajawal, Amiri)

---

## 3. Design Tokens (The "DNA")

### Color Palette (Tailwind CSS Variables)

The system uses HSL values for dynamic theming (Light/Dark mode).

| Token | Light Mode (HSL) | Dark Mode (HSL) | Description |
| :--- | :--- | :--- | :--- |
| **Primary** | `187 85% 35%` | `187 85% 43%` | Main brand color (Teal/Cyan). Used for primary buttons, active states. |
| **Secondary** | `224 76% 48%` | `224 76% 60%` | Accent blue. Used for secondary actions, info highlights. |
| **Destructive** | `0 84.2% 60.2%` | `0 72% 51%` | Red. Critical actions (Delete, Cancel). |
| **Success** | `142 76% 36%` | `142 76% 42%` | Green. Confirmations, completed states. |
| **Warning** | `38 92% 50%` | `38 92% 55%` | Orange/Yellow. Alerts, pending states. |
| **Background** | `0 0% 100%` | `222.2 47% 11%` | Page background. |
| **Foreground** | `222.2 47.4% 11.2%` | `210 40% 98%` | Primary text color. |
| **Muted** | `210 40% 96%` | `217.2 32.6% 18%` | Backgrounds for secondary content/disabled states. |
| **Border** | `214.3 31.8% 85%` | `217.2 32.6% 28%` | Border color for inputs, cards, dividers. |

### Typography

*   **Primary Font (UI):** `Tajawal`, sans-serif
*   **Secondary Font (Formal):** `Amiri`, serif
*   **Scale:**
    *   `text-xs`: 0.75rem (12px) - Badges, metadata
    *   `text-sm`: 0.875rem (14px) - Body text, inputs
    *   `text-base`: 1rem (16px) - Standard reading
    *   `text-lg`: 1.125rem (18px) - Section headers
    *   `text-xl`: 1.25rem (20px) - Page titles

### Radius & Spacing

*   **Global Radius:** `--radius: 0.5rem` (8px)
*   **Container Padding:** `1rem` (16px) on mobile, scaling up.
*   **Grid System:** Standard Tailwind grid/flex patterns.

---

## 4. Component Implementation Patterns

When generating code, use these specific Tailwind class combinations to match Tabibi.

### Buttons (`<Button />`)

```jsx
// Base
"inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:pointer-events-none disabled:opacity-50"

// Variants
default: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-sm"
secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]"
outline: "border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground active:bg-accent/80"
destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] shadow-sm"

// Sizes
default: "h-10 px-4 py-2 rounded-[var(--radius)]"
sm: "h-8 px-3 text-xs rounded-[var(--radius)]"
icon: "h-10 w-10 rounded-[var(--radius)]"
```

### Cards (`<Card />`)

```jsx
// Container
"rounded-xl border bg-card text-card-foreground shadow"

// Header
"flex flex-col space-y-1.5 p-6"

// Content
"p-6 pt-0"

// Footer
"flex items-center p-6 pt-0"
```

### Inputs & Forms

```jsx
// Input Field
"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

// Label
"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
```

### Tables (Responsive)

*   **Desktop:** Standard `<table>` with `border-collapse`.
*   **Mobile (<768px):** Transform into "Card View".
    *   Rows become cards: `display: block`, `border: 1px solid var(--border)`, `margin-bottom: 1rem`.
    *   Cells become rows: `display: block`, `padding: 0.25rem 0`.
    *   Headers are hidden, data labels added via `::before` pseudo-element content.

---

## 5. Layout Structure (`DoctorLayout`)

The main application wrapper consists of:

1.  **Sidebar (Navigation):**
    *   Collapsible on desktop, Drawer on mobile.
    *   Grouped Items: "الرئيسية" (Main), "العيادة والمرضى" (Practice), "الإدارة" (Management).
    *   Active State: `bg-primary text-primary-foreground`.
    *   Inactive State: `hover:bg-muted`.

2.  **Header:**
    *   Contains Page Title, Notifications Bell, User Profile.
    *   Sticky top or fixed.

3.  **Main Content:**
    *   Wrapped in `<main className="container ...">`.
    *   Responsive max-widths applied via CSS.

---

## 6. Iconography Guide

Use `lucide-react` icons. Common mappings:

*   **Dashboard:** `LayoutDashboard`
*   **Patients:** `Users`
*   **Appointments:** `Calendar`
*   **Settings:** `Settings`
*   **Finance:** `CreditCard`
*   **Notifications:** `Bell`
*   **Edit:** `Pencil`
*   **Delete:** `Trash2`
*   **Add/Create:** `Plus`

---

## 7. Writing Prompt for AI

*To make another AI generate Tabibi-compliant code, paste this:*

> "You are an expert React developer working on the 'Tabibi' Healthcare SaaS.
> The system is RTL (Arabic).
> Use Tailwind CSS v4 with the following config:
> - Primary Color: HSL(187, 85%, 35%) (Teal)
> - Radius: 0.5rem
> - Font: 'Tajawal'
> Use Lucide React for icons.
> Components must follow Shadcn UI patterns (cva/cn utilities).
> Inputs should have a height of h-9 (36px).
> Buttons should have active:scale-[0.98] for tactile feel.
> Ensure all layouts are responsive: Cards on mobile, Tables on desktop."
