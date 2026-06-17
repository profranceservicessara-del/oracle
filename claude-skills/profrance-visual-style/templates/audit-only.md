# Template — Audit only (read-only)

> Paste this into Claude Code to perform a read-only visual audit of the target SaaS. NO file modifications.

```text
ROLE
Senior UI Architect doing a READ-ONLY visual audit of the target SaaS.

MISSION
Audit the current visual system. DO NOT modify any file. DO NOT run any dev server unless TARGET_LOCALHOST is provided AND owner approves.

TARGET PROJECT (fill before running)
TARGET_REPO:                  <fill>
TARGET_STACK:                 <fill>
TARGET_ALLOWED_FILES:         <fill globs — for read scope only>
TARGET_FORBIDDEN_FILES:       <fill globs — do not read business logic deeply>

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Copy only the visual system, interaction style, layout philosophy, and premium SaaS UI patterns.

INSPECT
- App shell, sidebar, topbar, page background.
- Dashboard hierarchy and KPI placement.
- Card patterns (radius, border, shadow, ring).
- Buttons (primary/secondary/ghost/destructive variants).
- Badges / status pills (semantic color usage; color-only flagged).
- Forms (input style, label position, error state, required indicator).
- Dialogs (modal vs drawer, mobile behavior).
- Tables / lists (mobile transform present?).
- Mobile behavior at 375/390 (overflow risk).
- Color tokens, typography scale, spacing, radius, shadow scales.
- Hover/focus states (focus-visible used?).
- Loading states (skeleton / spinner / missing).
- Empty states (compact / generic / missing).
- Error states (banner / inline / hidden in console).
- Z-index collisions (modal/drawer/dropdown/tooltip/toast).
- Toast / notification system style.
- Tooltip / popover system z-index + mobile fallback.
- Print styles (chrome hidden? page breaks?).
- Charts (library? colors token-aligned? multi-currency rule?).
- Keyboard shortcuts (Cmd+K? help overlay?).

RETURN
1. Current visual problems (bullets, max 25).
2. Color issues (token gaps, inconsistencies, saturation).
3. Card issues (mixed radius, heavy shadows, pastel blocks).
4. Dashboard hierarchy issues (number overload, duplicates, wrong urgency).
5. Mobile risks (specific elements likely to overflow at 375px).
6. Inconsistent components (e.g. 3 button styles, 2 badge systems).
7. Safest first file/page to polish (low data dependency, high visual impact).
8. Proposed sprint plan: ordered phases with effort estimate (S/M/L).
9. Baseline tsc + build status (report only, do not fix).
10. Pre-existing lint warnings (report only, do not touch).

DO NOT modify any file. DO NOT propose code yet. Audit only.
```
