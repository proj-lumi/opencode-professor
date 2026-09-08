#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
config_dir=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
marker='Managed by opencode-professor.'
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

for resource in $resources; do
  source_rel=${resource%%:*}
  source_file="$repo_dir/$source_rel"
  if [ ! -f "$source_file" ]; then
    printf 'Professor installation is incomplete; missing %s\n' "$source_file" >&2
    exit 1
  fi
done

for resource in $resources; do
  destination_rel=${resource#*:}
  destination="$config_dir/$destination_rel"
  if [ -e "$destination" ] || [ -L "$destination" ]; then
    if [ ! -f "$destination" ] || ! grep -Fq "$marker" "$destination"; then
      printf 'Refusing to overwrite existing path: %s\n' "$destination" >&2
      printf '%s\n' 'Move it aside or remove it, then run the installer again.' >&2
      exit 1
    fi
  fi
done

for resource in $resources; do
  source_rel=${resource%%:*}
  destination_rel=${resource#*:}
  source_file="$repo_dir/$source_rel"
  destination="$config_dir/$destination_rel"
  mkdir -p "$(dirname "$destination")"
  rm -f "$destination"
  cp "$source_file" "$destination"
  printf 'installed %s\n' "$destination"
done

printf '%s\n' 'Restart OpenCode Desktop, select Professor, or run /teach.'
