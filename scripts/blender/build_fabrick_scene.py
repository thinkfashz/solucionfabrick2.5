"""
Build a structured Soluciones Fabrick Blender starter scene for the Three.js viewer.

Run inside Blender:
  blender --background --python scripts/blender/build_fabrick_scene.py

This is a production scaffold, not an engineering model. Dimensions follow the
current conceptual viewer data and should be replaced by surveyed/approved
project geometry before construction use.
"""
from __future__ import annotations

import math
import bpy
from mathutils import Vector

WIDTH = 14.51
DEPTH = 13.41
WALL_H = 2.85
WALL_T = 0.10

COLLECTIONS = [
    "ARCH",
    "KITCH",
    "BATH",
    "STRUCT",
    "MEP_ELECTRIC",
    "MEP_WATER",
    "MEP_SANITARY",
    "TERRAIN",
    "LIGHTS",
]

ROOMS = [
    ("primary-bedroom", "Dormitorio principal", -7.05, -3.8, 4.25, 4.4),
    ("primary-bath", "Baño principal", -7.05, .7, 2.5, 2.0),
    ("bedroom-2", "Dormitorio 2", -7.05, 2.8, 5.1, 2.7),
    ("social", "Living comedor", -2.65, -5.5, 6.0, 5.9),
    ("kitchen", "Cocina", 3.55, -1.7, 3.45, 3.15),
    ("laundry", "Logia", -1.75, 2.4, 2.05, 3.1),
    ("entry", "Acceso", .45, 1.7, 1.8, 3.8),
    ("guest-bath", "Baño visitas", 2.5, 1.7, 2.3, 1.65),
    ("pantry", "Despensa", 5.0, 1.7, 2.0, 1.65),
    ("bath-2", "Baño dormitorio 2", 2.5, 3.55, 2.3, 1.95),
    ("technical", "Sala técnica", 5.0, 3.55, 2.0, 1.95),
]

# x, z, length, axis, openings(center, width, sill, head)
WALLS = [
    (-7.255, .85, 9.7, "z", [(-2.4,1.8,.8,2.25),(3.7,1.8,.8,2.25)]),
    (7.255, .85, 9.7, "z", [(-.4,1.5,1.15,2.3),(4.4,1.1,.8,2.2)]),
    (0, 5.7, 14.51, "x", [(-4.8,2,.8,2.3),(1.3,1.15,0,2.25),(6,1.1,.8,2.3)]),
    (-5.05, -4, 4.41, "x", [(-5,1.8,0,2.5)]),
    (5.38, -4, 3.75, "x", [(5.2,1.7,0,2.5)]),
    (-2.85, -4.85, 1.7, "z", []),
    (3.505, -4.85, 1.7, "z", []),
    (.3275, -5.7, 6.355, "x", [(.3275,5.8,0,2.7)]),
    (-2.75, -1.55, 4.9, "z", [(.15,.9,0,2.15)]),
    (-4.95, .9, 4.4, "x", []),
    (-4.65, 2.65, 5.2, "x", [(-3.25,.9,0,2.15)]),
    (-4.5, 1.8, 1.8, "z", [(1.8,.8,0,2.15)]),
    (-1.9, 4.25, 2.9, "z", []),
    (-.75, 2.3, 2.3, "x", [(-.7,.8,0,2.15)]),
    (.4, 4, 3.4, "z", []),
    (2.4, 3.55, 4.3, "z", [(2.2,.8,0,2.15),(4.6,.8,0,2.15)]),
    (4.8, 1.5, 4.8, "x", []),
    (4.8, 3.45, 4.8, "x", []),
    (4.9, 3.6, 4.2, "z", [(2.3,.7,0,2.15),(4.5,.8,0,2.15)]),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        if collection.name != "Collection":
            bpy.data.collections.remove(collection)


def ensure_collection(name: str):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    return coll


def move_to_collection(obj, collection):
    for coll in list(obj.users_collection):
        coll.objects.unlink(obj)
    collection.objects.link(obj)


def material(name: str, color, rough=.8, metallic=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def viewer_to_blender(location):
    """Convert viewer (x, z-plan, y-up) to Blender (x, y-plan, z-up).

    glTF export with export_yup=True maps Blender Y to -glTF Z, so the negative
    plan-depth here preserves the current Three.js front/rear orientation.
    """
    x, plan_z, up_y = location
    return (x, -plan_z, up_y)


def cube(name, location, scale, coll, mat=None):
    bpy.ops.mesh.primitive_cube_add(location=viewer_to_blender(location))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, coll)
    if mat:
        obj.data.materials.append(mat)
    return obj


def wall(name, x, z, length, axis, coll, mat):
    dims = (length, WALL_T, WALL_H) if axis == "x" else (WALL_T, length, WALL_H)
    return cube(name, (x, z, WALL_H / 2), dims, coll, mat)


def setup_world():
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.world.color = (0.055, 0.075, 0.095)


def build_architecture(collections):
    white = material("MAT_Wall_White_Matte", (0.91, 0.91, 0.89), .88)
    concrete = material("MAT_Concrete", (.45, .46, .44), .92)
    floor = material("MAT_Porcelain_Warm", (.73, .70, .64), .48)
    glass = material("MAT_Glass", (.42, .58, .64), .18)
    glass.diffuse_color = (.42, .58, .64, .32)
    glass.surface_render_method = "DITHERED"
    door_mat = material("MAT_Door_Warm", (.42, .28, .16), .58)

    radier = cube("ARCH_FLOOR_Radier", (0, .85, -.08), (WIDTH, 9.7, .16), collections["ARCH"], concrete)
    radier["materialId"] = "hormigon"
    finish = cube("ARCH_FLOOR_Finish", (0, .85, .025), (14.1, 9.3, .045), collections["ARCH"], floor)
    finish["materialId"] = "porcelanato"

    for index, (x, z, length, axis, openings) in enumerate(WALLS, 1):
        obj = wall(f"ARCH_WALL_{index:02d}", x, z, length, axis, collections["ARCH"], white)
        obj["roomSystem"] = "architecture"
        obj["finish"] = "white-matte"
        obj["materialId"] = "volcanita-st"

        for opening_index, (center, opening_w, sill, head) in enumerate(openings, 1):
            opening_h = max(.05, head - sill)
            ox = center if axis == "x" else x
            oz = z if axis == "x" else center
            cutter_dims = (opening_w, WALL_T * 5, opening_h) if axis == "x" else (WALL_T * 5, opening_w, opening_h)
            cutter = cube(
                f"TEMP_OPENING_{index:02d}_{opening_index:02d}",
                (ox, oz, sill + opening_h / 2),
                cutter_dims,
                collections["ARCH"],
            )
            modifier = obj.modifiers.new(name=f"OPENING_{opening_index:02d}", type="BOOLEAN")
            modifier.operation = "DIFFERENCE"
            modifier.solver = "EXACT"
            modifier.object = cutter
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(False)
            bpy.data.objects.remove(cutter, do_unlink=True)

            if sill <= .01:
                hinge = bpy.data.objects.new(f"ARCH_DOOR_W{index:02d}_{opening_index:02d}", None)
                hinge_x = center - opening_w / 2 if axis == "x" else x
                hinge_z = z if axis == "x" else center - opening_w / 2
                hinge.location = viewer_to_blender((hinge_x, hinge_z, 0))
                hinge["openAngleDeg"] = 95
                hinge["openSign"] = 1
                hinge["openingWidthM"] = opening_w
                collections["ARCH"].objects.link(hinge)

                panel = cube(
                    f"ARCH_DOOR_W{index:02d}_{opening_index:02d}_PANEL",
                    (hinge_x, hinge_z, 0),
                    (opening_w, .045, head) if axis == "x" else (.045, opening_w, head),
                    collections["ARCH"],
                    door_mat,
                )
                panel.parent = hinge
                panel.matrix_parent_inverse.identity()
                panel.location = (opening_w / 2, 0, head / 2) if axis == "x" else (0, -opening_w / 2, head / 2)
            else:
                window = cube(
                    f"ARCH_WINDOW_W{index:02d}_{opening_index:02d}",
                    (ox, oz, sill + opening_h / 2),
                    (opening_w, .032, opening_h) if axis == "x" else (.032, opening_w, opening_h),
                    collections["ARCH"],
                    glass,
                )
                window["openingWidthM"] = opening_w
                window["sillM"] = sill
                window["headM"] = head

    for room_id, label, x, z, w, d in ROOMS:
        marker = bpy.data.objects.new(f"ARCH_ROOM_{room_id.upper().replace('-', '_')}", None)
        marker.empty_display_type = "CUBE"
        marker.empty_display_size = .25
        marker.location = viewer_to_blender((x + w / 2, z + d / 2, .05))
        marker["label"] = label
        marker["widthM"] = w
        marker["depthM"] = d
        collections["ARCH"].objects.link(marker)


def build_kitchen(collections):
    body = material("MAT_Kitchen_Body", (.72, .69, .63), .72)
    front = material("MAT_Kitchen_Front", (.84, .82, .77), .66)
    stone = material("MAT_Countertop", (.68, .68, .66), .36)
    steel = material("MAT_Stainless", (.62, .66, .68), .28, .78)

    x = 6.82
    base_depth = .61
    base_h = .762
    modules = [
        (.61, -1.22, "SINK"),
        (.76, -.535, "DRAWERS"),
        (.61, .15, "COOKTOP"),
        (.46, .685, "STORAGE"),
    ]

    for idx, (width, z, module_type) in enumerate(modules, 1):
        base = cube(
            f"KITCH_BASE_{idx:02d}_{module_type}",
            (x, z, .12 + base_h / 2),
            (base_depth, width - .018, base_h),
            collections["KITCH"],
            body,
        )
        base["moduleType"] = module_type
        cube(
            f"KITCH_FRONT_{idx:02d}",
            (x - base_depth / 2 - .012, z, .12 + base_h / 2),
            (.024, width - .045, base_h - .035),
            collections["KITCH"],
            front,
        )

    cube("KITCH_COUNTERTOP_01", (x - .015, -.27, .93), (.66, 2.52, .055), collections["KITCH"], stone)
    cube("KITCH_APPLIANCE_FRIDGE_01", (6.82, 1.34, 1.15), (.68, .62, 2.06), collections["KITCH"], steel)
    cube("KITCH_TALL_PANTRY_01", (6.82, -1.82, 1.15), (.61, .46, 2.06), collections["KITCH"], front)

    upper_depth = .376
    upper_h = .762
    upper_y = 2.13
    for idx, (width, z, module_type) in enumerate(modules, 1):
        if module_type == "COOKTOP":
            continue
        cube(
            f"KITCH_WALL_{idx:02d}_{module_type}",
            (7.01, z, upper_y),
            (upper_depth, width - .022, upper_h),
            collections["KITCH"],
            body,
        )

        # Door pivot sits on the hinge edge. Mesh is a child so Three.js can rotate the parent.
        hinge = bpy.data.objects.new(f"KITCH_DOOR_{idx:02d}", None)
        hinge.location = viewer_to_blender((6.81, z - width / 2 + .02, upper_y))
        hinge["openAngleDeg"] = 110
        hinge["openSign"] = -1 if idx % 2 == 0 else 1
        collections["KITCH"].objects.link(hinge)

        door = cube(
            f"KITCH_DOOR_{idx:02d}_PANEL",
            (6.81, z - width / 2 + .02, upper_y),
            (.035, width - .05, upper_h - .04),
            collections["KITCH"],
            front,
        )
        door.parent = hinge
        door.matrix_parent_inverse.identity()
        door.location = (0, -(width - .05) / 2, 0)

    cube("KITCH_SINK_01", (6.48, -1.22, .96), (.42, .44, .08), collections["KITCH"], steel)


def build_structure(collections):
    steel = material("MAT_Metalcon", (.67, .72, .75), .34, .72)
    osb = material("MAT_OSB", (.67, .47, .25), .76)

    for index, (x, z, length, axis, openings) in enumerate(WALLS, 1):
        # Lightweight guide studs. Detailed production framing should come from the approved model.
        count = max(2, int(length / .8))
        for stud in range(count + 1):
            offset = -length / 2 + length * stud / count
            coordinate = (x + offset) if axis == "x" else (z + offset)
            if any(abs(coordinate - center) < opening_w / 2 - .04 for center, opening_w, _, _ in openings):
                continue
            sx = x + (offset if axis == "x" else 0)
            sz = z + (offset if axis == "z" else 0)
            stud_obj = cube(f"STRUCT_METALCON_W{index:02d}_{stud:02d}", (sx, sz, WALL_H / 2), (.055, .055, WALL_H), collections["STRUCT"], steel)
            stud_obj["materialId"] = "metalcon"

        dims = (length, .018, WALL_H) if axis == "x" else (.018, length, WALL_H)
        osb_obj = cube(f"STRUCT_OSB_W{index:02d}", (x, z, WALL_H / 2), dims, collections["STRUCT"], osb)
        osb_obj["materialId"] = "osb-estructural"


def build_mep(collections):
    electric = material("MAT_Electric", (1.0, .78, .0), .5)
    water_cold = material("MAT_Water_Cold", (.06, .36, .75), .4)
    water_hot = material("MAT_Water_Hot", (.72, .16, .08), .4)
    sanitary = material("MAT_Sanitary", (.22, .68, .72), .5)

    cube("MEP_ELEC_PANEL_01", (4.95, 4.8, 1.55), (.45, .12, .62), collections["MEP_ELECTRIC"], electric)
    cube("MEP_WATER_COLD_MAIN", (6.2, 2.3, -.28), (.045, 6.0, .045), collections["MEP_WATER"], water_cold)
    cube("MEP_WATER_HOT_MAIN", (5.95, 2.3, -.24), (.035, 5.8, .035), collections["MEP_WATER"], water_hot)
    cube("MEP_SAN_MAIN", (2.8, 3.8, -.35), (.11, 7.5, .11), collections["MEP_SANITARY"], sanitary)


def build_terrain(collections):
    grass = material("MAT_Grass_Fallback", (.22, .34, .16), .98)
    terrain = cube("TERRAIN_BASE_01", (0, 0, -.32), (80, 80, .3), collections["TERRAIN"], grass)
    terrain["gaeaReplacement"] = True


def build_lights(collections):
    data = bpy.data.lights.new("LIGHT_Sun", type="SUN")
    data.energy = 2.0
    data.color = (1.0, .91, .75)
    sun = bpy.data.objects.new("LIGHT_Sun", data)
    sun.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-42))
    collections["LIGHTS"].objects.link(sun)

    for idx, location in enumerate([(0, -1, 2.55), (4.8, -.6, 2.55), (-4.8, -1.9, 2.55)], 1):
        data = bpy.data.lights.new(f"LIGHT_Interior_{idx:02d}", type="POINT")
        data.energy = 90
        data.color = (1.0, .76, .52)
        data.shadow_soft_size = .5
        light = bpy.data.objects.new(f"LIGHT_Interior_{idx:02d}", data)
        light.location = viewer_to_blender(location)
        collections["LIGHTS"].objects.link(light)


def main():
    clear_scene()
    setup_world()
    collections = {name: ensure_collection(name) for name in COLLECTIONS}

    build_architecture(collections)
    build_kitchen(collections)
    build_structure(collections)
    build_mep(collections)
    build_terrain(collections)
    build_lights(collections)

    scene = bpy.context.scene
    scene["fabrickViewerContract"] = "2026.09"
    scene["units"] = "meters"
    scene["conceptualModel"] = True

    print("Fabrick Blender starter scene created.")
    print("Next: assign production PBR maps / Gaea terrain, verify openings and run export_fabrick_glb.py.")


if __name__ == "__main__":
    main()
