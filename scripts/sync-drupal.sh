#!/usr/bin/env bash
# Copies the shipped files (everything not export-ignored in .gitattributes) into the Drupal test site's magoo module.
# The Lando container can't see this repo, so this is how a change gets there. Dev-only, never shipped.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dest="${MAGOO_DRUPAL_MODULE:-$HOME/projects/drupal-test/web/modules/custom/magoo}"

mkdir -p "$dest"
rsync -a --delete \
  --exclude-from=<(awk '$2 == "export-ignore" { print $1 }' "$root/.gitattributes"; printf '%s\n' node_modules .git .gitattributes .gitignore '.probe*' storybook-static) \
  "$root/" "$dest/"
echo "synced to $dest"
