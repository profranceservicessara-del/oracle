# Template — Final Safety QA before merge

> Paste into Claude Code. Verifies zero non-visual changes were introduced.

```text
ROLE
QA Engineer enforcing strict safety after visual transfer.

GOAL
Confirm zero non-visual changes were introduced before merge.

PRIVACY (HARD RULE)
Do not copy ProFrance business data or business logic. Verify only.

PROCEDURE
1. Detect package manager from lockfile (pnpm/yarn/npm/bun).
2. Run TypeScript: <tool> tsc --noEmit (or equivalent).
3. Run build: <tool> run build.
4. Run lint if safe: <tool> run lint — report pre-existing lint separately; DO NOT fix unrelated warnings.
5. Git diff review against last visual sprint commit.
6. Confirm each line of the hard checklist below.

HARD CHECKLIST (each line MUST be confirmed; STOP if any is NO)
[ ] tsc --noEmit PASS with no NEW errors (pre-existing reported separately)
[ ] Build PASS
[ ] Lint did not regress vs baseline
[ ] No new runtime console errors
[ ] No new hydration warnings (Next.js / Remix)
[ ] No business logic changed
[ ] No database schema changed
[ ] No database writes added/changed
[ ] No API payload structure changed
[ ] No authentication logic changed
[ ] No routes renamed
[ ] No data fetching strategy changed
[ ] No private data copied (no ProFrance fixtures / mocks / dumps)
[ ] No ProFrance workflow logic copied
[ ] No Supabase RLS / RPC / triggers copied
[ ] No new dependencies added without owner approval
[ ] No tests disabled or skipped
[ ] No type checks bypassed (no `any` added, no @ts-ignore added)
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
