# Design System Document
## Project: Healthcare Appointment & Follow-up Manager

This document defines the premium, modern visual design system for the application. Designed from the perspective of a Senior Product Designer, it rejects standard "Bootstrap" or generic "Material UI" admin panel layouts. Instead, it pulls inspiration from the visual language of **Apple Health** (tactile cards, clear health states), **Stripe** (subtle gradients, high-end typography, glass layouts), **Linear** (high density, dark/light contrast, keyboard-centric precision), and **Raycast/Notion** (clean borders, minimal overlays, floating layouts).

---

## 1. Visual Language & Core Aesthetics

*   **Tactile Depth & Floating Elements**: Use of multiple layered cards with fine, low-opacity borders ($1\text{px}$) and complex soft shadows rather than flat blocks.
*   **Glassmorphism**: Components adapt to the background using backdrop filters (`backdrop-filter: blur(12px)`) and semi-transparent backgrounds to create an organic, lightweight spatial feel.
*   **Minimalist Color Palettes**: Heavy reliance on structural grays, slate, and charcoal, with high-intent primary colors used exclusively for data focal points and CTA actions.
*   **Micro-Interactions**: Hover, focus, and state transitions are smooth and springy (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 2. Design Tokens & Systems

### 2.1 Color System (HSL Palette)

The system supports a native system-level Light and Dark Mode using semantic CSS variables.

#### Light Mode (Stripe/Apple Health-inspired)
*   `--bg-base`: `hsl(210, 20%, 98%)` (Soft white-blue base)
*   `--bg-surface`: `hsla(0, 0%, 100%, 0.7)` (Glass card background)
*   `--bg-overlay`: `hsla(0, 0%, 100%, 0.95)` (Floating modals)
*   `--border-subtle`: `rgba(0, 0, 0, 0.05)` (Hairline borders)
*   `--text-primary`: `hsl(222, 47%, 11%)` (Deep charcoal navy)
*   `--text-secondary`: `hsl(215, 16%, 47%)` (Slate grey)
*   `--brand-primary`: `hsl(250, 84%, 54%)` (Linear Violet)
*   `--brand-success`: `hsl(142, 72%, 29%)` (Apple Health Emerald)
*   `--brand-warning`: `hsl(32, 95%, 44%)` (Warm Amber)
*   `--brand-danger`: `hsl(0, 84%, 60%)` (Coral Crimson)

#### Dark Mode (Linear/Raycast-inspired)
*   `--bg-base`: `hsl(224, 71%, 4%)` (Deep space navy)
*   `--bg-surface`: `hsla(224, 71%, 7%, 0.6)` (Subtle transparent glass)
*   `--bg-overlay`: `hsla(224, 71%, 10%, 0.95)` (Sleek dark command overlays)
*   `--border-subtle`: `rgba(255, 255, 255, 0.06)` (Luminous hairline border)
*   `--text-primary`: `hsl(210, 40%, 98%)` (High-contrast frost white)
*   `--text-secondary`: `hsl(215, 20%, 65%)` (Muted stardust grey)
*   `--brand-primary`: `hsl(250, 95%, 68%)` (Electric Violet)
*   `--brand-success`: `hsl(142, 70%, 45%)` (Bright Emerald)
*   `--brand-warning`: `hsl(38, 92%, 50%)` (Golden Amber)
*   `--brand-danger`: `hsl(0, 90%, 65%)` (Crimson Neon)

### 2.2 Typography System

Using variable typefaces to ensure readability on digital dashboards.
*   **Primary Typeface**: *Inter* or *Outfit* (Google Fonts) - Clean, neutral, high x-height.
*   **Monospace Typeface** (for times, data tables): *JetBrains Mono* or *SF Mono*.
*   **Font Weights**: `Light (300)`, `Regular (400)`, `Medium (500)`, `Semi-Bold (600)`.

```
--font-size-xs: 0.75rem (12px)   | Line Height: 1.5   | Tracking: +0.01em
--font-size-sm: 0.875rem (14px)  | Line Height: 1.5   | Tracking: 0
--font-size-md: 1rem (16px)      | Line Height: 1.6   | Tracking: -0.01em
--font-size-lg: 1.25rem (20px)   | Line Height: 1.4   | Tracking: -0.02em
--font-size-xl: 1.875rem (30px)  | Line Height: 1.2   | Tracking: -0.03em (Display headers)
```

### 2.3 Spacing Scale (8pt Grid System)

Every component matches an `8px` increment to maintain rhythm.
*   `space-1`: `4px`
*   `space-2`: `8px`
*   `space-3`: `12px`
*   `space-4`: `16px` (Default card padding)
*   `space-6`: `24px` (Section gaps)
*   `space-8`: `32px` (Major layout gaps)

---

## 3. UI Component Specifications

### 3.1 Button Design
Buttons avoid default blocks; instead, they feature tactile gradients and soft borders:
*   **Default State**: Rounded corners (`border-radius: 8px`), fine border, soft drop shadow (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`).
*   **Primary CTA**: Deep Violet background, fine internal light border, white typography.
*   **Hover Behavior**: Slight transform upward (`translateY(-1px)`) and a transition overlay change using CSS custom properties.
*   **Micro-Interaction**: `active` scale down (`scale(0.98)`) using a spring transition.

### 3.2 Floating Glass Cards
The core card layout container:
*   **HTML Structure**: Div containing component markup.
*   **Style**:
    *   `background: var(--bg-surface)`
    *   `backdrop-filter: blur(12px)`
    *   `border: 1px solid var(--border-subtle)`
    *   `border-radius: 16px`
    *   `box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03)`
*   **Interaction**: Subtle scaling and glowing border adjustments on hover when card acts as a link.

### 3.3 Minimal Form Controls
No boxed input outlines. Inputs are integrated into the surface backgrounds:
*   **Input Box**: Transparent field nested within a card, bordered on bottom or subtly outlined with `var(--border-subtle)`.
*   **Focus State**: Background shifts subtly, border changes to `var(--brand-primary)` with a glowing, soft shadow (e.g., `box-shadow: 0 0 0 3px rgba(110, 68, 255, 0.15)`).
*   **Error Indication**: The card background shifts with a subtle, warning red horizontal vibration (keyframes wiggle).

### 3.4 Calendar Design
Reject standard block layouts. Draw inspiration from Stripe/Linear:
*   **Week/Month views**: Rendered inside a single glass grid with extremely thin, light borders.
*   **Available Slots**: Rendered as pills that change color on hover.
*   **Booked Slots**: Translucent gray pills that look disabled but allow detail review on hover.
*   **Transitions**: Sliding weeks utilize container clipping mask slide transitions.

---

## 4. Interaction, Transitions & Animations

All transitions are driven by clean, performant CSS animations or Framer Motion transitions.

### 4.1 Page Transitions
*   **Style**: Forward page changes utilize a slide-up-and-fade transition (`translateY(10px) -> translateY(0)` with `opacity: 0 -> 1`).
*   **Timing**: `250ms` using `cubic-bezier(0.16, 1, 0.3, 1)` (spring-like deceleration).

### 4.2 Loading Skeletons
*   Skeletons resemble the actual UI components using gray bounding boxes.
*   **Animation**: `background: linear-gradient(90deg, var(--bg-surface), var(--border-subtle), var(--bg-surface))` looping via a horizontal shift keyframe (`background-position-x: -200%` to `200%`) over `1.5s` for a shimmer effect.

### 4.3 Toast Notifications
*   Toasts slide in from the bottom-right corner.
*   **Design**: Compact, pill-shaped floating card with a brand-success/danger indicator dot, styled with glassmorphism.
*   **Exit**: Shrinks in height and fades out to prevent pushing sibling alerts off-screen.

### 4.4 Modals (Command Overlays)
*   Drawing inspiration from Raycast:
    *   Overlay backdrop uses dark overlay colors (`backdrop-filter: blur(8px)`).
    *   Modal scale starts at `0.95` and pops to `1.0` dynamically with a clean spring bounce.

---

## 5. Portal Layouts & Experiences

---

### 5.1 Patient Dashboard: "My Health Space"

Inspired by Apple Health's daily summaries and Stripe's dashboard clarity.

```
┌────────────────────────────────────────────────────────┐
│  Welcome back, Jane  [Profile Icon]                    │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ AI SYMPTOM PARSER      │  │ HEALTH PATH TIMELINE   │ │
│ │ [ Start Assessment ]   │  │ ◯ Confirm Appointment  │ │
│ └────────────────────────┘  │ ◯ Tomorrow: Reminder   │ │
│ ┌────────────────────────┐  │ ◯ Next Week: Follow-up │ │
│ │ UPCOMING CONSULTATION  │  └────────────────────────┘ │
│ │ Dr. Sarah Jenkins      │  ┌────────────────────────┐ │
│ │ Tomorrow, 10:00 AM     │  │ DAILY REMINDERS        │ │
│ │ [ Reschedule ] [Cancel]│  │ 💊 Lisinopril 8:00 AM   │ │
│ └────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

*   **Primary Focus**: Immediate status awareness (next appointment, daily medication tasks, AI assistant access).
*   **Animated Timeline**: A vertical timeline illustrating past visits, current treatments, and upcoming bookings. Nodes glow dynamically when items are active.
*   **AI Integration Card**: A clean floating card featuring a subtle violet glow in the background. Clicking launches the Raycast-style floating chat window for symptom analysis.

---

### 5.2 Doctor Dashboard: "Clinical Hub"

Designed like Linear—high data density, keyboard-accessible, and dark/light contrast.

```
┌────────────────────────────────────────────────────────┐
│  Dr. Sarah Jenkins | Mon, Jul 12  [Available Slots: 4] │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐ │
│ │ TODAY'S APPOINTMENTS (List view, high density)     │ │
│ │ 09:00 AM  |  John Doe   | Consultation  | [Scribe] │ │
│ │ 10:00 AM  |  Jane Smith | Follow-up     | [Scribe] │ │
│ └────────────────────────────────────────────────────┘ │
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ CLINICAL SCRIBE SHEET   │  │ LEAVE REQUEST PANEL    │ │
│ │ Select patient above to│  │ Block out dates:       │ │
│ │ begin drafting notes.  │  │ [ Calendar Selector ]  │ │
│ └────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

*   **Primary Focus**: Patient queue management and rapid note-taking.
*   **Dynamic Patient Row**: Clicking a patient expands their record row downward with a smooth transition, displaying historical records, current issues, and an input pane for clinical notes.
*   **AI Scribe Assist**: Side panel containing a voice/text entry field that parses notes into formatted medical records on command.

---

### 5.3 Admin Dashboard: "Operations Ledger"

Focuses on high-end charts, system health logs, and administrative provisioning.

```
┌────────────────────────────────────────────────────────┐
│  Operations Center | Live System Health: Optimal       │
├────────────────────────────────────────────────────────┤
│ [ Active Users: 1420 ] [ Bookings: 430 ] [ Queue: 12 ] │
├────────────────────────────────────────────────────────┤
│ ┌────────────────────────┐  ┌────────────────────────┐ │
│ │ APPOINTMENT DYNAMICS   │  │ LIVE COMPLIANCE LOGS   │ │
│ │ (Smooth Area Chart)    │  │ 14:08:03 Dr.S updated  │ │
│ │                        │  │ 14:07:44 Pat.J booked  │ │
│ └────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

*   **Primary Focus**: System-wide performance, load tracking, and security auditing.
*   **Analytics charts**: Built using Recharts. Clean, single-stroke area charts (violet gradient fill) showing booking traffic, database read latencies, and AI pipeline status.
*   **Live Compliance Feed**: A monospace ticker at the bottom of the screen displaying real-time audit logs as they are validated and recorded.
