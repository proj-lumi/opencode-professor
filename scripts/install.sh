#!/bin/sh
set -eu

repo_dir=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
source_file="$repo_dir/.opencode/agents/professor.md"
config_dir=${OPENCODE_CONFIG_DIR:-"$HOME/.config/opencode"}
destination="$config_dir/agents/professor.md"
marker='<!-- Managed by opencode-professor. -->'

if [ ! -f "$source_file" ]; then
  printf 'Professor installation is incomplete; missing %s\n' "$source_file" >&2
  exit 1
fi

if [ -e "$destination" ] || [ -L "$destination" ]; then
  if [ ! -f "$destination" ] || ! grep -Fq "$marker" "$destination"; then
    printf 'Refusing to overwrite existing path: %s\n' "$destination" >&2
    printf '%s\n' 'Move it aside or remove it, then run the installer again.' >&2
    exit 1
  fi
  rm -f "$destination"
fi

mkdir -p "$(dirname "$destination")"
cp "$source_file" "$destination"
printf 'installed %s\n' "$destination"
printf '%s\n' 'Restart OpenCode Desktop and select Professor.'
