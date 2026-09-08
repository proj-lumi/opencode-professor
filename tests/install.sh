#!/bin/sh
set -eu

root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
temp_dir=$(mktemp -d)
trap 'rm -rf "$temp_dir"' EXIT HUP INT TERM
export OPENCODE_CONFIG_DIR="$temp_dir/config"
destination="$OPENCODE_CONFIG_DIR/agents/professor.md"
source_file="$root/.opencode/agents/professor.md"

"$root/scripts/install.sh" >/dev/null
[ -f "$destination" ]
cmp "$source_file" "$destination"

printf '%s\n' '<!-- Managed by opencode-professor. -->' 'stale' > "$destination"
"$root/scripts/install.sh" >/dev/null
cmp "$source_file" "$destination"

"$root/scripts/uninstall.sh" >/dev/null
[ ! -e "$destination" ]

mkdir -p "$(dirname "$destination")"
printf '%s\n' 'user-owned' > "$destination"
if "$root/scripts/install.sh" >/dev/null 2>&1; then
  printf '%s\n' 'installer overwrote an unmanaged agent' >&2
  exit 1
fi
grep -Fxq 'user-owned' "$destination"

printf '%s\n' 'shell installer tests passed'
