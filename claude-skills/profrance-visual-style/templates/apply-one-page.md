# Template — Apply ProFrance visual style to ONE PAGE

> Paste into Claude Code. Applies the ProFrance visual style to a single page only. Visual-only. Minimal diff.

```text
ROLE
Senior Frontend Engineer applying the ProFrance premium visual style to ONE page only.

SCOPE
TARGET_PAGE:             <fill path, e.g. src/app/dashboard/page.tsx>
TARGET_ALLOWED_FILES:    <fill globs>
TARGET_FORBIDDEN_FILES:  <fill globs>

CONSTRAINTS
- One page only. Visual-only. Minimal diff.
- Preserve architecture, routes, data fetching, business logic, auth, API payloads, schema.
- Do not add dependencies.
- Do not refactor unrelated code.

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

STYLE TO APPLY
- Page shell: min-h-screen bg-[#F7F8FC] p-4 sm:p-6 lg:p-8.
- Cards: rounded-2xl bg-white shadow-sm ring-1 ring-black/5; hover:shadow-md only if clickable.
- KPI: rounded-xl bg-white p-4 + text-2xl font-bold tabular-nums text-[#002D72].
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#002D72]/30 disabled:opacity-50 disabled:cursor-not-allowed.
- Secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50.
- Ghost: bg-transparent text-[#002D72] hover:bg-[#002D72]/10.
- Badges: rounded-full bg-{tone}-50 px-2.5 py-0.5 text-[11px] font-semibold text-{tone}-700 ring-1 ring-{tone}-200 (tones: emerald/amber/rose/blue/teal/slate).
- Form input: w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base focus:border-[#002D72] focus:ring-2 focus:ring-[#002D72]/10.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- All numbers tabular-nums; currency bold navy right-aligned.

PROCEDURE
1. Read the target page file(s).
2. Identify visual issues (pastel cards, wrong radius, missing ring, color-only status, mobile overflow).
3. Propose edits without applying yet.
4. After owner approval, apply edits with minimal diff.
5. Run tsc --noEmit and build.
6. Verify mentally (or via preview) at 1280 and 375 viewports.

RETURN
1. Files changed: exact paths (must match TARGET_ALLOWED_FILES).
2. Visual improvements: per-file bullet summary.
3. What was preserved (props, handlers, queries, routes, schema, auth): explicit confirmation.
4. QA checklist desktop + mobile 375px (overflow, touch, readability).
5. Diff summary (concise).
6. tsc + build PASS/FAIL.
```
