# Apply ProFrance Visual Style to a Real System

> Prompts prontos para colar em outro repositório SaaS real e aplicar o estilo visual ProFrance com segurança.
> Sources: [`transfer-kit`](./profrance-visual-transfer-kit.md) · [`application-checklist`](./profrance-style-application-checklist.md).
>
> Explicações em português. Prompts, placeholders, checklists e instruções em inglês.

---

## 1. Purpose

Este documento contém **prompts copy-ready em inglês** para aplicar o sistema visual ProFrance em outro produto SaaS real (Cursor, Claude Code, Cline, Copilot, etc.).

Escopo:
- ✅ Copiar **sistema visual** (cores, tipografia, espaçamento, componentes).
- ✅ Copiar **padrões UI/UX** (hierarquia dashboard, status pills, mobile-first).
- ✅ Copiar **filosofia de layout** (white cards + navy + soft shadows + tabular numbers).

Fora de escopo (NUNCA copiar):
- ❌ Dados de negócio ProFrance (clientes, pedidos, valores, transações).
- ❌ Lógica de negócio ProFrance (workflows, regras financeiras, automações).
- ❌ Schema do banco ProFrance / migrations.
- ❌ Implementação Supabase ProFrance (queries, RLS, RPC).
- ❌ Workflows operacionais privados ProFrance.
- ✅ **Preservar arquitetura do projeto alvo** (rotas, fetching, auth, deploy).

---

## 2. Required target project information

Antes de rodar qualquer prompt no projeto alvo, preencha:

```text
TARGET PROJECT INFO — fill before pasting any prompt

TARGET_REPO:                          <absolute path or git URL>
TARGET_STACK:                         <e.g. Next.js 15 App Router + Tailwind v4 + TypeScript>
TARGET_LOCALHOST:                     <e.g. http://localhost:3000 — confirm with owner; NEVER assume>
TARGET_ARCHITECTURE:                  <App router / Pages router / Remix / Astro / SPA / etc.>
TARGET_MODULES:                       <list of modules in scope: dashboard / orders / settings / …>
TARGET_DATABASE:                      <Supabase / Prisma+Postgres / Drizzle+SQLite / Firestore / DO NOT TOUCH>
TARGET_DEPLOYMENT:                    <Vercel / Netlify / Fly / Cloudflare / self-hosted>
TARGET_VISUAL_DIRECTION:              <full mirror / partial — which areas to polish first>
TARGET_AUTH_BOUNDARIES:               <which routes are public vs behind auth>
TARGET_ALLOWED_FILES:                 <exact globs, e.g. src/components/ui/**, src/app/**/*.tsx, src/app/globals.css>
TARGET_FORBIDDEN_FILES:               <exact globs, e.g. src/lib/db/**, src/server/**, **/api/**, supabase/**>
TARGET_FIRST_PAGE_TO_POLISH:          <path of safest first page, low data dependency, high visual impact>
TARGET_DESIGN_RISKS:                  <known fragile spots, dark mode coupling, vendor widgets, etc.>
TARGET_BUSINESS_LOGIC_THAT_MUST_NOT_CHANGE: <list of files/functions/handlers that are off-limits>
```

> ⚠️ **Never assume localhost automatically.** Confirm the URL and port with the project owner before starting any dev server, opening a browser, or running smoke tests.

---

## 3. How to use this prompt

1. **Open the target project** in Cursor / Claude Code / Cline / Copilot Chat.
2. **Fill the placeholders** from §2 above (all 14 fields).
3. **Run the AUDIT prompt first** (§5) — it inspects without editing.
4. **Review proposed files** before allowing changes (compare against `TARGET_ALLOWED_FILES` / `TARGET_FORBIDDEN_FILES`).
5. **Apply visual changes incrementally** — tokens → shell → cards → dashboard → forms → mobile QA.
   - Use the FIRST IMPLEMENTATION SPRINT prompt (§6) for one page at a time.
   - Use SINGLE COMPONENT POLISH (§7) for surgical fixes.
   - Use DASHBOARD CONVERSION (§8) when ready.
6. **Run desktop/mobile QA** (§9) after each phase. STOP if mobile 375px breaks.
7. **Run FINAL SAFETY QA** (§10) before merging — confirm zero business logic / schema / auth / route changes.

If at any point the AI proposes touching `TARGET_FORBIDDEN_FILES` or changing business logic → REJECT and re-prompt with stricter scope.

---

## 4. Universal implementation prompt — full version

```text
ROLE
You are a Senior Frontend Engineer, UI Architect, Premium SaaS Product Designer, Design System Architect, and Mobile-first UX Designer.

MISSION
Apply the ProFrance-inspired premium operational SaaS visual system to the target project. Visual-only. Preserve architecture. Minimal diff. Incremental.

CRITICAL PRIVACY RULE
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

TARGET PROJECT
TARGET_REPO:                         <fill>
TARGET_STACK:                        <fill>
TARGET_LOCALHOST:                    <fill — do not assume>
TARGET_ARCHITECTURE:                 <fill>
TARGET_MODULES:                      <fill>
TARGET_DATABASE:                     <fill — DO NOT TOUCH>
TARGET_DEPLOYMENT:                   <fill>
TARGET_ALLOWED_FILES:                <fill exact globs>
TARGET_FORBIDDEN_FILES:              <fill exact globs>
TARGET_FIRST_PAGE_TO_POLISH:         <fill path>

VISUAL IDENTITY
- Premium operational SaaS, executive-grade, calm but action-oriented, trustworthy, clean, mobile-first.
- White elevated cards on near-flat page #F7F8FC. Dark navy sidebar is the only dark surface.
- Navy #002D72 is the single brand action color (hover #003a94).
- Hero gradient: from-[#001F4D] via-[#002D72] to-[#2B1F5B] with translucent orbs.
- Semantic status pills: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring.
- All numbers tabular-nums. Currency bold navy, right-aligned.
- Soft shadows. Rounded-2xl cards. Refined typography. Semantic urgency.
- No neon. No high saturation. No candy shadows. No solid pastel cards. No bounce.
- Inspirations: Stripe, Linear, Apple/HIG, Notion, Revolut, Raycast.

ARCHITECTURE CONSTRAINTS
- Preserve target routes, data fetching, schema, auth, business logic, API payloads.
- Modify only files matching TARGET_ALLOWED_FILES.
- Never modify TARGET_FORBIDDEN_FILES.
- Do not rename routes.
- Do not add dependencies unless explicitly approved by the owner.
- Prefer minimal diff. Apply changes incrementally: tokens → shell → cards → dashboard → forms → mobile QA.
- Run TypeScript check and build after each phase.

COLOR TOKENS (add to :root in TARGET_ALLOWED_FILES)
--brand-navy: #002D72; --brand-navy-700: #003a94;
--brand-blue: #4F5FB8; --brand-violet: #6D5FBF; --brand-violet-form: #81459E;
--surface: #FFFFFF; --surface-elevated: #FFFFFF;
--surface-muted: #F1F3FA; --surface-page: #F7F8FC; --surface-warm: #F9F7EC;
--border-soft: rgba(15,23,42,0.07); --border-strong: rgba(15,23,42,0.11);
--text-primary: #0F172A; --text-secondary: #475569; --text-muted: #94A3B8;
--success: #047857; --warning: #B45309; --danger: #BE123C; --info: #1D4ED8;
--recurring: #0F766E; --logistics-orange: #C2410C;

TYPOGRAPHY
- Geist / Inter / Manrope / system-ui acceptable.
- Page title: text-3xl font-semibold tracking-tight text-[#002D72].
- Section header: text-lg font-bold text-slate-900.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- Body: text-sm text-slate-700. Helper: text-[12px] text-slate-500.
- All numbers tabular-nums. Currency bold navy, right-aligned.

VISUAL SYSTEM TO APPLY (16 pieces)
1.  Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
2.  Hero section: rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10 + translucent orbs.
3.  Premium card: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
4.  KPI card: rounded-xl bg-white p-4 + text-2xl font-bold tabular-nums text-[#002D72].
5.  Dashboard hierarchy: see DASHBOARD HIERARCHY block below.
6.  Buttons: primary navy rounded-[1.25rem] hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98]; secondary outline; ghost text-navy; destructive icon-only rose. One primary per area.
7.  Badges / status pills: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200. Never color-only.
8.  Forms: input rounded-2xl border-slate-200 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10. Validate ON BLUR + submit. Server errors at form top.
9.  Dialogs: backdrop bg-slate-950/40 backdrop-blur-sm; small confirm max-w-sm rounded-[1.75rem]; side drawer max-w-lg for long forms with sticky footer.
10. Lists / rows: divide-y divide-slate-50 + hover:bg-slate-50/60 + tabular-nums right-aligned currency in bold navy.
11. Empty states: rounded-2xl bg-white py-14 text-center + icon bubble bg-slate-50 ring-1 ring-black/5.
12. Warning banners: rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 ring-1 ring-amber-100 text-amber-700.
13. Toast (if applicable): white elevated + border-l-4 semantic rail + icon bubble + rounded-2xl shadow-lg. Container z-[100] aria-live="polite". Never full-saturated bg.
14. Tooltip / popover (if applicable): tooltip role="tooltip" max-w-[200px] z-50; popover rounded-2xl bg-white shadow-lg ring-1 ring-black/5 z-40. Mobile = bottom sheet.
15. Charts (if applicable): token-aligned palette (--chart-1..8). Minimal gridlines rgba(15,23,42,0.05). NEVER sum different currencies into one total — group by currency. No rainbow, no 3D.
16. Mobile-first: grid-cols-1 default → sm:/md:/xl: breakpoints. Tables → stacked cards (hidden md:table + block md:hidden). Touch ≥44px. Inputs text-base. Dialog max-h-[60vh] + overflow-y-auto + safe-area.

DASHBOARD HIERARCHY
1. Hero / command summary (≤4 KPIs, navy gradient).
2. Action required (rose rail + count badge; hide if count===0).
3. Today (blue rail).
4. Next 24h (amber rail; date chips amber if ≤2 days).
5. Secondary insights (slate rail; charts/averages/history).

TAILWIND VISUAL RULES
- Prefer white elevated surfaces.
- Avoid solid pastel block cards.
- Use accent rails sparingly (top h-[2px] for category, left border-l-[5px] for stage).
- Use icon bubbles for semantic identity: bg-{tone}-50 ring-1 ring-{tone}-100.
- Use calm semantic badges; never color-only status.
- Use soft borders (border-slate-200/70) and soft shadows (shadow-sm base).
- Use tabular-nums for KPIs and all column-aligned numbers.
- Avoid neon, clutter, generic CRUD visuals, number overload (>4 KPIs in hero).
- Keep mobile 375px safe — zero horizontal overflow.

FORBIDDEN ACTIONS
- No business logic / data fetching / schema / API payload / auth / route changes.
- No new dependencies without owner approval.
- No dark mode unless requested by owner.
- No unrelated refactor.
- No build/lint/test config changes.
- No copying ProFrance private data, business logic, Supabase implementation, or workflows.
- No committing secrets, .env, or API keys.
- No disabling tests or hooks to pass build.

OUTPUT FORMAT (return in this exact structure)
1. Current visual audit of the target system: bullet list of pain points (≤20).
2. Files to modify: exact paths grouped by concern (tokens / shell / cards / dashboard / forms / mobile).
3. Files NOT to touch: confirm matches against TARGET_FORBIDDEN_FILES.
4. Visual changes proposed: concise per-file description.
5. Minimal implementation plan: ordered phases with QA gates.
6. Confirmation: "No business logic, data fetching, schema, API payloads, auth, or routes will be changed."
7. Desktop QA checklist (≥1280px): tokens applied, cards correct, hero present, hierarchy right, status pills correct.
8. Mobile QA checklist (375/390): zero horizontal overflow, tables converted to cards, touch ≥44px, dialogs max-h scrollable, inputs text-base.
9. Build/typecheck plan: detect package manager from lockfile (pnpm/yarn/npm/bun); run tsc --noEmit; run build; report results.

Begin with step 1 (audit) and wait for owner approval before editing any file.
```

---

## 5. Target prompt — audit-only mode

```text
ROLE
Senior UI Architect doing a READ-ONLY visual audit of the target SaaS.

MISSION
Audit the current visual system. DO NOT modify any file. DO NOT run any dev server unless TARGET_LOCALHOST is provided AND owner approves.

TARGET PROJECT
TARGET_REPO: <fill>
TARGET_STACK: <fill>
TARGET_ALLOWED_FILES: <fill globs — for read scope only>
TARGET_FORBIDDEN_FILES: <fill globs — do not read business logic deeply>

PRIVACY
Do not copy ProFrance business data or business logic. Copy only visual patterns.

INSPECT
- App shell, sidebar, topbar, page background.
- Dashboard hierarchy and KPI placement.
- Card patterns (radius, border, shadow, ring).
- Buttons (primary/secondary/ghost/destructive variants).
- Badges/status pills (semantic color usage).
- Forms (input style, label position, error state, required field indicator).
- Dialogs (modal vs drawer, mobile behavior).
- Tables/lists/rows (mobile transform present?).
- Mobile behavior at 375/390 (overflow risk).
- Color tokens defined? Typography scale? Spacing? Radius? Shadow?
- Hover/focus states present? focus-visible used?
- Loading states: skeleton / spinner / missing?
- Empty states: compact / generic / missing?
- Error states: banner / inline / hidden in console?
- Z-index collisions across modal/drawer/dropdown/tooltip/toast.
- Toast/notification system: exists? style?
- Tooltip/popover system: exists? z-index correct? mobile fallback?
- Print styles: present? Hides chrome? Handles page breaks?
- Charts: library? colors token-aligned? multi-currency safe?
- Keyboard shortcuts: defined? help overlay?

RETURN
1. Current visual problems (bullets, max 25).
2. Color issues (token gaps, inconsistencies, saturation problems).
3. Card issues (mixed radius, heavy shadows, pastel blocks, missing rings).
4. Dashboard hierarchy issues (number overload, duplicate sections, wrong urgency).
5. Mobile risks (specific elements likely to overflow at 375px).
6. Inconsistent components (e.g. 3 different button styles, 2 different badge systems).
7. Safest first file/page to polish (low data dependency, high visual impact).
8. Proposed sprint plan: ordered phases with effort estimate (S / M / L).
9. Baseline tsc + build status (PASS/FAIL — report only, do not fix).
10. Pre-existing lint warnings (report only, do not touch).

DO NOT modify any file. DO NOT propose code yet. Audit only.
```

---

## 6. Target prompt — first implementation sprint

```text
ROLE
Senior Frontend Engineer applying the ProFrance premium visual style to ONE page only.

SCOPE
TARGET_FIRST_PAGE_TO_POLISH: <fill path>
TARGET_ALLOWED_FILES: <fill globs>
TARGET_FORBIDDEN_FILES: <fill globs>

CONSTRAINTS
- One page only. Visual-only. Minimal diff.
- Preserve architecture, routes, data fetching, business logic, auth, API payloads, schema.
- Do not add dependencies.
- Do not refactor unrelated code.

PRIVACY
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

STYLE TO APPLY
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Cards: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI: text-2xl font-bold tabular-nums text-[#002D72].
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98].
- Badges: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200.
- Form input: rounded-2xl border-slate-200 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- All numbers tabular-nums; currency bold navy right-aligned.

PROCEDURE
1. Read the target file(s) for TARGET_FIRST_PAGE_TO_POLISH.
2. Identify visual issues (pastel cards, wrong radius, missing ring, color-only status, mobile overflow).
3. Propose edits without applying yet.
4. After owner approval, apply edits with minimal diff.
5. Run tsc + build.
6. Manually verify at 1280 and 375 viewports (or describe what would be verified if no browser available).

RETURN
1. Files changed: exact paths.
2. Visual improvements: per-file bullet summary.
3. What was preserved (props, handlers, queries, routes, schema, auth): explicit confirmation.
4. QA checklist desktop + mobile 375px.
5. Diff summary (concise).
6. tsc + build PASS/FAIL.
```

---

## 7. Target prompt — single component polish

```text
ONE TASK. ONE FILE. ONE OBJECTIVE.

File: <path/to/component>
Objective: <e.g. polish Button / Card / Badge / Dialog>

CONSTRAINTS
- Minimal diff. Preserve props. Preserve handlers. Preserve data flow.
- Visual-only. Mobile-safe.
- No new dependencies. No schema/API/route changes.

PRIVACY
Do not copy ProFrance business data or business logic. Copy only visual patterns.

STYLE RULES
- Cards: rounded-2xl bg-white shadow-sm ring-1 ring-black/5.
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#002D72]/30.
- Badges: rounded-full bg-{tone}-50 text-{tone}-700 ring-1 ring-{tone}-200 text-[11px] font-semibold.
- Numbers tabular-nums; currency bold navy right-aligned.
- Mobile: touch ≥44px; full-width primary on small screens; no horizontal overflow.

RETURN
- Diff (concise).
- Confirmation no API/props/handlers/data changed.
- Mobile-safe note (375px tested mentally or via preview).
```

---

## 8. Target prompt — dashboard conversion

```text
ROLE
Senior UI Architect converting the target dashboard to the ProFrance command-center hierarchy.

SCOPE
File(s): <path/to/dashboard>
TARGET_ALLOWED_FILES: <fill>
TARGET_FORBIDDEN_FILES: <fill>

CONSTRAINTS
- Visual-only reorganization. Minimal diff.
- Preserve all data queries and fetching (do not move, rename, or add).
- Preserve route links (do not change href targets).
- Do not add inline action buttons unless explicitly approved.
- Do not add new dependencies.

PRIVACY
Do not copy ProFrance business data or business logic. Copy only the visual hierarchy and patterns.

REQUIRED HIERARCHY (top → bottom)
1. Hero / command summary: navy gradient, ≤4 KPIs, no complex charts.
2. Action required: rose accent rail + count badge; HIDE entire section if count===0.
3. Today: blue accent rail; current activity, transactions, completed items of the day.
4. Next 24h: amber accent rail; upcoming deadlines; date chips amber when ≤2 days.
5. Secondary insights: slate accent rail; charts, averages, history (lowest visual weight).

RULES
- Reduce number overload: max 4 KPIs in hero; the rest move into compact KPI cards below.
- Remove duplicated visual blocks (e.g. "Latest orders" + "Today's orders" identical).
- Show urgent items first; calm urgency (rose only in count + accent rail, never paint full card red).
- Prioritize operational action over decoration: alerts and buttons appear before charts.
- Keep links to existing routes; do not change href targets.
- Do not change data queries.

OUTPUT
1. Before → after hierarchy diff.
2. Removed visual blocks (list).
3. Confirmation: "Data queries preserved; only visual reorganization."
4. Desktop QA checklist.
5. Mobile QA checklist (375/390): cards stack, no horizontal overflow, KPIs readable.
6. tsc + build PASS.
```

---

## 9. Target prompt — mobile QA

```text
ROLE
QA Engineer + Mobile-first UX Designer auditing the target system AFTER visual transfer.

TEST VIEWPORTS
- 375 × 812 (iPhone SE/8)
- 390 × 844 (iPhone 12/13/14)
- 768 × 1024 (iPad)
- 1280 × 800 (desktop baseline)

PROCEDURE
1. Confirm TARGET_LOCALHOST with owner. NEVER assume.
2. Open target pages in each viewport (preview MCP, Playwright, or browser devtools).
3. Verify the checklist below per page.

VERIFY (per page)
[ ] document.documentElement.scrollWidth === clientWidth at 375 (zero horizontal overflow)
[ ] Same at 390
[ ] Cards stack cleanly (grid-cols-1 default; sm:/md:/xl: tiers correct)
[ ] Dialogs fit viewport (max-h-[60vh] + overflow-y-auto + safe-area bottom)
[ ] Dialog internal scroll works (no body lock breaking)
[ ] Section headers wrap (flex-wrap items-center gap-3)
[ ] Buttons remain tappable (no overlap with safe-area)
[ ] Touch targets ≥ 44px (min-h-[44px] or .touch-target)
[ ] KPI numbers readable (text-2xl minimum)
[ ] Tables converted to stacked cards (hidden md:table + block md:hidden)
[ ] No clipped content (truncation OK; clipping NOT)
[ ] No giant empty vertical blocks
[ ] Inputs text-base (anti iOS zoom)
[ ] Sidebar = drawer with bg-black/50 backdrop-blur-sm at mobile
[ ] Topbar sticky + safe-area top respected
[ ] Modal backdrop scroll-locks body correctly

RETURN
1. Per-page report: PASS / NEEDS FIX / BLOCKED.
2. Specific failures with reproduction steps.
3. Suggested fixes (visual-only, minimal diff).
4. Files needing edit (allowed globs only).
5. Confirmation: "No business logic / schema / routes touched."
```

---

## 10. Target prompt — final safety QA

```text
ROLE
QA Engineer enforcing strict safety after visual transfer.

GOAL
Confirm zero non-visual changes were introduced.

PROCEDURE
1. Detect package manager from lockfile (pnpm/yarn/npm/bun).
2. Run TypeScript: <tool> tsc --noEmit (or equivalent).
3. Run build: <tool> run build.
4. Run lint if safe: <tool> run lint — report pre-existing lint separately; DO NOT fix unrelated warnings.
5. Git diff review against last visual sprint commit.

HARD CHECKLIST (each line MUST be confirmed; STOP if any is NO)
[ ] tsc --noEmit PASS with no NEW errors (pre-existing reported separately)
[ ] Build PASS
[ ] Lint did not regress vs Phase 0 baseline
[ ] No new runtime console errors
[ ] No new hydration warnings
[ ] No business logic changed
[ ] No database schema changed
[ ] No database writes added/changed
[ ] No API payload structure changed
[ ] No authentication logic changed
[ ] No routes renamed
[ ] No private data copied (no ProFrance fixtures / mocks / dumps)
[ ] No ProFrance workflow logic copied
[ ] No Supabase RLS / RPC / triggers copied
[ ] No new dependencies added without owner approval
[ ] No tests disabled or skipped
[ ] No type checks bypassed (no `any` introduced lazily, no @ts-ignore added)
[ ] No lint suppressions added
[ ] No hook bypassed (--no-verify, --no-gpg-sign)
[ ] No secrets / .env / API keys committed

RETURN
1. Per-line PASS/FAIL.
2. Diff summary (visual changes only).
3. Pre-existing lint/type errors (baseline, NOT introduced by sprint).
4. Final verdict: READY TO MERGE / NEEDS FIX / BLOCKED.
5. If NEEDS FIX → list of blocking issues with exact paths/lines.
```

---

## 11. Final copy-ready block

```text
APPLY PROFRANCE VISUAL STYLE TO THIS PROJECT

ROLE
You are a Senior Frontend Engineer, UI Architect, Premium SaaS Product Designer, Design System Architect, and Mobile-first UX Designer.

TARGET PROJECT (fill before running)
TARGET_REPO:                  <fill>
TARGET_STACK:                 <fill — e.g. Next.js 15 + Tailwind v4 + TypeScript>
TARGET_LOCALHOST:             <fill — NEVER assume; confirm with owner>
TARGET_ARCHITECTURE:          <fill>
TARGET_MODULES:               <fill>
TARGET_DATABASE:              <fill — DO NOT TOUCH>
TARGET_DEPLOYMENT:            <fill>
TARGET_ALLOWED_FILES:         <exact globs — only these may be modified>
TARGET_FORBIDDEN_FILES:       <exact globs — never touch these>
TARGET_FIRST_PAGE_TO_POLISH:  <safest starting page>

MISSION
Apply the ProFrance-inspired premium operational SaaS visual system to this project. Visual-only. Preserve architecture. Minimal diff. Apply incrementally.

PRIVACY (HARD RULE — non-negotiable)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

ARCHITECTURE CONSTRAINTS
- Preserve target routes, data fetching, database schema, API payloads, auth logic, business logic.
- Modify only files matching TARGET_ALLOWED_FILES.
- Never modify TARGET_FORBIDDEN_FILES.
- Do not rename routes.
- Do not add dependencies unless explicitly approved by the owner.
- Prefer minimal diff. Apply incrementally: tokens → shell → cards → dashboard → forms → mobile QA.
- Run TypeScript check and build after each phase. Stop and report on any failure.

VISUAL IDENTITY
- Premium, executive, calm, trustworthy, mobile-first, operational command-center feel.
- White elevated cards on near-flat page #F7F8FC. Dark navy sidebar is the only dark surface.
- Single brand action color: navy #002D72 (hover #003a94).
- Hero gradient: from-[#001F4D] via-[#002D72] to-[#2B1F5B] + translucent orbs.
- Semantic pills: emerald=ok, amber=warning, rose=danger, blue=info, teal=recurring.
- All numbers tabular-nums. Currency bold navy, right-aligned.
- No neon, no solid pastel cards, no candy shadows, no bounce, no heavy glass beyond topbar backdrop-blur.

COLOR TOKENS (add to :root in TARGET_ALLOWED_FILES)
--brand-navy: #002D72; --brand-navy-700: #003a94;
--brand-blue: #4F5FB8; --brand-violet: #6D5FBF; --brand-violet-form: #81459E;
--surface: #FFFFFF; --surface-elevated: #FFFFFF;
--surface-muted: #F1F3FA; --surface-page: #F7F8FC; --surface-warm: #F9F7EC;
--border-soft: rgba(15,23,42,0.07); --border-strong: rgba(15,23,42,0.11);
--text-primary: #0F172A; --text-secondary: #475569; --text-muted: #94A3B8;
--success: #047857; --warning: #B45309; --danger: #BE123C; --info: #1D4ED8;
--recurring: #0F766E; --logistics-orange: #C2410C;

TYPOGRAPHY
- Geist / Inter / Manrope / system-ui acceptable.
- Page title: text-3xl font-semibold tracking-tight text-[#002D72].
- Section header: text-lg font-bold text-slate-900.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- Body: text-sm text-slate-700. Helper: text-[12px] text-slate-500.

COMPONENT SYSTEM (Tailwind recipes)
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Premium card: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI: rounded-xl bg-white p-4 + text-2xl font-bold tabular-nums text-[#002D72].
- Hero: rounded-2xl bg-gradient-to-br from-[#001F4D] via-[#002D72] to-[#2B1F5B] p-6 text-white shadow-lg ring-1 ring-white/10.
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] focus-visible:ring-2 focus-visible:ring-[#002D72]/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed.
- Secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50.
- Ghost: bg-transparent text-[#002D72] hover:bg-[#002D72]/10.
- Destructive (icon-only): h-7 w-7 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500. Never full-red bg.
- Status badge: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200.
- Warning banner: rounded-xl border border-amber-200/60 bg-amber-50/70 px-4 py-3 ring-1 ring-amber-100 text-amber-700.
- Form input: w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Dialog: backdrop bg-slate-950/40 backdrop-blur-sm p-4; card max-w-sm rounded-[1.75rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] ring-1 ring-black/5.
- Side drawer (long forms): fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-white shadow-2xl with sticky footer.
- Action row: flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-slate-50/60.
- Empty state: rounded-2xl bg-white py-14 text-center shadow-sm ring-1 ring-black/5; icon bubble h-14 w-14 rounded-2xl bg-slate-50.

DASHBOARD HIERARCHY (top → bottom)
1. Hero / command summary (≤4 KPIs, navy gradient).
2. Action required (rose rail + count badge; hide if 0).
3. Today (blue rail).
4. Next 24h (amber rail; date chips amber if ≤2 days).
5. Secondary insights (slate rail).

MOBILE RULES
- Safe at 375 and 390px. No horizontal overflow (verify scrollWidth === clientWidth).
- grid-cols-1 default → sm:/md:/xl: breakpoints.
- Tables convert to stacked cards (hidden md:table + block md:hidden).
- Touch targets ≥ 44px. Primary buttons full-width on mobile.
- Dialog max-h-[60vh] + overflow-y-auto + safe-area bottom.
- Inputs text-base (anti iOS zoom).
- Section headers flex-wrap gap-3.
- Sidebar becomes drawer with bg-black/50 backdrop-blur-sm.

MOTION
- transition-all duration-200 ease-out base.
- Hover lift hover:-translate-y-0.5 hover:shadow-md only on clickable cards.
- active:scale-[0.98] tactile feedback.
- Skeleton (animate-pulse rounded-2xl bg-slate-100 ring-1 ring-black/5) over spinners.
- No bounce. No neon. No heavy glass beyond topbar backdrop-blur-xl.

FORBIDDEN ACTIONS
- No business logic / data fetching / schema / API payload / auth / route changes.
- No new dependencies without owner approval.
- No dark mode unless requested by owner.
- No unrelated refactor.
- No build/lint/test config changes.
- No copying ProFrance private data, business logic, Supabase implementation, or workflows.
- No committing secrets, .env, or API keys.
- No disabling tests or hooks to pass build.
- NEVER assume localhost — confirm with owner before any dev server.

OUTPUT FORMAT (return in this exact structure)
1. Visual audit: bullet list of current target pain points (≤20).
2. Files to modify: exact paths grouped by concern (tokens / shell / cards / dashboard / forms / mobile). Must match TARGET_ALLOWED_FILES.
3. Files NOT to touch: confirm against TARGET_FORBIDDEN_FILES.
4. Visual changes proposed: concise per-file description.
5. Minimal implementation plan: ordered phases with QA gates between them.
6. Confirmation: "No business logic, data fetching, schema, API payloads, auth, or routes were changed."
7. Desktop QA checklist (≥1280px).
8. Mobile QA checklist (375/390): zero horizontal overflow, tables → cards, touch ≥44px, dialog scroll, inputs text-base.
9. Build plan: detect package manager from lockfile; run tsc --noEmit; run build; report PASS/FAIL.

Begin with step 1 (audit) and wait for owner approval before editing any file.
```

---

## 12. Final summary

### Variantes de prompt criadas

| # | Prompt | Uso |
|---|--------|-----|
| §4 | Full version | Início de transferência completa em projeto novo |
| §5 | Audit-only | Reconhecimento read-only do alvo |
| §6 | First sprint | Primeira página polida (safer start) |
| §7 | Single component | Polimento cirúrgico de 1 arquivo |
| §8 | Dashboard conversion | Reorganizar dashboard em 5 seções ProFrance |
| §9 | Mobile QA | Auditoria mobile 375/390/tablet/desktop |
| §10 | Final safety QA | Verificação anti-regressão antes de merge |
| §11 | Final copy block | **Versão consolidada — melhor para colar de uma vez** |

### Recommended next step

Para aplicar em um projeto real específico:

1. **Crie um documento de contexto** com os 14 placeholders preenchidos (§2).
2. **Cole §5 (audit-only)** primeiro no projeto alvo. Revise saída.
3. **Cole §11 (final copy block)** com placeholders preenchidos.
4. **Aprove fase-por-fase**, exigindo `tsc + build PASS` entre cada uma.
5. **Termine com §10 (safety QA)** antes de mergear.

### Final warning ⚠️

> **Do not copy ProFrance business data or business logic.**
> **Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.**
> O projeto alvo mantém suas rotas, queries, schema, auth e regras de negócio intactos. Visual transfer é puramente cosmético/estrutural.

---

*Documento derivado de [profrance-visual-transfer-kit.md](./profrance-visual-transfer-kit.md) + [profrance-style-application-checklist.md](./profrance-style-application-checklist.md). Sem alteração de código de aplicação. Sem dados privados. Sem lógica de negócio.*
