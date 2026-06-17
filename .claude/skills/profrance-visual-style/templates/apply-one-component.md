# Template — Apply ProFrance visual style to ONE COMPONENT

> Paste into Claude Code for surgical polishing of a single component file.

```text
ONE TASK. ONE FILE. ONE OBJECTIVE.

File:      <path/to/component>
Objective: <e.g. polish Button / Card / Badge / Dialog>

CONSTRAINTS
- Minimal diff. Preserve props. Preserve handlers. Preserve data flow.
- Visual-only. Mobile-safe at 375px.
- No new dependencies. No schema/API/route changes.
- No behavior changes (onClick / onChange / state machine intact).

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only visual patterns.

STYLE RULES
- Cards: rounded-2xl bg-white shadow-sm ring-1 ring-black/5. Hover lift only if clickable.
- Primary button: rounded-[1.25rem] bg-[#002D72] px-5 py-2.5 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-[#003a94] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#002D72]/30.
- Secondary: border border-slate-200 bg-white text-slate-700 hover:bg-slate-50.
- Destructive (icon-only): h-7 w-7 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500. Never full-red bg.
- Badges: rounded-full bg-{tone}-50 text-{tone}-700 ring-1 ring-{tone}-200 text-[11px] font-semibold.
- Numbers tabular-nums; currency bold navy right-aligned.
- Muted label: text-[11px] font-semibold uppercase tracking-wide text-slate-400.
- Mobile: touch ≥44px; full-width primary on small screens; no horizontal overflow.
- No neon, no bounce, no candy shadow, no solid pastel cards.

RETURN
- Diff (concise).
- Confirmation no API/props/handlers/data changed.
- Mobile-safe note (375px verified mentally or via preview).
```
