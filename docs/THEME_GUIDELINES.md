# International Medical Software – UI Theme Guidelines

Theme aligned with the logo: **golden yellow box**, **multicolored globe** (blue, green, orange). Modern, clean, enterprise, international medical software feel.

---

## 1. Color Palette (Hex)

| Role | Hex | Usage |
|------|-----|--------|
| **Navy 950** | `#0a0f1a` | Page background (deep base) |
| **Navy 900** | `#0f172a` | Card/section background |
| **Navy 800** | `#1e293b` | Table header, inputs, dropdowns |
| **Navy 700** | `#334155` | Borders, dividers |
| **Gold 500** | `#e5a00d` | Primary buttons, accents, header glow |
| **Gold 600** | `#c9900b` | Primary button hover |
| **Gold 400** | `#f0b429` | Subtle highlights (e.g. company name) |
| **Accent Blue** | `#38bdf8` | Info, links |
| **Accent Teal** | `#2dd4bf` | Success secondary, badges |
| **Accent Orange** | `#fb923c` | Small accents only |
| **Success** | `#22c55e` | Success alerts, positive states |
| **Error** | `#ef4444` | Error alerts, destructive |
| **Error Soft** | `#f87171` | Error text on dark |

**Avoid:** Bright yellow as large background; overly playful gradients.

---

## 2. Tailwind Theme (summary)

Defined in `tailwind.config.ts`:

- **Colors:** `navy-950` … `navy-600`, `gold-400` … `gold-700`, `accent-blue`, `accent-teal`, `accent-orange`, `success`, `error`, `error-soft`
- **Font:** `font-sans` → Inter (via `--font-inter`), fallback Segoe UI, system-ui
- **Border radius:** `rounded-theme` (0.5rem), `rounded-theme-lg` (0.75rem)
- **Shadows:** `shadow-theme`, `shadow-theme-md`, `shadow-theme-glow`, `theme-header-glow` (gold bottom line)

Use these tokens instead of arbitrary values for consistency.

---

## 3. Layout & Components

### Background
- **Page:** `bg-navy-950`
- **Cards/sections:** `theme-card` or `bg-navy-900/80` + `border-navy-700` + `rounded-theme-lg` + `shadow-theme-md`

### Header
- Logo on **left**
- Company name: **INTERNATIONAL MEDICAL SOFTWARE** (uppercase, `text-gold-400`, smaller)
- Subtitle/title: **Data Dictionary** (uppercase, bold, white)
- **Bottom border:** subtle gold glow (`theme-header-glow` or `border-b-2 border-gold-500/80`)

### Buttons
- **Primary:** `bg-gold-500` → hover `bg-gold-600`, text `text-navy-950`, `font-semibold`
- **Secondary:** `bg-navy-800` + `border border-gold-500/50`, hover `bg-navy-700` + `border-gold-500/80`

### Tables
- **Header:** `bg-navy-800`, `text-white`, `font-semibold`
- **Accent:** `border-b-2 border-gold-500/80` under header row
- **Body:** `bg-navy-900/50`, `divide-y divide-navy-700`
- **Row hover:** `hover:bg-navy-800/60`, `transition-colors`
- **Gridlines:** use `border-navy-700` for borders/dividers

### Notifications (alerts)
- **Success:** Green – border/ring `success`, background `bg-navy-900/95` + `ring-success/20`
- **Error:** Soft red – `border-error/40`, `text-error-soft`, `ring-error/20`
- **Info:** Blue – use `accent-blue` for icon/border (when needed)
- Style: `rounded-theme-lg`, `shadow-theme-md`, consistent padding and icon size

### Inputs & dropdowns
- **Input:** `bg-navy-800`, `border-navy-600`, focus `border-gold-500` + `ring-gold-500/50`
- **Dropdown:** `bg-navy-900`, `border-navy-600`; selected option `text-gold-400`; hover `bg-navy-700`

---

## 4. Typography
- **Font:** Inter (or Segoe UI–style sans-serif), clean and professional
- **Headings:** Bold, clear hierarchy; main title uppercase where specified
- **Body:** `text-slate-100` / `text-slate-300` on dark; muted `text-slate-400`

---

## 5. Visual Feel
- **Trustworthy, global, data-driven**, high-quality enterprise product
- **Dark base**, **gold accents** (no overload of yellow)
- **Card-based** sections, **medium rounded corners**, **subtle shadows**
- **Consistent spacing** and alignment; avoid clutter

---

## 6. Example Snippets

**Primary button (Export):**
```jsx
<button className="rounded-theme bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-600 disabled:opacity-50">
  Export
</button>
```

**Secondary button (Prev/Next):**
```jsx
<button className="rounded-theme border border-gold-500/50 bg-navy-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:border-gold-500/80">
  Prev
</button>
```

**Header with logo and glow:**
```jsx
<header className="theme-header-glow mb-8 border-b border-navy-700 pb-6">
  <div className="flex items-center gap-4">
    <img src="/header-logo.png" alt="" className="h-14 w-14 rounded-theme-lg" />
    <div>
      <p className="text-sm font-semibold uppercase tracking-wide text-gold-400">
        International Medical Software
      </p>
      <p className="text-xl font-bold uppercase text-slate-100">Data Dictionary</p>
    </div>
  </div>
</header>
```

**Table header row:**
```jsx
<thead className="bg-navy-800">
  <tr className="border-b-2 border-gold-500/80">
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-white">...</th>
  </tr>
</thead>
```

Use these patterns across the app for a consistent, logo-aligned enterprise theme.
