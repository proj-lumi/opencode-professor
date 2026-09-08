#!/bin/sh
set -eu

config_dir=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
destination="$config_dir/agents/professor.md"
marker='<!-- Managed by opencode-professor. -->'

if [ ! -e "$destination" ] && [ ! -L "$destination" ]; then
  printf '%s\n' 'Professor is already absent.'
  exit 0
fi

if [ ! -f "$destination" ] || ! grep -Fq "$marker" "$destination"; then
  printf 'kept %s (not managed by opencode-professor)\n' "$destination"
  exit 0
fi

rm -f "$destination"
printf 'removed %s\n' "$destination"
