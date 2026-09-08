#!/bin/sh
set -eu

config_dir=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
marker='Managed by opencode-professor.'
resources='
agents/professor.md
agents/professor-researcher.md
agents/professor-svg-artist.md
commands/gap.md
commands/lessons.md
commands/log.md
commands/resume.md
commands/teach.md
lib/professor-core.js
plugins/professor.js
skills/teach/SKILL.md
'

for destination_rel in $resources; do
  destination="$config_dir/$destination_rel"
  if [ ! -e "$destination" ] && [ ! -L "$destination" ]; then
    continue
  fi
  if [ ! -f "$destination" ] || ! grep -Fq "$marker" "$destination"; then
    printf 'kept %s (not managed by opencode-professor)\n' "$destination"
    continue
  fi
  rm -f "$destination"
  printf 'removed %s\n' "$destination"
done

printf '%s\n' 'Professor uninstall finished.'
