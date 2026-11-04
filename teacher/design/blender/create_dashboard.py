"""Generate Teacher Desk artwork: blender -b --python design/blender/create_dashboard.py."""
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0, roughness=.38):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return mat


ivory = material('Warm porcelain', (.89, .85, .73))
paper = material('Paper', (.99, .98, .9))
sage = material('Sage green', (.43, .59, .37))
lime = material('Fresh lime', (.7, .83, .34))
forest = material('Deep forest', (.055, .16, .12))
amber = material('Apricot', (.95, .54, .24))
clay = material('Terracotta', (.69, .32, .19))
gold = material('Brass', (.65, .49, .23), .55, .28)
screen = material('Screen mint', (.58, .8, .65))


def box(name, location, scale, mat, bevel=.08, rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.z = rotation
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 4
        obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return obj


def cylinder(name, location, radius, depth, mat, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Rounded rim', 'BEVEL')
    bevel.width = .045
    bevel.segments = 3
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def leaf(name, start, end, width):
    midpoint = (Vector(start) + Vector(end)) / 2
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width, width * .32, (Vector(end) - Vector(start)).length / 2)
    obj.rotation_euler = (Vector(end) - Vector(start)).to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(sage if width > .18 else lime)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


# Floating porcelain desktop, with a slim green inset edge.
box('Floating desk underside', (0, 0, -.14), (6.4, 4.4, .32), sage, .22)
box('Porcelain desktop', (0, 0, .04), (6.55, 4.55, .28), ivory, .23)

# Stacked books: cover, page block, upper cover.
for i, (x, y, z, mat, angle) in enumerate([
    (-1.7, .65, .34, forest, -.12),
    (-1.65, .65, .68, sage, -.04),
    (-1.7, .68, 1.02, lime, .1),
]):
    box(f'Book {i} lower cover', (x, y, z - .11), (1.75, 1.3, .075), mat, .045, angle)
    box(f'Book {i} pages', (x, y, z), (1.66, 1.21, .17), paper, .025, angle)
    box(f'Book {i} upper cover', (x, y, z + .12), (1.75, 1.3, .075), mat, .045, angle)

# Open laptop with dimensional teaching-load bars.
box('Laptop base', (.75, .35, .27), (2.35, 1.65, .15), forest, .1)
box('Keyboard insert', (.75, .55, .36), (1.95, .8, .025), sage, .035)
for row in range(3):
    for col in range(8):
        box(f'Key {row}-{col}', (-.02 + col * .22, .3 + row * .22, .39), (.16, .13, .025), ivory, .02)
box('Trackpad', (.75, -.12, .36), (.62, .28, .018), ivory, .04)
panel = box('Laptop lid', (.75, 1.15, 1.13), (2.35, .15, 1.65), forest, .1)
box('Laptop display', (.75, 1.055, 1.16), (2.08, .04, 1.35), screen, .065)
box('Display heading', (.35, 1.015, 1.62), (.95, .04, .065), forest, .025)
for i, height in enumerate([.3, .52, .38, .7, .55, .82]):
    box(f'Display graph bar {i}', (-.02 + i * .3, .99, .61 + height / 2), (.18, .055, height), forest if i == 5 else sage, .035)

# Notebook with raised checklist rows.
box('Notebook cover', (-.85, -1.05, .29), (1.65, 1.35, .13), amber, .07, -.08)
box('Notebook paper', (-.85, -1.05, .39), (1.52, 1.22, .1), paper, .04, -.08)
for i in range(4):
    box(f'Checklist square {i}', (-1.37, -.74 - i * .19, .455), (.1, .1, .02), sage, .02)
    box(f'Checklist row {i}', (-.8, -.74 - i * .19, .455), (.65, .035, .02), sage, .012)
for i in range(6):
    cylinder(f'Notebook binding {i}', (-1.62, -.62 - i * .17, .47), .042, .12, gold)

# Oversized pencil lying beside notebook.
cylinder('Pencil', (.62, -1.25, .34), .09, 1.6, amber, (0, math.pi / 2, -.18))
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.09, radius2=0, depth=.28, location=(1.54, -1.42, .34))
bpy.context.object.name = 'Pencil tip'
bpy.context.object.rotation_euler = (0, math.pi / 2, -.18)
bpy.context.object.data.materials.append(forest)

# Potted plant, framing the laptop without covering its display.
cylinder('Plant pot', (2.35, -.8, .47), .39, .61, clay)
cylinder('Pot soil', (2.35, -.8, .79), .32, .035, forest)
for i in range(7):
    angle = i * math.tau / 7
    end = (2.35 + math.cos(angle) * .55, -.8 + math.sin(angle) * .48, 1.5 + (i % 3) * .16)
    leaf(f'Plant leaf {i}', (2.35, -.8, .77), end, .17 + (i % 2) * .035)

# Floating rounded achievement tile.
box('Achievement tile', (-2.25, 1.25, 2.05), (.85, .25, .85), paper, .14, -.12)
cylinder('Achievement seal', (-2.25, 1.08, 2.05), .25, .06, gold, (math.pi / 2, 0, 0))

world = bpy.data.worlds.new('Studio world')
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (.8, .86, .77, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = .45


def area(name, location, energy, size):
    bpy.ops.object.light_add(type='AREA', location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.rotation_euler = (Vector((0, 0, .5)) - obj.location).to_track_quat('-Z', 'Y').to_euler()


area('Large soft key', (-3, -4, 8), 850, 5)
area('Soft fill', (4, 1, 6), 550, 4)
area('Warm edge', (-2, 5, 5), 650, 3)
bpy.ops.object.camera_add(location=(8, -11, 9))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, .6)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 8.7
scene = bpy.context.scene
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1120
scene.render.resolution_y = 840
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'
scene.render.filepath = str(ROOT / 'frontend/dist/assets/teacher-desk-3d.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'design/blender/teacher-desk.blend'))
bpy.ops.render.render(write_still=True)
