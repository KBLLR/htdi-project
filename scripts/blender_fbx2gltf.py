# scripts/blender_fbx2gltf.py
# Blender 4.5+ batch-convert FBX → GLB/GLTF from the command line or Blender UI.
#
# Usage (CLI):
#   BLENDER="/Applications/Blender.app/Contents/MacOS/Blender"
#   "$BLENDER" -b -P scripts/blender_fbx2gltf.py -- \
#     --src ./assets/fbx --dst ./assets/gltf --format glb --recursive
#
# Usage (from Blender Text Editor > Run Script):
#   - Set defaults below or pass args via Window > Toggle System Console (on Windows)
#
# Notes:
#   - Exports *without* Draco/meshopt (use glTF-Transform/gltfpack later if needed).
#   - Preserves animations, skins, morphs. Applies object transforms on export.
#   - Mirrors folder structure from --src into --dst when --recursive is set.
#   - Writes conversion manifest to --dst/_fbx2gltf_manifest.csv

import bpy
import os
import sys
import csv
import time
import argparse
from pathlib import Path


# ------------- argument parsing (works both in Blender & CLI) -----------------
def parse_args():
    # Blender passes its own args before '--'. We only read after '--'.
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser(
        description="Batch convert FBX to GLB/GLTF using Blender."
    )
    parser.add_argument(
        "--src",
        type=str,
        default="./assets/fbx",
        help="Source directory containing .fbx files",
    )
    parser.add_argument(
        "--dst",
        type=str,
        default="./assets/gltf",
        help="Destination directory for outputs",
    )
    parser.add_argument(
        "--format",
        type=str,
        default="glb",
        choices=["glb", "gltf_embedded", "gltf_separate"],
        help="Output format: glb | gltf_embedded | gltf_separate",
    )
    parser.add_argument(
        "--recursive", action="store_true", help="Recurse into subdirectories"
    )
    parser.add_argument(
        "--filter",
        type=str,
        default="*.fbx",
        help="Glob pattern for FBX files (default: *.fbx)",
    )
    parser.add_argument(
        "--fps", type=int, default=30, help="Export frame rate (sampling) hint"
    )
    parser.add_argument(
        "--force_sampling", action="store_true", help="Force animation sampling"
    )
    parser.add_argument(
        "--apply_scale",
        type=float,
        default=1.0,
        help="Import FBX global scale (1.0 by default)",
    )
    parser.add_argument("--verbose", action="store_true", help="Print per-file details")

    args = parser.parse_args(argv)
    return args


# ----------------------------- utils -----------------------------------------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def ensure_parent_dir(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)


def export_format_key(fmt: str) -> str:
    if fmt == "glb":
        return "GLB"
    if fmt == "gltf_embedded":
        return "GLTF_EMBEDDED"
    if fmt == "gltf_separate":
        return "GLTF_SEPARATE"
    return "GLB"


def find_fbx_files(src_dir: Path, pattern: str, recursive: bool):
    if recursive:
        return sorted(src_dir.rglob(pattern))
    return sorted(src_dir.glob(pattern))


# ----------------------------- core ------------------------------------------
def import_fbx(fbx_path: Path, global_scale: float, verbose: bool):
    # Use conservative, widely-compatible FBX import options.
    return bpy.ops.import_scene.fbx(
        filepath=str(fbx_path),
        use_image_search=True,
        automatic_bone_orientation=True,
        global_scale=global_scale,
        bake_anim=True,  # bring animation in as keyframes
        use_custom_props=True,
    )


def export_gltf(
    output_path: Path, fmt_key: str, fps: int, force_sampling: bool, verbose: bool
):
    # Map to Blender glTF exporter options (avoid version-fragile flags).
    # See: bpy.ops.export_scene.gltf.__doc__ in Blender Python console for your version.
    return bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format=fmt_key,
        check_existing=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",  # export materials if present
        export_colors=True,
        export_cameras=False,
        export_lights=False,  # Blender exporter typically ignores lights; keep False
        export_extras=False,
        export_yup=True,
        export_apply=True,  # apply object transforms on export
        export_animations=True,
        export_frame_range=True,
        export_frame_step=max(1, round(30 / max(1, fps))),  # simple step heuristic
        export_force_sampling=force_sampling,
        export_nla_strips=True,
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_skins=True,
        export_image_format="AUTO",  # let exporter decide PNG/JPEG
    )


def convert_one(
    fbx_path: Path, dst_root: Path, src_root: Path, fmt_key: str, args
) -> dict:
    t0 = time.time()
    rel = (
        fbx_path.relative_to(src_root)
        if fbx_path.is_relative_to(src_root)
        else fbx_path.name
    )
    rel_no_suffix = Path(str(rel)).with_suffix("")
    # Mirror folder structure when recursive:
    if args.recursive and isinstance(rel, Path):
        out_base = dst_root / rel_no_suffix
    else:
        out_base = dst_root / Path(fbx_path.stem)

    if fmt_key == "GLB":
        out_path = out_base.with_suffix(".glb")
    elif fmt_key == "GLTF_EMBEDDED":
        out_path = out_base.with_suffix(".gltf")
    else:  # GLTF_SEPARATE
        out_path = out_base.with_suffix(".gltf")

    ensure_parent_dir(out_path)

    # Reset scene, import FBX
    reset_scene()
    if args.verbose:
        print(f"[import] {fbx_path}")
    result_import = import_fbx(fbx_path, args.apply_scale, args.verbose)
    if "FINISHED" not in result_import:
        raise RuntimeError(f"FBX import failed for {fbx_path}")

    # Export to GLB/GLTF
    if args.verbose:
        print(f"[export] → {out_path}")
    result_export = export_gltf(
        out_path, fmt_key, args.fps, args.force_sampling, args.verbose
    )
    if "FINISHED" not in result_export:
        raise RuntimeError(f"glTF export failed for {fbx_path}")

    # Clean again to free memory between files
    reset_scene()

    elapsed = time.time() - t0
    return {
        "fbx": str(fbx_path),
        "out": str(out_path),
        "format": fmt_key,
        "seconds": f"{elapsed:.2f}",
        "ok": True,
    }


def main():
    args = parse_args()
    src_root = Path(args.src).resolve()
    dst_root = Path(args.dst).resolve()
    dst_root.mkdir(parents=True, exist_ok=True)

    fmt_key = export_format_key(args.format)
    files = find_fbx_files(src_root, args.filter, args.recursive)

    manifest_rows = []
    ok_count, fail_count = 0, 0

    if not files:
        print(f"[fbx2gltf] No files found in {src_root} matching {args.filter}")
        return

    print(
        f"[fbx2gltf] Converting {len(files)} FBX file(s) from {src_root} → {dst_root} as {fmt_key}"
    )

    for fbx in files:
        try:
            row = convert_one(fbx, dst_root, src_root, fmt_key, args)
            manifest_rows.append(row)
            ok_count += 1
            if args.verbose:
                print(f"[done] {fbx.name} → {row['out']} ({row['seconds']}s)")
        except Exception as e:
            fail_count += 1
            manifest_rows.append(
                {
                    "fbx": str(fbx),
                    "out": "",
                    "format": fmt_key,
                    "seconds": "0.00",
                    "ok": False,
                    "error": str(e),
                }
            )
            print(f"[error] {fbx} :: {e}")

    # Write manifest
    manifest_path = dst_root / "_fbx2gltf_manifest.csv"
    with open(manifest_path, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["fbx", "out", "format", "seconds", "ok", "error"]
        )
        writer.writeheader()
        for row in manifest_rows:
            if "error" not in row:
                row["error"] = ""
            writer.writerow(row)

    print(
        f"[fbx2gltf] Done. OK: {ok_count}, Fail: {fail_count}. Manifest: {manifest_path}"
    )


if __name__ == "__main__":
    main()
