#!/usr/bin/env zsh
set -euo pipefail

# Pick best available package manager
pm="pnpm"
command -v pnpm >/dev/null 2>&1 || pm="yarn"
command -v yarn >/dev/null 2>&1 || pm="npm"

case "$pm" in
  pnpm) pnpm add -D tweakpane@4.0.5 @tweakpane/plugin-essentials@0.2.1 ;;
  yarn) yarn add -D tweakpane@4.0.5 @tweakpane/plugin-essentials@0.2.1 ;;
  npm)  npm  i  -D tweakpane@4.0.5 @tweakpane/plugin-essentials@0.2.1 ;;
esac

echo "✓ Installed tweakpane@4.0.5 and @tweakpane/plugin-essentials@0.2.1 with $pm"
