#!/bin/sh
set -eu

root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT HUP INT TERM
export OPENCODE_CONFIG_DIR="$temp_dir/config"
resources='
.opencode/agents/professor.md:agents/professor.md
.opencode/agents/professor-researcher.md:agents/professor-researcher.md
.opencode/agents/professor-svg-artist.md:agents/professor-svg-artist.md
.opencode/commands/gap.md:commands/gap.md
.opencode/commands/lessons.md:commands/lessons.md
.opencode/commands/log.md:commands/log.md
.opencode/commands/resume.md:commands/resume.md
.opencode/commands/teach.md:commands/teach.md
.opencode/lib/professor-core.js:lib/professor-core.js
.opencode/plugins/professor.js:plugins/professor.js
.opencode/skills/teach/SKILL.md:skills/teach/SKILL.md
'

"$root/scripts/install.sh" >/dev/null
for resource in $resources; do
  source_rel=${resource%%:*}
  destination_rel=${resource#*:}
  cmp "$root/$source_rel" "$OPENCODE_CONFIG_DIR/$destination_rel"
done

printf '%s\n' '<!-- Managed by opencode-professor. -->' 'stale' > "$OPENCODE_CONFIG_DIR/agents/professor.md"
"$root/scripts/install.sh" >/dev/null
cmp "$root/.opencode/agents/professor.md" "$OPENCODE_CONFIG_DIR/agents/professor.md"

"$root/scripts/uninstall.sh" >/dev/null
for resource in $resources; do
  destination_rel=${resource#*:}
  [ ! -e "$OPENCODE_CONFIG_DIR/$destination_rel" ]
done

mkdir -p "$OPENCODE_CONFIG_DIR/commands"
printf '%s\n' 'user-owned' > "$OPENCODE_CONFIG_DIR/commands/teach.md"
if "$root/scripts/install.sh" >/dev/null 2>&1; then
  printf '%s\n' 'installer overwrote an unmanaged file' >&2
  exit 1
fi
[ ! -e "$OPENCODE_CONFIG_DIR/agents/professor.md" ]
grep -Fxq 'user-owned' "$OPENCODE_CONFIG_DIR/commands/teach.md"

printf '%s\n' 'shell installer tests passed'
