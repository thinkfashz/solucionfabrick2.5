import bpy, math, os

OUT = os.environ.get('FABRICK_OUT', '/tmp/air-room-premium.glb')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metallic=0.0, roughness=0.6):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.metallic = metallic
    m.roughness = roughness
    return m

def cube(name, loc, scale, material, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (scale[0]/2, scale[1]/2, scale[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        o.data.materials.append(material)
    if bevel > 0:
        mod = o.modifiers.new('SoftEdges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cyl(name, loc, radius, depth, material, rot=(0,0,0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    if material:
        o.data.materials.append(material)
    return o

def sphere(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=18, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        o.data.materials.append(material)
    return o

wall = mat('MAT_Wall_Plaster', (0.82,0.78,0.71), roughness=.84)
wood = mat('MAT_Wood_Oak', (0.27,0.13,0.055), roughness=.48)
wood_light = mat('MAT_Wood_Floor', (0.46,0.25,0.10), roughness=.50)
fabric = mat('MAT_Fabric_Linen', (0.69,0.63,0.56), roughness=.92)
fabric_dark = mat('MAT_Fabric_Throw', (0.18,0.19,0.19), roughness=.95)
rug = mat('MAT_Rug_Wool', (0.56,0.50,0.43), roughness=.98)
white = mat('MAT_AC_Plastic', (0.93,0.94,0.92), roughness=.26)
black = mat('MAT_Black_Metal', (0.025,0.027,0.03), metallic=.55, roughness=.25)
glass = mat('MAT_Glass', (0.28,0.55,0.72), metallic=.05, roughness=.08)
plant = mat('MAT_Plant', (0.08,0.24,0.10), roughness=.78)
terracotta = mat('MAT_Pot', (0.34,0.27,0.20), roughness=.82)

# Architectural shell, open front for the web camera.
cube('Floor_Slab', (0,0,-.08), (5.6,4.4,.16), wood_light, .015)
cube('Back_Wall', (0,-2.12,1.45), (5.6,.16,3.05), wall, .015)
cube('Left_Wall', (-2.72,0,1.45), (.16,4.4,3.05), wall, .015)
cube('Right_Wall', (2.72,0,1.45), (.16,4.4,3.05), wall, .015)
cube('Ceiling', (0,0,2.98), (5.6,4.4,.12), wall, .015)

# Window.
cube('Window_Frame_Top', (-2.60,-.45,2.42), (.10,1.80,.10), white, .01)
cube('Window_Frame_Bottom', (-2.60,-.45,.62), (.10,1.80,.10), white, .01)
cube('Window_Frame_L', (-2.60,-1.30,1.52), (.10,.10,1.90), white, .01)
cube('Window_Frame_R', (-2.60,.40,1.52), (.10,.10,1.90), white, .01)
cube('Window_Glass', (-2.64,-.45,1.52), (.025,1.62,1.70), glass, .005)

# Timber feature wall.
for i in range(15):
    x = -1.55 + i*.11
    cube(f'Slat_{i:02d}', (x,-1.99,1.48), (.055,.10,2.55), wood, .012)

# Bed, mattress, duvet and pillows.
cube('Headboard', (0,-1.68,1.05), (2.52,.22,1.28), fabric, .11)
cube('Bed_Base', (0,-.60,.35), (2.42,2.15,.42), fabric, .10)
cube('Mattress', (0,-.62,.66), (2.34,2.06,.28), white, .10)
cube('Duvet', (0,-.50,.86), (2.22,1.85,.18), fabric, .08)
cube('Throw', (0,.15,.98), (2.12,.48,.10), fabric_dark, .045)
for x in (-.63,.63):
    p = cube('Pillow', (x,-1.18,1.02), (.82,.38,.25), white, .10)
    p.rotation_euler = (math.radians(-8),0,math.radians(3*x))

# Bench.
cube('Bench_Top', (0,.83,.48), (1.85,.62,.28), fabric, .10)
for x in (-.72,.72):
    for y in (.62,1.02):
        cube('Bench_Leg', (x,y,.22), (.06,.06,.42), black, .008)

# Nightstands and lamps.
for x in (-1.62,1.62):
    cube('Nightstand', (x,-1.04,.46), (.72,.58,.58), wood, .055)
    cube('Nightstand_Drawer', (x,-.72,.52), (.58,.04,.18), wood_light, .012)
    cyl('Lamp_Base', (x,-1.08,.80), .16,.06,black)
    cyl('Lamp_Stem', (x,-1.08,1.05), .025,.46,black)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(x,-1.08,1.32), scale=(.24,.24,.17))
    shade = bpy.context.object
    shade.name = 'Lamp_Shade'
    shade.data.materials.append(black)

cube('Rug', (0,.15,.035), (3.35,2.70,.055), rug, .018)

# Air conditioner and visible installation path.
cube('AC_Body', (1.10,-1.94,2.25), (1.55,.34,.48), white, .12)
cube('AC_Vent', (1.10,-1.72,2.05), (1.20,.045,.08), black, .012)
cube('AC_Louver', (1.10,-1.68,2.01), (.92,.025,.035), glass, .005)
cube('AC_Display', (1.61,-1.755,2.27), (.15,.025,.10), black, .008)
cube('AC_Trunk_V', (2.18,-1.985,1.73), (.12,.08,.90), white, .02)
cube('AC_Trunk_H', (1.82,-1.985,2.14), (.68,.08,.12), white, .02)

# Artwork.
for x in (-.35,.35):
    cube('Frame', (x,-1.995,1.72), (.48,.06,.62), wood, .018)
    cube('Artwork', (x,-1.955,1.72), (.38,.02,.50), wall, .005)

# Plant.
cyl('Plant_Pot', (-2.15,1.28,.34), .28,.60,terracotta)
cyl('Plant_Trunk', (-2.15,1.28,.90), .035,1.05,wood)
for i in range(18):
    a = i*2.399
    r = .18 + (i%4)*.04
    z = 1.10 + (i%7)*.13
    sphere('Plant_Leaf', (-2.15+math.cos(a)*r,1.28+math.sin(a)*r,z), (.10,.045,.18), plant)

for x,y in [(-1.8,-1.2),(0,-1.2),(1.8,-1.2),(-1.8,1.2),(0,1.2),(1.8,1.2)]:
    cyl('Downlight', (x,y,2.91), .08,.035,black)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_animations=False, export_materials='EXPORT')
print('FABRICK_GLTF_EXPORT', OUT)
