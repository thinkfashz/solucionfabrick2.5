"""
Soluciones Fabrick — Blender -> Three.js GLB exporter.

Run from Blender:
  blender fabrick-house.blend --background --python scripts/blender/export_fabrick_glb.py -- --output //public/3d/fabrick/house/fabrick-house-v1.glb

The script:
- validates meter units and naming conventions;
- applies safe transforms to static meshes;
- preserves custom properties as glTF extras;
- exports a single GLB ready for Three.js;
- keeps animation data for doors/drawers when present.

Compression is deliberately conservative by default. Turn on Meshopt/gltfpack only
when the installed Blender glTF exporter exposes those options and the web build
ships the corresponding decoder/transcoder.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy

ALLOWED_PREFIXES = (
    "ARCH_",
    "KITCH_",
    "BATH_",
    "STRUCT_",
    "MEP_ELEC_",
    "MEP_WATER_",
    "MEP_SAN_",
    "TERRAIN_",
    "LIGHT_",
)

REQUIRED_COLLECTIONS = {
    "ARCH",
    "KITCH",
    "BATH",
    "STRUCT",
    "MEP_ELECTRIC",
    "MEP_WATER",
    "MEP_SANITARY",
}

ANIMATED_PREFIXES = ("KITCH_DOOR_", "KITCH_DRAWER_", "ARCH_DOOR_")


def parse_args() -> argparse.Namespace:
    raw = sys.argv
    raw = raw[raw.index("--") + 1 :] if "--" in raw else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="//public/3d/fabrick/house/fabrick-house-v1.glb")
    parser.add_argument("--report", default="//public/3d/fabrick/house/fabrick-house-v1.report.json")
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args(raw)


def blender_path(value: str) -> Path:
    if value.startswith("//"):
        return Path(bpy.path.abspath(value)).resolve()
    return Path(value).expanduser().resolve()


def validate_scene(strict: bool) -> dict:
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    collection_names = {c.name for c in bpy.data.collections}
    missing_collections = sorted(REQUIRED_COLLECTIONS - collection_names)

    mesh_objects = [o for o in scene.objects if o.type == "MESH"]
    invalid_names = [
        o.name for o in mesh_objects
        if not o.name.startswith(ALLOWED_PREFIXES)
    ]

    non_uniform_scale = [
        o.name for o in mesh_objects
        if max(o.scale) - min(o.scale) > 1e-4
    ]

    animated = [
        o.name for o in scene.objects
        if o.name.startswith(ANIMATED_PREFIXES)
    ]

    report = {
        "units": "meters",
        "meshCount": len(mesh_objects),
        "materialCount": len(bpy.data.materials),
        "textureImageCount": len(bpy.data.images),
        "missingCollections": missing_collections,
        "invalidMeshNames": invalid_names,
        "nonUniformScale": non_uniform_scale,
        "animatedObjects": animated,
    }

    if strict and (missing_collections or invalid_names):
        raise RuntimeError(
            "Scene validation failed: " + json.dumps(report, ensure_ascii=False)
        )

    return report


def prepare_static_meshes() -> None:
    bpy.ops.object.select_all(action="DESELECT")

    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        if obj.name.startswith(ANIMATED_PREFIXES):
            # Keep object transforms/pivots for hinge/rail animation.
            continue
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.select_set(False)


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)

    kwargs = dict(
        filepath=str(output),
        export_format="GLB",
        use_selection=False,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_materials="EXPORT",
        export_colors=True,
        export_cameras=True,
        export_lights=True,
        export_extras=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
    )

    # Blender's exporter grows new options over time. Only pass optional
    # parameters when this installed build exposes them.
    properties = bpy.ops.export_scene.gltf.get_rna_type().properties

    if "export_unused_images" in properties:
        kwargs["export_unused_images"] = False
    if "export_unused_textures" in properties:
        kwargs["export_unused_textures"] = False
    if "export_gpu_instances" in properties:
        kwargs["export_gpu_instances"] = True

    bpy.ops.export_scene.gltf(**kwargs)


def main() -> None:
    args = parse_args()
    output = blender_path(args.output)
    report_path = blender_path(args.report)

    report = validate_scene(args.strict)
    prepare_static_meshes()
    export_glb(output)

    report["output"] = str(output)
    report["bytes"] = output.stat().st_size if output.exists() else 0
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
