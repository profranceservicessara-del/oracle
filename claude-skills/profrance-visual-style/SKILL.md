---
name: profrance-visual-style
description: Use this skill when the user wants to apply, audit, transfer, teach, or recreate the ProFrance-inspired premium SaaS visual system in another project. This skill covers UI polish, dashboard hierarchy, Tailwind visual recipes, mobile-first layout, cards, buttons, badges, forms, dialogs, advanced visual systems, and safety rules. It must not copy ProFrance business data or business logic.
---

# ProFrance Visual Style

## Purpose

Apply the ProFrance premium operational SaaS visual identity to another project — without importing any of ProFrance's business data, business logic, database schema, Supabase implementation, or private operational workflows.

> **Critical rule:** Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

## When to use this skill

- The user asks to "apply ProFrance style" / "make it look like ProFrance" / "premium SaaS visual polish".
- Visual audit of a SaaS dashboard, page, or component is requested.
- Dashboard reorganization into command-center hierarchy (urgent → today → upcoming → history).
- Mobile-first cleanup (375/390 px safety).
- Status pill / badge / button standardization on calm semantic colors.
- Form / dialog visual refresh while preserving validation/submit logic.
- Teaching another AI agent the ProFrance look & feel.

## When NOT to use this skill

- The user wants to copy data, queries, schema, or business rules from ProFrance.
- The user wants to migrate Supabase, auth providers, or backend logic.
- The user wants to add features, change API payloads, or rename routes.
- The user wants dark mode (the skill recommends NOT to add it now).
- The user is working on a non-SaaS context (marketing site, brochure, blog) where the operational command-center aesthetic does not fit.

## Required target project information

Before applying any change, the agent MUST collect:

```text
TARGET_REPO:                  <absolute path or git URL>
TARGET_STACK:                 <e.g. Next.js 15 + Tailwind v4 + TypeScript>
TARGET_LOCALHOST:             <NEVER assume — confirm with owner>
TARGET_ARCHITECTURE:          <App router / Pages / Remix / Astro / SPA>
TARGET_MODULES:               <list of modules in scope>
TARGET_DATABASE:              <DO NOT TOUCH>
TARGET_DEPLOYMENT:            <Vercel / Netlify / etc.>
TARGET_ALLOWED_FILES:         <exact globs allowed to modify>
TARGET_FORBIDDEN_FILES:       <exact globs never to touch>
TARGET_FIRST_PAGE_TO_POLISH:  <safest starting page>
TARGET_AUTH_BOUNDARIES:       <public vs auth-protected routes>
TARGET_DESIGN_RISKS:          <fragile spots, vendor widgets, dark coupling>
TARGET_BUSINESS_LOGIC_THAT_MUST_NOT_CHANGE: <off-limits files/handlers>
```

> ⚠️ **Never assume localhost automatically.** Always confirm with the owner.

## Visual identity rules

- Single brand action color: **navy `#002D72`** (hover `#003a94`).
- Surfaces: **white elevated cards** on near-flat page `#F7F8FC`. Dark navy sidebar is the only dark surface.
- Hero gradient: `from-[#001F4D] via-[#002D72] to-[#2B1F5B]` + translucent orbs.
- Semantic status pills: `emerald=ok`, `amber=warning`, `rose=danger`, `blue=info`, `teal=recurring`.
- All numbers `tabular-nums`. Currency **bold navy, right-aligned**.
- Cards `rounded-2xl bg-white shadow-sm ring-1 ring-black/5`. Hover lift only when clickable.
- Labels uppercase muted `text-[11px] font-semibold uppercase tracking-wide text-slate-400`.
- No neon. No solid pastel cards. No candy shadows. No bounce. No heavy glass beyond topbar backdrop-blur.

Full visual identity reference: [`resources/visual-transfer-kit.md`](./resources/visual-transfer-kit.md).

## Architecture safety rules

- **Preserve target architecture.**
- **Never assume localhost automatically** — confirm with owner before any dev server.
- Do not change data fetching.
- Do not change database schema.
- Do not change API payloads.
- Do not change auth logic.
- Do not rename routes.
- Do not add dependencies unless approved.
- Modify only files matching `TARGET_ALLOWED_FILES`.
- Never modify `TARGET_FORBIDDEN_FILES`.
- Prefer minimal diff.
- Apply changes incrementally.
- **Start with audit-only mode** (`templates/audit-only.md`).

## Privacy rules

- Do not copy ProFrance business data or business logic.
- Do not copy ProFrance database schema, RLS, RPC, or triggers.
- Do not copy ProFrance workflows or operational rules.
- Do not copy ProFrance authentication implementation.
- Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

## Implementation workflow

```text
Phase 0 — Audit (read-only)
  Use templates/audit-only.md.
  Report visual problems, mobile risks, safest first page.

Phase 1 — Tokens
  Add CSS variables (brand-navy, surface, semantic) to globals.css.
  Do NOT mass-replace hex literals.

Phase 2 — Shell + background
  bg-[#F7F8FC] page; bg-white cards; sticky topbar backdrop-blur.

Phase 3 — Cards
  rounded-2xl bg-white shadow-sm ring-1 ring-black/5.
  Hover lift only if clickable.

Phase 4 — Buttons
  Primary navy / secondary outline / ghost / destructive icon-only.
  One primary per area.

Phase 5 — Badges
  Semantic pills (emerald/amber/rose/blue/teal). Never color-only.

Phase 6 — Dashboard hierarchy
  Use templates/dashboard-conversion.md.
  Hero → Action required → Today → Next 24h → Insights.

Phase 7 — Forms / dialogs
  Inputs rounded-2xl, focus navy ring duplo.
  Validation on blur + submit. Server errors at form top.

Phase 8 — Lists / tables
  Desktop table → mobile stacked cards.

Phase 9 — Advanced systems (optional, only if approved)
  Toast / z-index scale / sidebar gradient / tooltip / popover / charts / print / shortcuts.

Phase 10 — Mobile QA
  Use templates/mobile-qa.md.

Phase 11 — Safety QA
  Use templates/final-safety-qa.md.
```

Full phased plan: [`resources/style-application-checklist.md`](./resources/style-application-checklist.md).

## Output format

Each implementation step must return:

```text
1. Visual audit (bullet list, ≤20 pain points).
2. Files to modify (exact paths, must match TARGET_ALLOWED_FILES).
3. Files NOT to touch (confirm against TARGET_FORBIDDEN_FILES).
4. Visual changes proposed (concise per-file description).
5. Minimal implementation plan with QA gates.
6. Confirmation: "No business logic, data fetching, schema, API payloads, auth, or routes were changed."
7. Desktop QA checklist (≥1280px).
8. Mobile QA checklist (375/390): zero overflow, table→card, touch ≥44px.
9. Build plan: detect package manager from lockfile; run tsc --noEmit; run build; report results.
```

## QA checklist

```text
BUILD
[ ] tsc --noEmit PASS (no NEW errors)
[ ] build PASS
[ ] lint did not regress vs Phase 0 baseline

VISUAL
[ ] Cards rounded-2xl + ring-1 ring-black/5 + shadow-sm
[ ] Hero gradient navy→violet (if applicable)
[ ] Semantic pills used; no color-only status
[ ] tabular-nums on all numbers; currency bold navy

DASHBOARD (if applicable)
[ ] 5-section hierarchy: Hero → Action → Today → Next 24h → Insights
[ ] ≤4 KPIs in hero
[ ] Action card hides when count===0

MOBILE 375 / 390
[ ] Zero horizontal overflow
[ ] Tables converted to cards
[ ] Touch targets ≥ 44px
[ ] Dialog max-h-[60vh] + scroll
[ ] Inputs text-base

ACCESSIBILITY
[ ] WCAG AA contrast
[ ] focus-visible ring on all interactive
[ ] Status never color-only

INTEGRITY (HARD)
[ ] No business logic changed
[ ] No schema changed
[ ] No routes renamed
[ ] No auth logic changed
[ ] No API payload changed
[ ] No private data copied
[ ] No new dependencies unless approved
```

## Usage examples

**Example 1 — audit only**
> Use the profrance-visual-style skill to audit this dashboard only. Do not modify files.

**Example 2 — single page polish**
> Use the profrance-visual-style skill to polish only `src/app/dashboard/page.tsx`. Visual-only. Preserve all data logic.

**Example 3 — dashboard conversion**
> Use the profrance-visual-style skill to convert this dashboard into the ProFrance-style hierarchy. No query changes.

**Example 4 — mobile QA**
> Use the profrance-visual-style skill to run mobile QA after the visual polish.

**Example 5 — single component**
> Use the profrance-visual-style skill to polish only `src/components/ui/Button.tsx`. Preserve props and handlers. Visual-only.

## Resources

| File | Use |
|------|-----|
| [`resources/visual-transfer-kit.md`](./resources/visual-transfer-kit.md) | Unified design system reference (tokens, recipes, advanced systems). |
| [`resources/style-application-checklist.md`](./resources/style-application-checklist.md) | Operational phased checklist (13 phases + acceptance criteria). |
| [`resources/apply-to-real-system-prompt.md`](./resources/apply-to-real-system-prompt.md) | Copy-ready English prompts for real projects (8 variants). |
| [`templates/audit-only.md`](./templates/audit-only.md) | Read-only audit prompt. |
| [`templates/apply-one-page.md`](./templates/apply-one-page.md) | Single-page polish prompt. |
| [`templates/apply-one-component.md`](./templates/apply-one-component.md) | Single-component polish prompt. |
| [`templates/dashboard-conversion.md`](./templates/dashboard-conversion.md) | Dashboard hierarchy conversion prompt. |
| [`templates/mobile-qa.md`](./templates/mobile-qa.md) | Mobile QA prompt (375/390/tablet/desktop). |
| [`templates/final-safety-qa.md`](./templates/final-safety-qa.md) | Final safety QA prompt before merge. |
