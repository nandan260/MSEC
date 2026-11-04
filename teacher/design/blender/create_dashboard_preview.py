"""Editable dimensional UI preview, separate from the production artwork scene."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def mat(name, color):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    node = material.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = .55
    return material


ivory = mat('UI / Ivory canvas', (.87, .87, .81))
white = mat('UI / Porcelain cards', (.99, .99, .94))
sage = mat('UI / Sage hero', (.74, .83, .6))
green = mat('UI / Forest text', (.04, .13, .075))
muted = mat('UI / Secondary text', (.19, .26, .15))
lime = mat('UI / Lime chart', (.48, .68, .2))
amber = mat('UI / Amber chart', (.94, .53, .19))
yellow = mat('UI / Yellow chart', (.78, .83, .22))


def card(name, x, y, width, height, material=white, z=.12, depth=.12):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (width, height, depth)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('Rounded UI corners', 'BEVEL')
    bevel.width = min(.14, height / 4, depth * .7)
    bevel.segments = 5
    obj.modifiers.new('UI normals', 'WEIGHTED_NORMAL')
    return obj


font_path = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
font = bpy.data.fonts.load(str(font_path)) if font_path.exists() else None


def text(name, content, x, y, size=.16, material=green, z=.22):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = content
    curve.size = size
    curve.extrude = .001
    if font:
        curve.font = font
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = (x, y, z)
    obj.data.materials.append(material)
    return obj


# Every panel, text label and chart column is individually editable.
card('Application frame', 0, 0, 16, 10, ivory, 0, .2)
card('Sidebar', -6.65, 0, 2.55, 9.85, white, .13, .13)
text('Brand', 'Teacher Desk.', -7.55, 4.23, .29)
nav = ['Overview', 'My classes', 'Students', 'Coursework', 'Attendance', 'Assignments', 'Assessments', 'Analytics', 'Timetable', 'AI assistant', 'Teaching tools', 'Administration']
for i, label in enumerate(nav):
    y = 3.43 - i * .49
    if i == 0:
        card('Selected navigation', -6.66, y + .055, 2.2, .39, sage, .23, .05)
    card('Navigation icon / ' + label, -7.45, y + .07, .13, .13, green, .3, .025)
    text('Navigation / ' + label, label, -7.22, y, .16, z=.32)
card('Assistant promotion', -6.65, -3.82, 2.15, 1.35, sage, .23)
text('Assistant title', 'A little teaching magic.', -7.6, -3.48, .16, z=.34)
text('Assistant subtitle', 'More room for possibility.', -7.6, -3.81, .12, muted, .34)
card('Assistant button', -6.65, -4.16, 1.9, .35, green, .34, .05)
text('Assistant action', 'Explore assistant', -7.37, -4.22, .14, white, .39)

text('Breadcrumb', 'Workspace  /  Overview', -5, 4.35, .15, muted)
card('Search field', 2.4, 4.42, 3.5, .43, white)
text('Search label', 'Search anything...', .85, 4.37, .14, muted)
text('Profile name', 'Dr. Ananya Srinivas', 4.65, 4.39, .15)

card('Hero / dimensional welcome', 1.2, 2.65, 12.65, 2.65, sage, .21, .18)
text('Hero eyebrow', 'Your teaching workspace', -4.68, 3.6, .14, muted, .33)
text('Hero greeting', 'Welcome back, Dr. Ananya Srinivas.', -4.68, 3.22, .16, muted, .33)
text('Hero heading', 'Teaching overview', -4.68, 2.68, .48, green, .33)
text('Hero description', 'A clear desk. A fresh perspective.', -4.68, 2.21, .18, muted, .33)
card('Hero timetable button', -3.72, 1.73, 1.96, .43, green, .36, .1)
text('Hero timetable label', 'View timetable', -4.52, 1.66, .16, white, .43)
card('Hero attendance button', -1.43, 1.73, 2.15, .43, white, .36, .1)
text('Hero attendance label', 'Take attendance', -2.31, 1.66, .16, green, .43)

# Link the genuine modeled desk into the full dashboard hero.
with bpy.data.libraries.load(str(ROOT / 'design/blender/teacher-desk.blend')) as (source, target):
    target.objects = [name for name in source.objects if not any(token in name for token in ['Camera', 'Large soft', 'Soft fill', 'Warm edge'])]
art_root = bpy.data.objects.new('Hero artwork / move or scale this group', None)
bpy.context.collection.objects.link(art_root)
art_root.location = (4.65, 2.55, .48)
art_root.scale = (.52, .52, .52)
for obj in target.objects:
    if obj and obj.type == 'MESH':
        bpy.context.collection.objects.link(obj)
        obj.parent = art_root

text('Section heading', 'Your week at a glance', -4.95, .86, .23)
text('Section subtitle', 'Classes, progress and the next small step.', -4.95, .53, .14, muted)

card('Chart panel', -1.04, -1.05, 8.15, 2.6)
text('Weekly total', '12', -4.72, -.34, .52)
text('Weekly chart title', 'Weekly teaching overview', -3.87, -.29, .18)
text('Chart legend', 'Classes   /   Assessments   /   To review', -3.87, -.59, .12, muted)
for i, (day, count) in enumerate(zip(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], [0, 3, 2, 2, 2, 3, 0])):
    x = -4.43 + i * .77
    text('Chart weekday / ' + day, day, x, -2.07, .14, muted)
    if count:
        card('Chart column / ' + day, x + .14, -1.79 + count * .16, .38, count * .32, lime, .29, .17)
        if day == 'Tue':
            card('Chart pending reviews', x + .42, -1.66, .14, .26, amber, .29, .17)
for i, (label, value) in enumerate([('Students', '26'), ('Performance', '79%'), ('Pending', '04')]):
    x = .86 + i * .73
    text('Metric label / ' + label, label, x, -.38, .11, muted)
    text('Metric value / ' + label, value, x, -.84, .28)

card('Faculty workspace panel', 5.4, -1.05, 3.95, 2.6)
text('Workspace title', 'My workspace', 3.67, -.23, .21)
card('Faculty pass', 5.4, -1.2, 3.42, 1.35, sage, .3, .1)
text('Faculty pass label', 'FACULTY MEMBER', 3.97, -.81, .12, muted, .38)
text('Faculty pass institution', 'MSEC', 3.97, -1.22, .36, green, .38)
text('Faculty pass name', 'Dr. Ananya Srinivas', 3.97, -1.6, .16, green, .38)
text('Workspace shortcuts', 'Attendance    Assignment    Reports', 3.82, -2.1, .13, muted)

for name, x, width in [('Class attendance', -3.21, 3.8), ('Learning health', .95, 4.15), ('Goal tracker', 5.4, 3.95)]:
    card(name + ' / panel', x, -3.58, width, 2.02)
    text(name + ' / heading', name, x - width / 2 + .25, -2.97, .21)
text('Attendance percentage', '88%', -4.83, -3.62, .4)
card('Attendance track', -3.21, -4.02, 3.2, .17, ivory, .25, .06)
card('Attendance progress', -3.4, -4.02, 2.82, .17, lime, .3, .1)
text('Health metric', '22 / 26', -.86, -3.62, .4)
text('Health caption', 'Students on track', -.86, -4.04, .16, muted)
for i, label in enumerate(['Review submissions', 'Prepare Unit II paper', 'Share revision notes']):
    y = -3.45 - i * .36
    card('Task checkbox / ' + label, 3.85, y + .04, .14, .14, sage if i == 2 else ivory, .27, .06)
    text('Task / ' + label, label, 4.07, y, .14)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(ROOT / 'design/blender/dashboard-preview.png')
scene.world.color = (.38, .41, .35)
for name, location, energy, size in [('Dashboard key light', (-4, 1, 12), 1800, 10), ('Dashboard fill', (8, -2, 10), 1100, 8)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(0, -4.3, 22))
camera = bpy.context.object
camera.name = 'Dashboard presentation camera'
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 17.9
scene.camera = camera
scene.view_settings.view_transform = 'AgX'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'design/blender/teacher-dashboard.blend'))
bpy.ops.render.render(write_still=True)
