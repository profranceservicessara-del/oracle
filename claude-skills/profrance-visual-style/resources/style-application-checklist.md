# ProFrance Style Application Checklist

> Checklist operacional passo-a-passo para aplicar o estilo visual ProFrance a outro SaaS com segurança.
> Source: [`docs/profrance-visual-transfer-kit.md`](./profrance-visual-transfer-kit.md).
>
> Explicações em português. Prompts, recipes e instruções de implementação em inglês.

---

## 1. Purpose

Este checklist serve para **aplicar apenas o sistema visual ProFrance** a outro produto. Não é guia de migração de dados, lógica ou backend.

Escopo:
- ✅ Copiar **sistema visual** (cores, tipografia, espaçamento, sombras, componentes).
- ✅ Copiar **padrões UI/UX** (hierarquia, mobile-first, motion).
- ✅ Copiar **estilo de interação** (hover, focus, transitions, status pills).

Fora de escopo (NUNCA copiar):
- ❌ Dados de negócio (clientes, pedidos, valores, transações).
- ❌ Lógica de negócio (workflows, regras financeiras, automações).
- ❌ Schema de banco / migrations.
- ❌ Implementação Supabase (queries, RLS, RPC).
- ❌ Workflows operacionais privados.
- ✅ Preservar **arquitetura do sistema alvo** (rotas, fetching, auth, deploy).

---

## 2. Before starting

Antes de tocar qualquer arquivo do alvo, peça ao dono do projeto para definir:

```text
TARGET PROJECT READINESS — must be filled before any edit

[ ] Stack:                     e.g. Next.js 15 / Remix / Astro / Vite + React
[ ] Tailwind version:          v3 / v4
[ ] Localhost URL:              NEVER assume — must be confirmed (http://localhost:3000? 5173? other?)
[ ] Architecture style:        App router / Pages router / file-based / custom
[ ] Modules in scope:          dashboard / finance / orders / settings / …
[ ] Database:                  Supabase / Prisma / Drizzle / firestore / …
                               (DO NOT TOUCH — only need awareness of types)
[ ] Deployment:                Vercel / Netlify / Fly / Cloudflare / self-hosted
[ ] Visual direction:          which ProFrance areas to mirror (full / partial)
[ ] Authentication boundary:   which pages are public, which behind auth
[ ] Pages to polish FIRST:     ordered list, safest first
[ ] Files allowed to modify:   exact globs (e.g. src/components/ui/**, src/app/**.css)
[ ] Files forbidden to modify: exact globs (e.g. src/lib/db/**, src/server/**, **/api/**)
[ ] Build commands:            npm run build / pnpm build / yarn build
[ ] TypeScript command:        npx tsc --noEmit / pnpm tsc / yarn tsc
[ ] Lint command (optional):   npm run lint / pnpm lint
```

### Hard rules
- **Never assume localhost automatically.** Confirm port and URL with the owner before starting any dev server.
- **Never modify business logic during visual transfer.** Visual sprint is visual-only.
- **Never add dependencies without explicit approval.**
- **Never run destructive commands** (`rm -rf`, `git reset --hard`, force-push) without confirmation.
- **Never disable tests, hooks, or type checks** to make build pass.

---

## 3. Phase 0 — Target system audit

Antes de qualquer edição, audite o alvo. Read-only.

### Audit checklist

```text
APP SHELL
[ ] Layout root file identified (e.g. RootLayout / _app.tsx / __root.tsx)
[ ] Page background style noted
[ ] Sidebar present? Style? Dark or light?
[ ] Topbar present? Sticky? Backdrop blur?
[ ] Safe-area handling for PWA?

DASHBOARD
[ ] Current hierarchy mapped (sections in order)
[ ] Number of KPI cards in hero
[ ] Duplicated sections detected
[ ] Urgency expression mapped (color, badge, count)

NAVIGATION
[ ] Nav item active state classes
[ ] Nav item inactive state classes
[ ] Mobile drawer behavior
[ ] Group labels

CARDS
[ ] Default card pattern (radius, border, shadow, ring)
[ ] KPI card pattern
[ ] Alert/warning card pattern
[ ] Empty state pattern

BUTTONS
[ ] Primary
[ ] Secondary
[ ] Ghost
[ ] Destructive
[ ] Icon-only

BADGES
[ ] Status pill pattern
[ ] Color usage (semantic vs decorative)
[ ] Count badges

FORMS
[ ] Input pattern
[ ] Label pattern
[ ] Required field indicator
[ ] Error state
[ ] Submit loading state

DIALOGS
[ ] Modal shell
[ ] Side drawer (if any)
[ ] Backdrop style

TABLES / LISTS
[ ] Row padding
[ ] Hover state
[ ] Dividers
[ ] Amount alignment
[ ] Mobile transform (table → card?)

MOBILE
[ ] 375px horizontal overflow?
[ ] 390px horizontal overflow?
[ ] Touch targets ≥ 44px?
[ ] Inputs text-base (anti iOS zoom)?
[ ] Safe-area respected?

DESIGN TOKENS
[ ] Color tokens defined
[ ] Typography scale
[ ] Spacing scale
[ ] Radius scale
[ ] Shadow scale

HOVER / FOCUS
[ ] Hover lift used? Where?
[ ] Focus ring visible?
[ ] Focus-visible used?

STATES
[ ] Loading: spinner / skeleton / none?
[ ] Empty: compact / generic / missing?
[ ] Error: banner / toast / inline?

ADVANCED SYSTEMS
[ ] Z-index collisions detected?
[ ] Toast system exists? Style?
[ ] Tooltip/popover system?
[ ] Print styles?
[ ] Charts library?
[ ] Keyboard shortcuts?
```

### Audit output required

```text
1. Current visual problems (bullets, max 20)
2. High-risk files (touching them = breaking business logic)
3. Safest first page to polish (low data dependency, high visual impact)
4. Visual-only implementation plan (phased)
5. Files to modify (explicit globs)
6. Files to AVOID (explicit globs)
7. Pre-existing TypeScript errors (baseline before changes)
8. Pre-existing lint warnings (baseline)
```

> **Do not modify anything in Phase 0.** Audit + report only.

---

## 4. Phase 1 — Add visual tokens

### Checklist

```text
[ ] Identify existing color system (CSS vars / Tailwind theme / inline)
[ ] Map ProFrance tokens to target brand if brand override is required
[ ] Add or update CSS variables ONLY in approved files (e.g. globals.css)
[ ] Do not mass-replace hex literals across components blindly
[ ] If target has dark mode, add light-mode tokens without breaking dark mode
[ ] Preserve target brand color if owner requires
[ ] Document mapping decisions in a token map markdown
[ ] Run tsc + build after each token batch
```

### Token map

```text
ProFrance token        →  Target brand token (default if no override)
--brand-navy           →  --brand-primary    (#002D72)
--brand-navy-700       →  --brand-primary-700 (#003a94)
--brand-blue           →  --brand-secondary  (#4F5FB8)
--brand-violet         →  --brand-accent     (#6D5FBF)
--surface              →  --surface          (#FFFFFF)
--surface-muted        →  --surface-muted    (#F1F3FA)
--surface-elevated     →  --surface-elevated (#FFFFFF, lift via shadow)
--surface-page         →  --surface-page     (#F7F8FC)
--border-soft          →  rgba(15,23,42,0.07)
--border-strong        →  rgba(15,23,42,0.11)
--text-primary         →  #0F172A  (slate-900)
--text-secondary       →  #475569  (slate-600)
--text-muted           →  #94A3B8  (slate-400)
--success              →  #047857  (emerald-700)
--warning              →  #B45309  (amber-700)
--danger               →  #BE123C  (rose-700)
--info                 →  #1D4ED8  (blue-700)
--recurring            →  #0F766E  (teal-700)
--logistics-orange     →  #C2410C  (orange-700)
```

### Return expected

```text
1. Token map applied (table)
2. Files changed (exact paths, max 3 expected: globals.css, tailwind.config, optional theme file)
3. Visual notes if available (which surfaces now use which tokens)
4. Confirmation: "No data logic changed."
5. tsc + build PASS
```

---

## 5. Phase 2 — Page shell and background

### Checklist

```text
[ ] Add soft premium page background bg-[#F7F8FC]
[ ] Ensure cards use white elevated surface (bg-white)
[ ] Avoid heavy gradients outside hero and sidebar
[ ] Preserve target layout structure (don't restructure routes)
[ ] Preserve data fetching (don't move queries)
[ ] Apply mobile-safe page padding p-4 sm:p-6 lg:p-8
[ ] Apply desktop max-width only if target uses centered content
[ ] Topbar sticky top-0 z-20 backdrop-blur-xl bg-white/90
[ ] Sidebar single dark surface (if target has sidebar)
```

### Tailwind direction (English)

```html
<!-- Page shell -->
<main class="min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8">
  <div class="space-y-6">{children}</div>
</main>

<!-- Topbar (sticky white with blur) -->
<header class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">…</header>

<!-- Content wrapper if max-width desired -->
<div class="mx-auto max-w-[1400px]">{children}</div>
```

### Avoid
- Pintar página inteira em gradient.
- Backgrounds saturados sólidos.
- Cards transparentes sobre fundo colorido (sem profundidade).

---

## 6. Phase 3 — Card system conversion

### Checklist

```text
[ ] Identify all pastel block cards and convert to white premium
[ ] Add ring-1 ring-black/5 to every white card
[ ] Add shadow-sm base; hover:shadow-md only if clickable
[ ] Use top accent rail (h-[2px]) only when card represents a category/urgency
[ ] Use icon bubble (bg-{tone}-50 ring-1 ring-{tone}-100) for semantic identity
[ ] Keep card heights consistent within a grid row
[ ] Apply hover:-translate-y-0.5 only to clickable cards
[ ] Remove visual clutter (extra badges, redundant icons, decorative shapes)
[ ] Preserve card data and handlers — DO NOT TOUCH onClick / state
```

### Card type → recipe map

| Tipo | Recipe |
|------|--------|
| Default | `rounded-2xl bg-white shadow-sm ring-1 ring-black/5` |
| KPI | `rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5` + `text-2xl font-bold tabular-nums text-[#002D72]` |
| Action | `rounded-2xl border border-slate-200/70 bg-white shadow-sm` + accent rail rose top |
| Warning | `rounded-2xl border border-amber-200/60 bg-amber-50/60 ring-1 ring-amber-100` |
| List | `overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5` + `divide-y divide-slate-50` |
| Dashboard section | `relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm` + accent rail by category |
| Empty state | `rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-black/5` + icon bubble |

### Avoid
- Cards pastel sólidos (`bg-blue-100`, `bg-purple-200`, etc.).
- `shadow-2xl` em card de lista.
- Borders pesadas (`border-2`).
- Hover lift em card não clicável.

---

## 7. Phase 4 — Button system

### Checklist

```text
[ ] Define Primary (navy bg-[#002D72] text-white)
[ ] Define Secondary (border-slate-200 bg-white text-slate-700)
[ ] Define Ghost (bg-transparent text-[#002D72] hover:bg-[#002D72]/10)
[ ] Define Destructive (rose-50/rose-500 icon-only OR rose text button; NEVER full-red bg)
[ ] Define Icon button (h-7 w-7 rounded-lg)
[ ] Mobile primary buttons: full-width (w-full sm:w-auto)
[ ] Ensure disabled state: opacity-50 cursor-not-allowed + title explaining
[ ] Ensure loading state: keep label "Saving…" + inline spinner (never hide button)
[ ] Ensure focus-visible:ring-2 focus-visible:ring-[#002D72]/30
[ ] ONE primary action per area — enforce by code review
```

### Recipes (paste-ready)

```html
<!-- Primary -->
<button class="inline-flex items-center justify-center rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#003a94] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D72]/30 active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">Save</button>

<!-- Secondary -->
<button class="inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98]">Cancel</button>

<!-- Ghost -->
<button class="rounded-[1.25rem] bg-transparent px-5 py-2.5 text-sm font-semibold text-[#002D72] hover:bg-[#002D72]/10">More</button>

<!-- Destructive icon-only -->
<button aria-label="Delete" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 active:scale-[0.97]"><svg class="h-3.5 w-3.5">…</svg></button>

<!-- Mobile full-width -->
<button class="block w-full rounded-[1.25rem] bg-[#002D72] py-3 text-sm font-semibold text-white sm:w-auto sm:px-5 sm:py-2.5">Continue</button>

<!-- Loading -->
<button disabled class="inline-flex items-center gap-2 rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white opacity-80 cursor-wait">
  <svg class="h-3.5 w-3.5 animate-spin">…</svg> Saving…
</button>
```

### Avoid
- 2+ primary buttons competing in the same view.
- Neon / gradient buttons.
- Destructive with full-red bg.
- Icon-only buttons without aria-label.

---

## 8. Phase 5 — Badge and status system

### Checklist

```text
[ ] Map target statuses to semantic badges (active=emerald, late=rose, etc.)
[ ] Use calm semantic colors only (emerald/amber/rose/blue/teal/slate)
[ ] Use bg-{tone}-50 + text-{tone}-700 + ring-1 ring-{tone}-200
[ ] Avoid full saturated status blocks (no bg-rose-600 fills)
[ ] Keep labels readable (text-[10px] or text-[11px], font-semibold)
[ ] Use icons sparingly (h-3 w-3, only when adds info)
[ ] Never color-only status — always pair with text or icon
```

### Badge type → recipe

| Tipo | Tom | Recipe |
|------|-----|--------|
| Neutral | slate | `bg-slate-100 text-slate-600` |
| Info | blue | `bg-blue-50 text-blue-700 ring-1 ring-blue-100` |
| Success | emerald | `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200` |
| Warning | amber | `bg-amber-50 text-amber-700 ring-1 ring-amber-200` |
| Danger | rose | `bg-rose-50 text-rose-700 ring-1 ring-rose-200` |
| Overdue | rose | same + count badge `font-bold tabular-nums` |
| Payment | emerald (paid) / amber (pending) / rose (late) | semantic |
| Delivery | blue (scheduled) / amber (soon ≤2d) / emerald (done) | semantic |
| Operational | slate (default) / blue (in progress) / emerald (done) | semantic |
| Finance | navy (value) / emerald (income) / rose (expense) | navy currency style |

### Base class

```html
class="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
```

---

## 9. Phase 6 — Dashboard hierarchy

### Checklist

```text
[ ] Reorganize dashboard into 5 sections in this order:
    1. Hero / command summary (≤4 KPIs in navy gradient)
    2. Action required (rose accent rail + count badge; HIDE if count===0)
    3. Today / current activity (blue accent rail)
    4. Next 24h / upcoming (amber accent rail; date chips amber if ≤2 days)
    5. Secondary insights (slate accent rail; charts, averages, history)

[ ] Reduce number overload — max 4 KPIs in hero
[ ] Remove duplicated sections (e.g. "Latest orders" + "Today's orders" identical)
[ ] Show urgent items first
[ ] Keep urgency calm — rose only in count + accent rail, never paint full card red
[ ] Prioritize action over decoration — buttons/alerts before charts
[ ] Do NOT add inline actions unless explicitly approved
[ ] Do NOT change data queries during visual sprint
[ ] Keep links to existing routes
```

### Output expected

```text
1. New dashboard hierarchy (before → after diff)
2. Removed duplicate visual blocks list
3. Confirmation: "Data logic preserved; only visual reorganization."
4. Desktop screenshot description
5. Mobile 375px screenshot description
```

---

## 10. Phase 7 — Forms and dialogs

### Checklist

```text
INPUTS
[ ] Standardize labels: text-sm font-semibold text-slate-700, ABOVE input
[ ] Standardize input: rounded-2xl border-slate-200 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10
[ ] Standardize select: same shell, appearance-none, custom chevron
[ ] Standardize textarea: same shell, rows="4" default
[ ] Required field: asterisk * in rose text-rose-500 in label

VALIDATION
[ ] Validate ON BLUR (after user leaves field)
[ ] Re-validate on submit
[ ] Format errors (email/CPF) on change AFTER first blur (touched flag)
[ ] Server errors: banner at form top + field-level when backend maps
[ ] Field error: text-xs text-rose-600 + icon h-3 w-3 below input
[ ] aria-invalid="true" + aria-describedby on invalid inputs

SUBMIT
[ ] Loading: keep label "Saving…" + spinner inline (never hide button)
[ ] Disabled: opacity-50 cursor-not-allowed + title
[ ] Success: confirmation banner emerald OR toast

DIALOG
[ ] Backdrop: bg-slate-950/40 backdrop-blur-sm
[ ] Modal card: max-w-sm rounded-[1.75rem] for confirm
[ ] Side drawer: max-w-lg for long forms with sticky footer
[ ] Mobile: max-h-[60vh] + overflow-y-auto + safe-area bottom
[ ] Cancel secondary on LEFT (or below on mobile)
[ ] Primary action on RIGHT (or above on mobile)
[ ] Esc closes overlay ALWAYS
```

### Do NOT
- Change submit handlers.
- Change form schema.
- Change API payloads.
- Hide server errors only in console — always surface in UI.
- Move validation logic between client/server.

---

## 11. Phase 8 — Lists, rows, tables

### Checklist

```text
[ ] Standardize row padding: px-5 py-3.5 (catalog/clients) or px-4 py-4 (orders/finance)
[ ] Amount alignment: text-right + tabular-nums + font-bold text-[#002D72]
[ ] Badge placement: center for table, right for mobile card
[ ] Hover state: hover:bg-slate-50/60 OR hover:bg-[#F9F7EC]/60 (finance only)
[ ] Dividers: divide-y divide-slate-50 (light) or divide-slate-100
[ ] Empty state: compact rounded-2xl py-14 with icon bubble
[ ] Mobile transform: hidden md:table + block md:hidden (cards)
[ ] No horizontal overflow on mobile (verify scrollWidth === clientWidth)
[ ] Preserve sorting / filtering logic — only restyle UI elements
[ ] Preserve row action handlers (onClick, onDelete, onEdit)
```

### Table → mobile card pattern

```html
<!-- Desktop table -->
<table class="hidden w-full text-sm md:table">
  <thead class="bg-slate-50/60">
    <tr><th class="text-[11px] uppercase tracking-wide text-slate-400">…</th></tr>
  </thead>
  <tbody class="divide-y divide-slate-50">
    <tr class="hover:bg-slate-50/60"><td>…</td></tr>
  </tbody>
</table>

<!-- Mobile stacked cards -->
<div class="divide-y divide-slate-50 md:hidden">
  <div class="px-4 py-3.5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">Name</p></div>
      <span class="…badge…">Status</span>
    </div>
  </div>
</div>
```

---

## 12. Phase 9 — Advanced visual systems

Sistemas avançados são opcionais para a transferência inicial. Para cada um:

```text
[ ] Audit current state in target
[ ] Document desired visual behavior (using transfer kit §13 as reference)
[ ] Implement ONLY if approved
[ ] Do NOT mix behavior implementation with visual transfer — split in separate prompt
```

### Per-system mini checklist

**Toast / notification**
- [ ] Provider exists? Style consistent? If full-saturated → restyle to white elevated + rail.
- [ ] Container `z-[100]` `aria-live="polite"`.
- [ ] Variants: success/error/warning/info/loading/persistent.

**Dark mode**
- [ ] Currently supported? If no → recommend NOT to implement now.
- [ ] If yes → ensure new tokens have dark counterparts.

**Z-index scale**
- [ ] Current collisions? Adopt scale 0→100 (sidebar 20, dropdown 30, popover 40, tooltip 50, modal 60-70, drawer 80, command 90, toast 100).

**Sidebar gradient**
- [ ] Sidebar exists? Apply 5 radial + 1 linear navy stack from transfer kit §13.4.

**Form error UX**
- [ ] Validation timing on blur + submit? Server errors in banner top?

**Tooltip / popover**
- [ ] Component exists? Z-index correct (tooltip 50, popover 40)? Mobile fallback?

**Charts**
- [ ] Library used? Colors token-aligned? **Multi-currency rule: never sum different currencies.**

**Print/PDF**
- [ ] Print stylesheet? Hides sidebar/topbar/shadows? Page breaks managed?

**Keyboard shortcuts**
- [ ] Cmd+K command menu? Esc closes? `?` help overlay? Focus-safe?

---

## 13. Phase 10 — Mobile QA

### Test viewports
- 375 × 812 (iPhone SE/8)
- 390 × 844 (iPhone 12/13/14)
- 768 × 1024 (iPad)
- 1280 × 800 (desktop baseline)
- 1920 × 1080 (large desktop)

### Verify checklist

```text
[ ] No horizontal overflow at 375px (document.documentElement.scrollWidth === clientWidth)
[ ] No horizontal overflow at 390px
[ ] Cards stack cleanly (grid-cols-1 default)
[ ] Dialogs fit viewport (max-h-[60vh] + overflow-y-auto)
[ ] Internal dialog scroll works (no body scroll lock breaking)
[ ] Section headers wrap (flex-wrap items-center gap-3)
[ ] Buttons remain tappable (no overlap with safe-area)
[ ] Touch targets ≥ 44px (verify .touch-target class or min-h-[44px])
[ ] KPI numbers readable (text-2xl minimum on mobile)
[ ] Tables convert to cards (hidden md:table + block md:hidden present)
[ ] No giant empty vertical blocks (empty states compact py-14)
[ ] Inputs text-base (prevents iOS zoom)
[ ] Sidebar = drawer with backdrop blur on mobile
[ ] Topbar sticky + safe-area top respected
[ ] Modal backdrop scroll lock works
```

---

## 14. Phase 11 — Accessibility and interaction QA

### Checklist

```text
[ ] Contrast WCAG AA on all text/surface combinations
[ ] Keyboard focus order matches visual order
[ ] Focus ring visible (focus-visible:ring-2 focus-visible:ring-[#002D72]/30)
[ ] Hover states have feedback (not relying on color alone)
[ ] Disabled state: opacity-50 + cursor-not-allowed + title attribute
[ ] Loading state: skeleton or inline spinner (announce via aria-live for screen readers)
[ ] Error state: aria-invalid + aria-describedby + visible message
[ ] Badge text readable (text-[10px] minimum; pair with icon or label)
[ ] Status NEVER color-only — always text or icon paired
[ ] prefers-reduced-motion respected (motion-reduce: variants in critical hovers)
[ ] Modal close: X button + click backdrop + Esc key
[ ] Escape key closes overlays globally
[ ] aria-live regions for toast/notifications
[ ] aria-hidden on decorative SVGs
[ ] Form labels associated with inputs (htmlFor + id)
[ ] Skip-to-content link in topbar
```

---

## 15. Phase 12 — Safety QA

### Hard checklist (each line MUST be confirmed)

```text
[ ] No business logic changed
[ ] No database schema changed
[ ] No database writes changed
[ ] No routes renamed
[ ] No authentication logic changed
[ ] No API payload structure changed
[ ] No data fetching strategy changed
[ ] No private ProFrance data copied
[ ] No ProFrance workflow logic copied
[ ] No Supabase RLS / RPC / triggers copied
[ ] No new dependencies added without explicit owner approval
[ ] No broad refactor outside visual scope
[ ] No secrets / .env / API keys committed
[ ] No tests disabled
[ ] No type checks bypassed
[ ] No lint suppressions added
[ ] No hook bypassed (--no-verify, --no-gpg-sign)
```

If ANY of the above is "No" → STOP and revert that change.

---

## 16. Phase 13 — Build QA

### Detect package manager

```text
[ ] pnpm-lock.yaml present  → use pnpm
[ ] yarn.lock present       → use yarn
[ ] package-lock.json       → use npm
[ ] bun.lockb               → use bun
```

### Expected commands

```bash
# TypeScript check
npx tsc --noEmit            # or pnpm tsc --noEmit / yarn tsc --noEmit

# Build
npm run build               # or pnpm build / yarn build / bun run build

# Lint (only if safe to run; some projects have unrelated existing warnings)
npm run lint                # or pnpm lint / yarn lint
```

### Checklist

```text
[ ] tsc --noEmit passes with no NEW errors (pre-existing errors reported separately)
[ ] Build passes
[ ] Lint did not regress (compare to baseline from Phase 0)
[ ] No new console errors at runtime
[ ] No hydration warnings (Next.js / Remix)
[ ] Pre-existing lint reported in separate doc — DO NOT fix unrelated lint in visual sprint
[ ] Fix only blocking errors INTRODUCED by visual transfer
```

---

## 17. One-page application checklist

> Paste-ready. Compact. For sharing with another dev or AI.

```text
PROFRANCE STYLE — ONE-PAGE APPLICATION CHECKLIST

PHASE 0 — AUDIT (read-only)
[ ] App shell, dashboard, nav, cards, buttons, badges, forms, dialogs, lists, mobile, tokens, hover/focus, states
[ ] Files allowed (globs):    __________
[ ] Files forbidden (globs):  __________
[ ] Baseline tsc + build PASS

PHASE 1 — TOKENS
[ ] Add :root CSS variables (navy/blue/surface/borders/text/semantic)
[ ] Do not mass-replace hex literals
[ ] Preserve dark mode if exists

PHASE 2 — SHELL
[ ] bg-[#F7F8FC] page; bg-white cards; topbar sticky backdrop-blur
[ ] p-4 sm:p-6 lg:p-8; space-y-6 sections

PHASE 3 — CARDS
[ ] rounded-2xl bg-white shadow-sm ring-1 ring-black/5
[ ] Hover lift ONLY if clickable
[ ] Accent rails by category/stage

PHASE 4 — BUTTONS
[ ] Primary navy; secondary outline; ghost; destructive icon-only
[ ] One primary per area; focus-visible ring; mobile full-width

PHASE 5 — BADGES
[ ] Semantic pills (emerald/amber/rose/blue/teal/slate)
[ ] Never color-only; pair with text/icon

PHASE 6 — DASHBOARD
[ ] 5 sections: Hero → Action required → Today → Next 24h → Insights
[ ] Hide Action card if count===0
[ ] ≤4 KPIs in hero

PHASE 7 — FORMS / DIALOGS
[ ] Input rounded-2xl, focus navy ring duplo
[ ] Validate on blur + submit
[ ] Server errors in banner top
[ ] Loading keeps button visible

PHASE 8 — LISTS / TABLES
[ ] Desktop table → mobile cards
[ ] Currency tabular-nums navy right-aligned

PHASE 9 — ADVANCED (optional)
[ ] Toast / z-index / sidebar gradient / tooltip / popover / charts / print / shortcuts

MOBILE QA
[ ] 375/390 zero horizontal overflow
[ ] Touch ≥44px; inputs text-base; dialog max-h-[60vh]

SAFETY (HARD)
[ ] No business logic / schema / routes / auth / payloads changed
[ ] No dependencies added without approval
[ ] No ProFrance data or workflow copied

BUILD
[ ] tsc PASS / build PASS / lint no regression
```

---

## 18. Prompt template — Full visual transfer

```text
ROLE
You are a Senior Frontend Engineer, UI Architect, Premium SaaS Product Designer, Design System Architect, and Mobile-first UX Designer.

REPO
<absolute path to target repo>

TARGET FILES (allowed to modify)
<exact globs>

FORBIDDEN FILES
<exact globs>

MISSION
Apply the ProFrance premium operational SaaS visual style to this project. Visual-only. Preserve architecture. Minimal diff. Incremental.

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

VISUAL IDENTITY
- Single brand action color: navy #002D72 (hover #003a94).
- White elevated cards on #F7F8FC page background.
- Hero gradient: from-[#001F4D] via-[#002D72] to-[#2B1F5B] + translucent orbs.
- Semantic pills: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring.
- No neon, no solid pastel cards, no candy shadows, no bounce.

ARCHITECTURE CONSTRAINTS
- Preserve routes, data fetching, schema, auth, business logic.
- Modify only UI/styling files in the allowed globs.
- Do not add dependencies unless explicitly approved.
- Prefer minimal diff. Apply incrementally: tokens → shell → cards → dashboard → forms → mobile QA.
- Run tsc + build after each phase.

COMPONENT SYSTEM (Tailwind recipes)
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Premium card: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI: rounded-xl bg-white p-4; text-2xl font-bold tabular-nums text-[#002D72].
- Hero: rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10.
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] focus-visible:ring-2 focus-visible:ring-[#002D72]/30 active:scale-[0.98].
- Badge: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200.
- Form input: rounded-2xl border-slate-200 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Dialog: backdrop bg-slate-950/40 backdrop-blur-sm; card max-w-sm rounded-[1.75rem] shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5.

DASHBOARD HIERARCHY
1. Hero / command summary (≤4 KPIs).
2. Action required (rose rail + count badge; hide if 0).
3. Today (blue rail).
4. Next 24h (amber rail; date chips amber if ≤2 days).
5. Secondary insights (slate rail).

MOBILE RULES
- Safe at 375/390px. Zero horizontal overflow.
- grid-cols-1 default → sm:/md:/xl: breakpoints.
- Tables convert to stacked cards (hidden md:table + block md:hidden).
- Touch ≥44px; primary buttons full-width on mobile.
- Dialog max-h-[60vh] + overflow-y-auto + safe-area bottom.
- Inputs text-base (anti iOS zoom).

FORBIDDEN ACTIONS
- No business logic / data fetching / schema / auth / route changes.
- No new dependencies without approval.
- No unrelated refactor.
- No build/lint/test config changes.
- No copying ProFrance private data, business logic, Supabase implementation, or workflows.

OUTPUT FORMAT
1. Visual audit of current target (bullets, ≤20).
2. Files to modify (grouped by concern).
3. Per-file visual changes proposed (concise).
4. Phased implementation plan with QA gates.
5. Confirmation: "No business logic, data fetching, schema, auth, or routes were changed."
6. QA checklist: desktop + tablet + mobile 375/390 + a11y + integrity (tsc, build, lint).

Start with step 1 (audit) and wait for approval before editing any file.
```

---

## 19. Prompt template — Single page polish

```text
ROLE
Senior Frontend Engineer + UI Architect. Apply ProFrance premium SaaS visual style.

SCOPE
Modify only this/these file(s): <path/to/page>

CONSTRAINTS
- Preserve architecture, props, data fetching, routes, business logic.
- Visual-only. No data logic changes. No schema changes. No new dependencies.
- Mobile-safe at 375/390px.

PRIVACY
Do not copy ProFrance business data or business logic. Copy only visual patterns.

VISUAL RULES
- White cards on #F7F8FC. Navy #002D72 = sole action color.
- rounded-2xl bg-white shadow-sm ring-1 ring-black/5 default.
- Semantic pills (emerald/amber/rose/blue/teal), never color-only.
- tabular-nums currency bold navy right-aligned.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- One primary button per area.
- Hover lift only when clickable.
- No neon, no bounce, no candy shadow, no solid pastel cards.

OUTPUT
1. Diff summary (what changed and why).
2. Confirmation no logic/schema/routes changed.
3. QA checklist: desktop + mobile 375px (overflow / touch / readable).
4. tsc + build PASS confirmation.
```

---

## 20. Prompt template — Single component polish

```text
ONE TASK. ONE FILE. ONE OBJECTIVE.

File: <path/to/component>
Objective: <e.g. polish Card / Button / Badge>

RULES
- Minimal diff. Preserve props. Preserve handlers. Preserve data flow.
- Visual-only. Mobile-safe.

STYLE
- rounded-2xl bg-white shadow-sm ring-1 ring-black/5 (cards)
- bg-[#002D72] text-white rounded-[1.25rem] px-5 py-2.5 (primary button)
- rounded-full bg-{tone}-50 text-{tone}-700 ring-1 ring-{tone}-200 (badges)
- tabular-nums on all numbers; currency bold navy right-aligned

PRIVACY
Do not copy ProFrance business data or business logic.

OUTPUT
- Diff (concise).
- Confirmation no API/props/handlers changed.
```

---

## 21. Final acceptance criteria

A transferência só está completa quando TODAS as caixas abaixo estão marcadas:

```text
INTEGRITY
[ ] Target app still builds (npm run build PASS)
[ ] tsc --noEmit PASS (no NEW errors)
[ ] Lint did not regress
[ ] No new runtime console errors
[ ] No hydration warnings

DATA SAFETY
[ ] No business logic changed
[ ] No database schema changed
[ ] No data copied from ProFrance
[ ] No private workflow copied
[ ] No Supabase implementation copied
[ ] No auth logic changed
[ ] No routes renamed

VISUAL
[ ] Visual system consistent across modified pages
[ ] Tokens applied uniformly
[ ] Cards rounded-2xl + ring + shadow-sm
[ ] Buttons follow primary/secondary/ghost/destructive system
[ ] Badges follow semantic system (no color-only)
[ ] Hero gradient navy→violet present (if applicable)
[ ] Sidebar dark; content light (if applicable)

DASHBOARD
[ ] 5-section hierarchy: Hero → Action → Today → Next 24h → Insights
[ ] ≤4 KPIs in hero
[ ] Action card hides when count===0
[ ] No duplicated sections

FORMS / DIALOGS
[ ] Inputs rounded-2xl with focus navy ring duplo
[ ] Validation on blur + submit
[ ] Server errors in banner top
[ ] Loading keeps button visible
[ ] Mobile dialog max-h-[60vh] + scroll

MOBILE
[ ] 375px: zero horizontal overflow
[ ] 390px: zero horizontal overflow
[ ] Tables converted to cards
[ ] Touch targets ≥ 44px
[ ] Inputs text-base

ACCESSIBILITY
[ ] WCAG AA contrast
[ ] focus-visible ring on all interactive elements
[ ] aria-invalid + aria-describedby on form errors
[ ] aria-live on toast container
[ ] Esc closes overlays

ADVANCED SYSTEMS
[ ] Toast/z-index/sidebar gradient/forms/tooltip/popover/charts/print/shortcuts
    documented OR intentionally skipped with rationale
```

If any box is unchecked → not done.

---

## 22. Final summary

### 10-line practical summary
1. Visual transfer = copy ProFrance UI/UX patterns only. Zero data, zero logic, zero schema.
2. Confirm stack, localhost, allowed/forbidden files before editing anything.
3. Phase 0 = read-only audit. Establish baseline tsc/build/lint.
4. Phase 1 = tokens. Add CSS vars to globals; never mass-replace hex literals.
5. Phases 2–8 = shell, cards, buttons, badges, dashboard hierarchy, forms, lists.
6. Phase 9 = advanced systems (toast/z-index/sidebar/charts/print/shortcuts) — opcional.
7. Phases 10–13 = mobile QA, a11y QA, safety QA, build QA.
8. Hard rule: no business logic, schema, routes, auth, dependencies changed.
9. Hard rule: mobile 375/390 sem overflow horizontal.
10. Acceptance = todas as caixas §21 marcadas + final warning respeitado.

### Readiness checklist (sign-off)

```text
[ ] Owner approval to start visual transfer
[ ] Stack + localhost + allowed/forbidden files documented
[ ] Phase 0 audit completed and reported
[ ] Baseline tsc + build PASS
[ ] Visual implementation plan approved
[ ] Phases 1–8 completed incrementally
[ ] Advanced systems decided (implemented / skipped)
[ ] Mobile QA at 375/390/tablet/desktop PASS
[ ] A11y QA PASS
[ ] Safety QA PASS (all hard rules)
[ ] Build QA PASS (tsc + build + lint no regression)
[ ] Final acceptance criteria §21 all checked
[ ] Sign-off from owner
```

### Final warning ⚠️

> **Do not copy ProFrance business data or business logic.**
> **Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.**
> Dados de cliente, regras financeiras, schemas Supabase, workflows operacionais, autenticação e rotas do alvo permanecem intactos.

### Recommended next prompt

**Prompt 56** — `apply visual transfer to <target-project>`: cole o template §18 deste checklist, preencha os placeholders `<repo>`, `<allowed files>`, `<forbidden files>`, e execute fase-por-fase com QA gate entre cada uma.

Alternativas:
- **Prompt 56-light** (page polish) — use template §19 para uma página específica.
- **Prompt 56-micro** (component polish) — use template §20 para um componente isolado.

---

*Checklist derivado de [profrance-visual-transfer-kit.md](./profrance-visual-transfer-kit.md). Sem alteração de código de aplicação. Sem dados privados. Sem lógica de negócio.*
