"""
Soluciones Fabrick — Gaea -> Blender terrain importer.

Example:
  blender fabrick-house.blend --background \
    --python scripts/blender/import_gaea_terrain.py -- \
    --height //assets/gaea/terrain_height.exr \
    --color //assets/gaea/terrain_albedo.png \
    --normal //assets/gaea/terrain_normal.png \
    --splat //assets/gaea/terrain_splat.png \
    --size 80 \
    --height-scale 4.5

The result is a TERRAIN_GAEA_01 object with custom properties understood by the
Three.js asset contract. This is a visualization pipeline, not survey-grade
topography unless the source heightfield is georeferenced and calibrated.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def args() -> argparse.Namespace:
    raw = sys.argv
    raw = raw[raw.index("--") + 1 :] if "--" in raw else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--height", required=True)
    parser.add_argument("--color")
    parser.add_argument("--normal")
    parser.add_argument("--splat")
    parser.add_argument("--ao")
    parser.add_argument("--size", type=float, default=80.0)
    parser.add_argument("--height-scale", type=float, default=4.5)
    parser.add_argument("--subdivisions", type=int, default=256)
    return parser.parse_args(raw)


def path(value: str | None) -> str | None:
    if not value:
        return None
    return str(Path(bpy.path.abspath(value)).resolve()) if value.startswith("//") else str(Path(value).expanduser().resolve())


def collection(name: str):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def image_node(nodes, links, label: str, filepath: str | None, colorspace: str, target_socket):
    if not filepath:
        return None
    image = bpy.data.images.load(filepath, check_existing=True)
    image.colorspace_settings.name = colorspace
    node = nodes.new("ShaderNodeTexImage")
    node.label = label
    node.name = label
    node.image = image
    node.interpolation = "Linear"
    links.new(node.outputs["Color"], target_socket)
    return node


def build_material(color_path: str | None, normal_path: str | None, ao_path: str | None):
    mat = bpy.data.materials.get("MAT_Gaea_Terrain") or bpy.data.materials.new("MAT_Gaea_Terrain")
    mat.use_nodes = True
    tree = mat.node_tree
    nodes, links = tree.nodes, tree.links
    for node in list(nodes):
        nodes.remove(node)

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = .92
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    color = None
    if color_path:
        img = bpy.data.images.load(color_path, check_existing=True)
        img.colorspace_settings.name = "sRGB"
        color = nodes.new("ShaderNodeTexImage")
        color.name = "GAEA_ALBEDO"
        color.image = img
        links.new(color.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        bsdf.inputs["Base Color"].default_value = (.18, .28, .12, 1)

    if ao_path:
        ao_img = bpy.data.images.load(ao_path, check_existing=True)
        ao_img.colorspace_settings.name = "Non-Color"
        ao = nodes.new("ShaderNodeTexImage")
        ao.name = "GAEA_AO"
        ao.image = ao_img
        if color:
            multiply = nodes.new("ShaderNodeMixRGB")
            multiply.blend_type = "MULTIPLY"
            multiply.inputs[0].default_value = .48
            links.new(color.outputs["Color"], multiply.inputs[1])
            links.new(ao.outputs["Color"], multiply.inputs[2])
            links.new(multiply.outputs["Color"], bsdf.inputs["Base Color"])

    if normal_path:
        img = bpy.data.images.load(normal_path, check_existing=True)
        img.colorspace_settings.name = "Non-Color"
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = "GAEA_NORMAL"
        tex.image = img
        normal = nodes.new("ShaderNodeNormalMap")
        normal.space = "TANGENT"
        normal.inputs["Strength"].default_value = .55
        links.new(tex.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    return mat


def main():
    opt = args()
    height_path = path(opt.height)
    color_path = path(opt.color)
    normal_path = path(opt.normal)
    splat_path = path(opt.splat)
    ao_path = path(opt.ao)

    if not height_path or not Path(height_path).exists():
        raise FileNotFoundError(f"Heightmap not found: {height_path}")

    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"

    coll = collection("TERRAIN")
    for obj in list(coll.objects):
        if obj.name.startswith("TERRAIN_GAEA_"):
            bpy.data.objects.remove(obj, do_unlink=True)

    subdivisions = max(32, min(512, opt.subdivisions))
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=subdivisions,
        y_subdivisions=subdivisions,
        size=opt.size,
        location=(0, 0, 0),
    )
    terrain = bpy.context.object
    terrain.name = "TERRAIN_GAEA_01"
    for owner in list(terrain.users_collection):
        owner.objects.unlink(terrain)
    coll.objects.link(terrain)

    height_img = bpy.data.images.load(height_path, check_existing=True)
    height_img.colorspace_settings.name = "Non-Color"
    texture = bpy.data.textures.new("GAEA_HEIGHT", type="IMAGE")
    texture.image = height_img

    displace = terrain.modifiers.new("GAEA_HEIGHT_DISPLACE", type="DISPLACE")
    displace.texture = texture
    displace.texture_coords = "UV"
    displace.mid_level = .5
    displace.strength = opt.height_scale

    terrain.data.materials.append(build_material(color_path, normal_path, ao_path))
    terrain["source"] = "Gaea"
    terrain["units"] = "meters"
    terrain["heightScaleM"] = opt.height_scale
    terrain["terrainSizeM"] = opt.size
    terrain["splatMap"] = splat_path or ""
    terrain["materialId"] = "gaea-terrain"
    terrain["conceptualTerrain"] = True

    # Keep the modifier live for Blender iteration; export script may apply it
    # once terrain proportions are approved.
    bpy.context.view_layer.objects.active = terrain
    terrain.select_set(True)

    print(f"Imported Gaea terrain: {height_path}")
    print(f"Grid: {subdivisions} x {subdivisions}; size: {opt.size} m; height scale: {opt.height_scale} m")
    if splat_path:
        print(f"Splat map preserved as metadata: {splat_path}")


if __name__ == "__main__":
    main()
