# NEXUS — Design System

This document is the single source of truth for visual consistency across
NEXUS. Every screen — Super Admin, Department Admin, Teacher, Student,
Parent, Exam Dept — pulls from these same tokens. If a component needs a
color, radius, or spacing value that isn't defined here, that's a signal to
add it here first, not to pick something one-off in the component file.

---

## 1. Concept

NEXUS sits between two different jobs, and the design has to do both
without feeling like two different products:

- **A working dashboard** — dense, fast, data-heavy (attendance grids,
  marks entry, fee ledgers). Needs clarity and speed, not decoration.
- **A system of record** — hall tickets, result cards, receipts, question
  papers. These get printed, signed, filed. They need to read as
  *official*, not like a screenshot of a web app.

Rather than treat these as unrelated, one family (IBM Plex) covers both
through its different optical variants — see Typography below. This is
the throughline: the same type family signals "dashboard" in its Sans
cut and "official document" in its Serif cut, so the product feels like
one coherent system even as the artifact changes.

---

## 2. Color

Base palette — ink and brass, not the generic warm-cream-and-terracotta
or near-black-and-neon defaults. Ink conveys institutional trust; brass
is the one warm, deliberate accent (used sparingly — primary actions,
key highlights, nothing else).

| Token | Hex | Use |
|---|---|---|
| `ink-900` | `#16213E` | Primary — nav, headers, primary buttons |
| `ink-700` | `#2B3A5C` | Hover/active state of ink elements |
| `brass-500` | `#C98A3E` | Accent — primary CTAs, key highlights only |
| `brass-600` | `#AD7430` | Accent hover state |
| `surface-50` | `#F6F7F9` | Page background |
| `surface-0` | `#FFFFFF` | Card/panel background |
| `border` | `#E2E4E9` | Dividers, input borders, card borders |
| `text-900` | `#1A1D29` | Primary text (never pure black) |
| `text-500` | `#5B6072` | Secondary text, placeholders, metadata |

Semantic colors — used consistently for status, never invented per
feature. Every status enum in the schema maps to one of these five:

| Semantic | Hex | Maps to (schema states) |
|---|---|---|
| `success` | `#2F6B4F` | Present, Passed, Confirmed, Approved, Accepted, Success |
| `danger` | `#A6342A` | Absent, Failed, Rejected, Withdrawn |
| `warning` | `#B7791F` | Pending, Draft, Late submission |
| `info` | `#3E6E9E` | Submitted, Locked, Enrolled (in-progress states) |
| `neutral` | `#6B7280` | Upload (not yet acted on), inactive/archived |

Role tags — small, quiet identifiers (avatar ring, a 3px left border on
a card, a chip next to a name) so a person can tell at a glance whose
record they're looking at in a mixed list. These are accents, never a
full re-theme of the UI per role:

| Role | Hex |
|---|---|
| Super Admin | `#5B3A73` (plum) |
| Department Admin | `#1F6F6F` (teal) |
| Teacher | `#C98A3E` (brass — reuses the accent) |
| Student | `#2B4C7E` (lighter ink) |
| Parent | `#5B6B8C` (slate) |
| Exam Dept | `#8C4A3A` (rust) |

**Rule:** brass is the only saturated warm color in the system. If
something feels like it needs another bright accent, it's a sign to use
a semantic or role color instead, scoped to its actual meaning.

---

## 3. Typography

One family, three jobs — IBM Plex, chosen because its engineering
heritage (built for a technical institution) fits an engineering
college's own identity, and its three cuts map naturally onto the
product's three kinds of content:

- **IBM Plex Sans** — all UI chrome: nav, buttons, forms, table text,
  body copy. This is what 95% of the product uses.
- **IBM Plex Serif** — formal/printed artifacts only: hall tickets,
  result cards, marksheets, receipts, certificates. Signals "this is an
  official document," not a dashboard screenshot.
- **IBM Plex Mono** — anything that's an identifier or exact value:
  `instituteId` (STKIT0001), roll numbers, timestamps, amounts, receipt
  numbers, subject codes. Monospace makes these scannable and signals
  "this is data, not prose."

Type scale (Tailwind `text-*` mapping):

| Role | Size | Weight | Tailwind |
|---|---|---|---|
| Page title | 28px / 1.2 | 600 | `text-3xl font-semibold` |
| Section heading | 20px / 1.3 | 600 | `text-xl font-semibold` |
| Card title | 16px / 1.4 | 600 | `text-base font-semibold` |
| Body | 14px / 1.6 | 400 | `text-sm` |
| Metadata / caption | 12px / 1.5 | 400 | `text-xs text-text-500` |
| Data/mono (IDs, amounts) | 13px / 1.5 | 500 | `font-mono text-[13px] font-medium` |

Line length: cap body text containers at `max-w-prose` (~75ch) wherever
paragraphs appear (notices, descriptions) — tables and forms are exempt,
since they need to use available width.

**Avoid:** all-caps labels, single-word-in-color headline accents,
unnecessary eyebrow labels above every heading. If a heading needs
context, say it in the subheading, not a tracked-out label above it.

---

## 4. Layout

Standard shape: fixed left sidebar (role-aware nav) + top bar (breadcrumb,
search, account) + content area. Left-aligned content throughout — this
is a working tool, not a marketing page, so nothing should be centered
except empty states and auth screens.

```
┌──────────┬──────────────────────────────────────────┐
│          │  Top bar: breadcrumb        [search] [👤] │
│  NEXUS   ├──────────────────────────────────────────┤
│          │                                            │
│  Nav     │   Page title                    [+ New]   │
│  (role-  │   ─────────────────────────────────────   │
│  scoped) │                                            │
│          │   Content (table / form / cards)          │
│          │                                            │
└──────────┴──────────────────────────────────────────┘
```

- Sidebar width: `w-64`, collapses to icon-only `w-16` below `lg`.
- Content max-width: `max-w-7xl` for table-heavy views, `max-w-3xl` for
  single-record forms (profile, create-subject, etc.) — forms shouldn't
  stretch edge-to-edge on wide screens.
- Grid/spacing: stick to Tailwind's default spacing scale (4px steps) —
  no arbitrary `px-[13px]` values. Section spacing is `space-y-6`;
  within-card spacing is `space-y-4`; form field spacing is `space-y-3`.
- **Mobile-Friendly Views**: All screens meant for the **Parent** and **Student** portals MUST be fully responsive and optimized for mobile devices. Unlike the admin dashboards (which are typically viewed on large monitors), students and parents will primarily access NEXUS via their phones. Use responsive grid layouts (`grid-cols-1 md:grid-cols-2`), collapsible cards, and horizontal-scrolling tables (`overflow-x-auto`) to ensure usability on small screens.

---

## 5. Elevation & Radius (avoiding the generic SaaS-card look)

The most common AI-generated tell is one border-radius and one drop
shadow applied to every surface regardless of hierarchy. NEXUS uses a
deliberate 3-level system instead:

| Level | Radius | Shadow | Used for |
|---|---|---|---|
| Flat | `rounded-md` (6px) | none, `border border-border` only | Cards, table containers, inputs — the default resting state |
| Raised | `rounded-lg` (8px) | `shadow-sm` on hover only | Clickable cards (e.g. a subject tile), dropdowns |
| Overlay | `rounded-xl` (12px) | `shadow-lg` | Modals, sheets, popovers — things floating above the page |

Badges/pills (status indicators) use `rounded-full` — the one place full
rounding is correct, since it's a label not a container.

**Rule:** a flat card never has a shadow at rest. If everything in a view
has the same shadow, that's the generic-SaaS tell to check for.

---

## 6. Components

**Buttons**
- Primary: `bg-ink-900 text-white hover:bg-ink-700` — one per view/section, the single most important action.
- Accent (rare, high-stakes only): `bg-brass-500 text-white hover:bg-brass-600` — e.g. "Confirm Elective Choice," "Submit Final Marks." Not for routine actions.
- Secondary: `border border-border bg-surface-0 text-text-900 hover:bg-surface-50`.
- Destructive: `bg-danger text-white` — delete, reject, withdraw actions. Always paired with a confirm step.
- All buttons: `rounded-md px-4 py-2 text-sm font-medium`, visible focus ring (`focus-visible:ring-2 focus-visible:ring-ink-700 focus-visible:ring-offset-2`).

**Status badges** — `rounded-full px-2.5 py-0.5 text-xs font-medium`, background at 12% opacity of the semantic color, text at full semantic color (e.g. `bg-success/10 text-success`). One component, reused for every status enum in the schema — never a bespoke color per feature.

**Tables** (the most-used component in this product)
- Header row: `bg-surface-50 text-text-500 text-xs font-medium uppercase tracking-wide` — this is the one place tracked-out caps is appropriate, since it's a true column label, not decoration.
- Row: `border-b border-border hover:bg-surface-50`, no zebra striping (it fights with status badges for attention).
- Numeric/ID columns (roll number, instituteId, marks, amounts): `font-mono text-right` where the value is a number, `font-mono text-left` for ID strings.

**Forms**
- Inputs: `rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700`.
- Label above field, not placeholder-as-label: `text-sm font-medium text-text-900 mb-1`.
- Error state: `border-danger` + `text-danger text-xs mt-1` helper text explaining what's wrong and how to fix it — never just "Invalid input."

**Empty states** — an invitation to act, not a mood. Pattern: one line stating what's missing, one line (or button) saying what to do next. E.g. "No subjects yet. Create your first subject to start building this class's curriculum." Never a generic "Nothing here" with decorative illustration.

---

## 7. Motion

Minimal and purposeful — this is a dashboard, not a landing page.

- Page/section transitions: none. Instant is correct for a data tool.
- One deliberate moment: a successful submit/save gets a brief
  (150-200ms) checkmark or toast slide-in — this is the one place
  motion earns its keep, because it confirms something changed.
  content, use `transition-colors duration-150` — nothing fancier.
- Respect `prefers-reduced-motion` — disable the save-confirmation
  animation and fall back to an instant state change plus the toast.

---

## 8. Accessibility baseline

Non-negotiable floor, not an enhancement pass:
- Text contrast meets WCAG AA against its background (`text-900` on
  `surface-50`/`surface-0` passes; verify any new color pairing before
  shipping it).
- Every interactive element has a visible `focus-visible` ring — never
  `outline-none` without a replacement.
- Status is never color-only: a badge always carries a text label
  ("Present" / "Absent"), never just a colored dot, for colorblind users
  and for printed hall tickets/marksheets where color may not reproduce.
- Reduced motion respected (see above).

---

## 9. Tailwind config

Drop this into `tailwind.config.js` so every token above is available as
a utility class, rather than hand-rolling hex values in components:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#16213E',
          700: '#2B3A5C',
        },
        brass: {
          500: '#C98A3E',
          600: '#AD7430',
        },
        surface: {
          0: '#FFFFFF',
          50: '#F6F7F9',
        },
        border: '#E2E4E9',
        text: {
          900: '#1A1D29',
          500: '#5B6072',
        },
        success: '#2F6B4F',
        danger: '#A6342A',
        warning: '#B7791F',
        info: '#3E6E9E',
        neutral: '#6B7280',
        role: {
          superadmin: '#5B3A73',
          deptadmin: '#1F6F6F',
          teacher: '#C98A3E',
          student: '#2B4C7E',
          parent: '#5B6B8C',
          examdept: '#8C4A3A',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        serif: ['"IBM Plex Serif"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
};
```

Load the three IBM Plex cuts (Sans, Serif, Mono) via Google Fonts or
self-hosted `@font-face` — only pull the weights actually used (400,
500, 600 for Sans; 400 for Serif; 400, 500 for Mono) to keep the bundle
light.

---

## 10. Quick reference — what NOT to do

- Don't give every card the same shadow — see Elevation table (Section 5).
- Don't invent a new status color per feature — route every status
  through the 5 semantics in Section 2.
- Don't use brass for anything routine — it's the one accent, spend it
  deliberately.
- Don't center dashboard content — left-align; centering is for auth/
  empty states only.
- Don't use all-caps for anything except true table column headers.
- Don't color-code status without a text label alongside it.
