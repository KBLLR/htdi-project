# scripts/convert_fbx_with_blender.zsh
# Batch FBX → GLB/GLTF using Blender 4.5+ headless.
# Make executable: chmod +x scripts/convert_fbx_with_blender.zsh
#
# Examples:
#   scripts/convert_fbx_with_blender.zsh ./assets/fbx ./assets/gltf glb
#   scripts/convert_fbx_with_blender.zsh ./fbx ./gltf gltf_separate --recursive --verbose
#
# Env:
#   BLENDER_BIN overrides Blender path (default points to macOS app bundle).

#!/bin/zsh
set -euo pipefail

BLENDER_BIN="${BLENDER_BIN:-/Applications/Blender.app/Contents/MacOS/Blender}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PY_SCRIPT="$SCRIPT_DIR/blender_fbx2gltf.py"

SRC="${1:-$SCRIPT_DIR/../assets/fbx}"
DST="${2:-$SCRIPT_DIR/../assets/gltf}"
FMT="${3:-glb}" # glb | gltf_embedded | gltf_separate
shift $(( $# >= 3 ? 3 : $# ))

# Forward any extra flags (e.g., --recursive --verbose --fps 30 --force_sampling)
EXTRA_ARGS="$@"

mkdir -p "$DST"

echo "[fbx2gltf] Using Blender: $BLENDER_BIN"
echo "[fbx2gltf] src=$SRC  dst=$DST  format=$FMT  extra=($EXTRA_ARGS)"

"$BLENDER_BIN" -b -P "$PY_SCRIPT" -- \
  --src "$SRC" \
  --dst "$DST" \
  --format "$FMT" \
  $EXTRA_ARGS
