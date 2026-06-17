#!/usr/bin/env bash
# profrance-visual-style — installer
# Usage:
#   ./install.sh global
#   ./install.sh project /path/to/target/project
#
# Behavior:
#   global  → copies skill to ~/.claude/skills/profrance-visual-style
#   project → copies skill to <TARGET>/.claude/skills/profrance-visual-style
#
# No sudo. No dependencies. macOS + Linux compatible.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="profrance-visual-style"

# Files to exclude when copying (none critical; rsync respects this if available)
EXCLUDE_PATTERNS=(
  ".DS_Store"
  "*.bak"
  "*.tmp"
  ".git"
  "install.sh.log"
)

usage() {
  cat <<EOF
profrance-visual-style installer

USAGE
  $(basename "$0") global
  $(basename "$0") project <target-project-path>

EXAMPLES
  $(basename "$0") global
  $(basename "$0") project ~/projects/my-saas
  $(basename "$0") project /Users/me/work/dashboard-app

WHAT IT DOES
  global  → installs to ~/.claude/skills/$SKILL_NAME
  project → installs to <TARGET>/.claude/skills/$SKILL_NAME

EOF
}

err() { printf '\033[31mERROR:\033[0m %s\n' "$*" >&2; }
ok()  { printf '\033[32mOK:\033[0m %s\n' "$*"; }
info(){ printf '\033[36m→\033[0m %s\n' "$*"; }

# Build rsync exclude args if rsync is available; otherwise fallback to cp
copy_skill() {
  local dest="$1"
  mkdir -p "$dest"

  if command -v rsync >/dev/null 2>&1; then
    local excludes=()
    for pat in "${EXCLUDE_PATTERNS[@]}"; do
      excludes+=(--exclude "$pat")
    done
    rsync -a --delete "${excludes[@]}" "$SCRIPT_DIR/" "$dest/"
  else
    # Fallback: cp -R then prune unwanted files
    cp -R "$SCRIPT_DIR/." "$dest/"
    for pat in "${EXCLUDE_PATTERNS[@]}"; do
      find "$dest" -name "$pat" -print -exec rm -rf {} + 2>/dev/null || true
    done
  fi
}

print_success() {
  local dest="$1"
  local scope="$2"
  cat <<EOF

$(ok "Installed profrance-visual-style ($scope)")

  Skill path: $dest

NEXT STEPS
  1. Open Claude Code in your target project.
  2. Paste a prompt like:

     Use the profrance-visual-style skill to audit this dashboard only.
     Do not modify files.

  3. Review the audit output. Then iterate phase-by-phase.

USAGE EXAMPLES (paste in Claude Code)

  # Audit only
  Use the profrance-visual-style skill to audit the current visual system.

  # Single page polish
  Use the profrance-visual-style skill to polish only src/app/dashboard/page.tsx.
  Visual-only. Preserve all data logic.

  # Dashboard conversion
  Use the profrance-visual-style skill to convert this dashboard into the
  ProFrance-style hierarchy. No query changes.

  # Mobile QA
  Use the profrance-visual-style skill to run mobile QA at 375/390/tablet/desktop.

  # Final safety QA
  Use the profrance-visual-style skill to run the final safety QA.

SAFETY
  - The skill will not copy ProFrance business data or business logic.
  - It will refuse to modify schema, auth, routes, or API payloads.
  - It will refuse to add dependencies without explicit approval.

EOF
}

main() {
  local mode="${1:-}"

  case "$mode" in
    -h|--help|help|"")
      usage
      exit 0
      ;;

    global)
      local dest="$HOME/.claude/skills/$SKILL_NAME"
      info "Installing globally to: $dest"
      copy_skill "$dest"
      print_success "$dest" "global"
      ;;

    project)
      local target="${2:-}"
      if [[ -z "$target" ]]; then
        err "Project install requires a target path."
        echo
        usage
        exit 1
      fi
      if [[ ! -d "$target" ]]; then
        err "Target project path does not exist: $target"
        exit 1
      fi
      # Resolve absolute path portably (macOS lacks readlink -f by default)
      target="$(cd "$target" && pwd)"
      local dest="$target/.claude/skills/$SKILL_NAME"
      info "Installing into project: $target"
      info "Skill path: $dest"
      copy_skill "$dest"
      print_success "$dest" "project"
      ;;

    *)
      err "Unknown mode: $mode"
      echo
      usage
      exit 1
      ;;
  esac
}

main "$@"
