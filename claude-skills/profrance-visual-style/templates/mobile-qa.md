# Template — Mobile QA after visual transfer

> Paste into Claude Code. Audits mobile behavior at 375/390/tablet/desktop after applying the style.

```text
ROLE
QA Engineer + Mobile-first UX Designer auditing the target system AFTER visual transfer.

TEST VIEWPORTS
- 375 × 812 (iPhone SE/8)
- 390 × 844 (iPhone 12/13/14)
- 768 × 1024 (iPad)
- 1280 × 800 (desktop baseline)

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Visual QA only.

PROCEDURE
1. Confirm TARGET_LOCALHOST with owner. NEVER assume.
2. Open target pages in each viewport (preview MCP, Playwright, or browser devtools).
3. Verify the checklist below per page.

VERIFY PER PAGE
[ ] document.documentElement.scrollWidth === clientWidth at 375 (zero horizontal overflow)
[ ] Same at 390
[ ] Cards stack cleanly (grid-cols-1 default; sm:/md:/xl: tiers correct)
[ ] Dialogs fit viewport (max-h-[60vh] + overflow-y-auto + safe-area bottom)
[ ] Dialog internal scroll works (no body lock breaking)
[ ] Section headers wrap (flex-wrap items-center gap-3)
[ ] Buttons remain tappable (no overlap with safe-area)
[ ] Touch targets ≥ 44px (min-h-[44px] or .touch-target)
[ ] KPI numbers readable (text-2xl minimum on mobile)
[ ] Tables converted to stacked cards (hidden md:table + block md:hidden)
[ ] No clipped content (truncation OK; clipping NOT)
[ ] No giant empty vertical blocks
[ ] Inputs text-base (anti iOS zoom)
[ ] Sidebar = drawer with bg-black/50 backdrop-blur-sm at mobile
[ ] Topbar sticky + safe-area top respected
[ ] Modal backdrop scroll-locks body correctly
[ ] Badges readable at small sizes (≥ text-[10px])
[ ] Primary buttons full-width on mobile when critical

VERIFY DIALOGS
[ ] Modal max-w-sm at all sizes
[ ] Side drawer max-w-lg, sticky footer functional
[ ] Esc closes overlays
[ ] Backdrop click dismisses (where appropriate)

VERIFY CARDS
[ ] All cards rounded-2xl + ring-1 ring-black/5 + shadow-sm
[ ] No solid pastel block cards left
[ ] Hero only at top of dashboard

VERIFY BADGES
[ ] All status uses semantic pills (emerald/amber/rose/blue/teal/slate)
[ ] No color-only status (always paired with text or icon)
[ ] Badge text ≥ text-[10px] readable

RETURN
1. Per-page report: PASS / NEEDS FIX / BLOCKED.
2. Specific failures with reproduction steps (viewport + selector).
3. Suggested fixes (visual-only, minimal diff).
4. Files needing edit (must match TARGET_ALLOWED_FILES).
5. Confirmation: "No business logic / schema / routes touched."
```
