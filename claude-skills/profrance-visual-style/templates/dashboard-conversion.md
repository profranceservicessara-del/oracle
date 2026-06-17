# Template — Dashboard conversion to ProFrance hierarchy

> Paste into Claude Code. Reorganizes the target dashboard into the ProFrance command-center hierarchy.

```text
ROLE
Senior UI Architect converting the target dashboard to the ProFrance command-center hierarchy.

SCOPE
File(s):                 <path/to/dashboard>
TARGET_ALLOWED_FILES:    <fill>
TARGET_FORBIDDEN_FILES:  <fill>

CONSTRAINTS
- Visual-only reorganization. Minimal diff.
- Preserve all data queries and fetching (do not move, rename, or add).
- Preserve route links (do not change href targets).
- Do not add inline action buttons unless explicitly approved.
- Do not add new dependencies.

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only the visual hierarchy and patterns.

REQUIRED HIERARCHY (top → bottom)
1. Hero / command summary: navy gradient (from-[#001F4D] via-[#002D72] to-[#2B1F5B]), ≤4 KPIs, NO complex charts.
2. Action required: rose accent rail (h-[2px] bg-rose-400/70) + count badge (rounded-full bg-rose-50 text-rose-600 font-bold tabular-nums). HIDE entire section if count===0.
3. Today: blue accent rail. Current activity, transactions, completed items of the day.
4. Next 24h: amber accent rail. Upcoming deadlines. Date chips amber when ≤2 days.
5. Secondary insights: slate accent rail. Charts, averages, history (lowest visual weight).

RULES
- Reduce number overload: max 4 KPIs in hero; rest move into compact KPI cards below.
- Remove duplicated visual blocks (e.g. "Latest orders" + "Today's orders" identical → consolidate).
- Show urgent items first; calm urgency (rose only in count + accent rail, never paint full card red).
- Prioritize operational action over decoration: alerts and buttons appear before charts.
- Keep links to existing routes; do not change href targets.
- Do not change data queries.
- Empty states compact py-14 with icon bubble bg-slate-50 ring-1 ring-black/5.

OUTPUT
1. Before → after hierarchy diff (textual outline).
2. Removed visual blocks (list).
3. Confirmation: "Data queries preserved; only visual reorganization."
4. Desktop QA checklist (≥1280px).
5. Mobile QA checklist (375/390): cards stack, no horizontal overflow, KPIs readable.
6. tsc + build PASS/FAIL.
```
