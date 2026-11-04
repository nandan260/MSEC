"""Build an editable 22-second Blender film from the real project scenes.

blender -b --python brag-output/create_cinematic.py
blender -b brag-output/teacher-desk-cinematic.blend -a
"""
import math
import random
import shutil
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'brag-output'
WORK = OUT / 'work'
for path in (OUT / 'assets', WORK / 'frames', WORK / 'stills'):
    path.mkdir(parents=True, exist_ok=True)
logo_file = OUT / 'assets/ms-engineering-college-logo.png'
if not logo_file.exists():
    shutil.copyfile('/tmp/codex-clipboard-FZF1HN.png', logo_file)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection':
        bpy.data.collections.remove(collection)

scene = bpy.context.scene
scene.name = 'Teacher Desk | Cinematic film'
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 32
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.fps = 24
scene.frame_start = 1
scene.frame_end = 528
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.compression = 15
scene.render.filepath = str(WORK / 'frames/frame_')
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.022, .012, .045, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .22


def material(name, color, metallic=0, roughness=.4, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Metallic'].default_value = metallic
    node.inputs['Roughness'].default_value = roughness
    if emission:
        node.inputs['Emission Color'].default_value = (*color, 1)
        node.inputs['Emission Strength'].default_value = emission
    return mat


plum = material('Film / deep plum', (.024, .012, .045), .2, .48)
chrome = material('Film / amethyst metal', (.2, .075, .36), .65, .25)
lavender = material('Film / lavender rim', (.5, .26, .87), .3, .3, 2)
coral = material('Film / warm coral', (.94, .17, .28), .25, .3, 1.2)
white = material('Film / typography', (.92, .88, 1), 0, .45, .65)
secondary = material('Film / secondary typography', (.52, .42, .67), 0, .5, .55)
porcelain = material('Film / porcelain', (.97, .96, .99), .05, .3)


def collection(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col


def move_to(obj, col):
    for current in list(obj.users_collection):
        current.objects.unlink(obj)
    col.objects.link(obj)


def empty(name, col, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    col.objects.link(obj)
    obj.location = location
    return obj


def box(name, location, dimensions, mat, col, bevel=.12, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft machined edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 5
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    move_to(obj, col)
    if parent:
        obj.parent = parent
    return obj


font_path = '/usr/share/fonts/noto/NotoSans-Regular.ttf'
font_bold_path = '/usr/share/fonts/noto/NotoSans-Bold.ttf'
font = bpy.data.fonts.load(font_path)
bold = bpy.data.fonts.load(font_bold_path)


def text(name, content, position, size, col, mat=white, parent=None, weight=False):
    data = bpy.data.curves.new(name, 'FONT')
    data.body = content
    data.font = bold if weight else font
    data.size = size
    data.space_line = 1.13
    data.extrude = .001
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    obj.location = position
    obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
        obj.visible_shadow = False
    return obj


def keyed(obj, path, frames_and_values, interpolation='BEZIER'):
    for frame, value in frames_and_values:
        setattr(obj, path, value)
        obj.keyframe_insert(data_path=path, frame=frame)
    # Blender 5's layered Actions expose curves through channel bags.
    action = obj.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    if curve.data_path == path:
                        for key in curve.keyframe_points:
                            key.interpolation = interpolation
                            key.handle_left_type = 'AUTO_CLAMPED'
                            key.handle_right_type = 'AUTO_CLAMPED'


def load_asset(filename, name, col, location, scale=1):
    with bpy.data.libraries.load(str(ROOT / 'design/blender' / filename)) as (source, target):
        target.objects = source.objects
    root = empty(name, col, location)
    root.scale = (scale,) * 3
    objects = []
    for obj in target.objects:
        if obj and obj.type in {'MESH', 'FONT', 'EMPTY'}:
            col.objects.link(obj)
            objects.append(obj)
    imported = set(objects)
    for obj in objects:
        if obj.parent not in imported:
            obj.parent = root
    return root, objects


def arc(name, center, radius, col, mat=lavender, start=0, end=math.tau, squash=1):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 24
    data.bevel_depth = .018
    data.bevel_resolution = 3
    spline = data.splines.new('POLY')
    count = 160
    spline.points.add(count - 1)
    for i, point in enumerate(spline.points):
        angle = start + (end - start) * i / (count - 1)
        point.co = (radius * math.cos(angle), radius * math.sin(angle) * squash, 0, 1)
    obj = bpy.data.objects.new(name, data)
    col.objects.link(obj)
    obj.location = center
    obj.data.materials.append(mat)
    return obj


stage = collection('00 | Studio, lighting and camera')
box('Continuous dark studio floor', (44, 0, -.75), (130, 50, .12), plum, stage, .04)


def area(name, location, target, energy, size, color):
    bpy.ops.object.light_add(type='AREA', location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.data.color = color
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    move_to(obj, stage)
    return obj


for x in [0, 30, 60, 90]:
    area(f'Stage {x} / soft key', (x - 4, -4, 10), (x, 0, 0), 1450, 8, (1, .91, .85))
    area(f'Stage {x} / lavender edge', (x + 5, 3, 5), (x, 0, .2), 1100, 5, (.57, .34, 1))
    area(f'Stage {x} / fill', (x + 3, -1, 8), (x, 0, 0), 650, 6, (.76, .84, 1))

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = 'Film camera | animated five-shot sequence'
camera.data.type = 'ORTHO'
camera.data.lens = 50
camera.data.clip_end = 250
move_to(camera, stage)
scene.camera = camera


def camera_key(frame, location, target, ortho):
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = ortho
    camera.keyframe_insert(data_path='location', frame=frame)
    camera.keyframe_insert(data_path='rotation_euler', frame=frame)
    camera.data.keyframe_insert(data_path='ortho_scale', frame=frame)


# Shot 01: exact supplied logo, mounted on a dimensional plaque.
intro = collection('01 | College identity reveal | 0–4s')
logo_image = bpy.data.images.load(str(logo_file))
logo_mat = bpy.data.materials.new('College logo | original image, unchanged')
logo_mat.use_nodes = True
nodes = logo_mat.node_tree.nodes
nodes.clear()
texture = nodes.new('ShaderNodeTexImage')
texture.image = logo_image
# The clipboard image includes a three-pixel black capture border below the
# supplied logo. Crop only that border through UV mapping; keep the mark intact.
coordinates = nodes.new('ShaderNodeTexCoord')
mapping = nodes.new('ShaderNodeMapping')
mapping.inputs['Scale'].default_value = (1, 132 / 135, 1)
mapping.inputs['Location'].default_value = (0, 3 / 135, 0)
logo_mat.node_tree.links.new(coordinates.outputs['UV'], mapping.inputs['Vector'])
logo_mat.node_tree.links.new(mapping.outputs['Vector'], texture.inputs['Vector'])
emission = nodes.new('ShaderNodeEmission')
emission.inputs['Strength'].default_value = .85
output = nodes.new('ShaderNodeOutputMaterial')
logo_mat.node_tree.links.new(texture.outputs['Color'], emission.inputs['Color'])
logo_mat.node_tree.links.new(emission.outputs[0], output.inputs[0])


def logo_plaque(name, position, width, col):
    root = empty(name, col, position)
    height = width * 132 / 470
    box(name + ' / amethyst backing', (0, 0, 0), (width + .27, height + .27, .18), chrome, col, .13, root)
    box(name + ' / white face', (0, 0, .12), (width + .08, height + .08, .12), porcelain, col, .09, root)
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, .187))
    plane = bpy.context.object
    plane.name = name + ' / supplied logo image'
    plane.scale = (width / 2, height / 2, 1)
    plane.data.materials.append(logo_mat)
    move_to(plane, col)
    plane.parent = root
    return root


opening_logo = logo_plaque('Opening logo', (0, .62, .35), 8.7, intro)
keyed(opening_logo, 'rotation_euler', [(1, (.95, -.24, -.04)), (32, (.03, 0, 0)), (76, (0, 0, 0)), (96, (.08, 0, 0))])
keyed(opening_logo, 'scale', [(1, (.76,) * 3), (34, (1,) * 3), (96, (1.02,) * 3)])
for i, radius in enumerate([4.85, 5.2]):
    ring = arc('Identity / luminous orbit ' + str(i), (0, .6, -.25), radius, intro, lavender if i == 0 else coral, -.1, math.tau - .35, .59)
    ring.data.bevel_factor_end = 0
    ring.data.keyframe_insert(data_path='bevel_factor_end', frame=1 + i * 6)
    ring.data.bevel_factor_end = 1
    ring.data.keyframe_insert(data_path='bevel_factor_end', frame=40 + i * 6)
text('Opening product title', 'Teacher Desk', (-1.6, -1.54, .1), .43, intro, white, weight=True)
text('Opening product subtitle', 'A little more headspace.', (-1.4, -2.04, .1), .2, intro, secondary)
camera_key(1, (0, -5.5, 19), (0, .2, 0), 13.8)
camera_key(42, (0, -2.1, 19), (0, .05, 0), 12.5)
camera_key(96, (.22, -1.7, 19), (0, 0, 0), 12.25)

# Shot 02: the actual desk model, with a drifting isometric camera.
desk_col = collection('02 | Made for teaching | 4–8s')
desk_root, desk_objects = load_asset('teacher-desk.blend', 'Desk hero / animated group', desk_col, (32, 0, .05))
keyed(desk_root, 'rotation_euler', [(97, (0, 0, -.18)), (192, (0, 0, .04))])
keyed(desk_root, 'location', [(97, (32, 0, -.12)), (120, (32, 0, .1)), (192, (32, 0, .2))])
arc('Desk / orbital accent', (32, 0, -.35), 4.1, desk_col, lavender, .25, 5.5, .85)
camera_key(97, (37.5, -12, 10), (29.5, 0, .6), 14.7)
camera_key(192, (36, -11.5, 11), (29.5, 0, .65), 14.05)


def overlay(name, col, start, end):
    root = empty(name, col)
    root.parent = camera
    keyed(root, 'scale', [(1, (0,) * 3), (start - 1, (0,) * 3), (start, (1,) * 3), (end, (1,) * 3), (end + 1, (0,) * 3), (529, (0,) * 3)], 'CONSTANT')
    return root


desk_copy = overlay('Desk / camera-facing titles', desk_col, 97, 192)
text('Desk / eyebrow', 'TEACHER DESK', (-6.3, 2.55, -10), .17, desk_col, secondary, desk_copy)
text('Desk / title', 'Made for\nteaching.', (-6.3, 1.35, -10), .76, desk_col, white, desk_copy, True)
text('Desk / subtitle', 'Classes. Attendance. Progress.', (-6.3, -.93, -10), .22, desk_col, secondary, desk_copy)
text('Desk / detail', 'One thoughtful workspace.', (-6.3, -1.34, -10), .22, desk_col, secondary, desk_copy)

# Shot 03/04: the actual editable dashboard, with staggered panel entrances.
dash_col = collection('03 | Dashboard reveal and focus | 8–18s')
dash_root, dashboard = load_asset('teacher-dashboard.blend', 'Dashboard / complete interface', dash_col, (60, 0, 0))
groups = {}
for name in ['Sidebar', 'Welcome', 'Activity', 'Workspace', 'Attendance', 'Health', 'Tasks']:
    groups[name] = empty('Dashboard panel / ' + name, dash_col)
    groups[name].parent = dash_root
for obj in dashboard:
    if obj.parent != dash_root or obj.name.startswith('Application frame'):
        continue
    x, y = obj.location.x, obj.location.y
    if x < -5.3:
        key = 'Sidebar'
    elif 1.1 <= y <= 4:
        key = 'Welcome'
    elif y < -2.5:
        key = 'Attendance' if x < -1.2 else 'Health' if x < 3.2 else 'Tasks'
    elif -.1 >= y >= -2.5:
        key = 'Workspace' if x > 3.2 else 'Activity'
    else:
        continue
    obj.parent = groups[key]
for i, (name, group) in enumerate(groups.items()):
    start = 193 + i * 3
    keyed(group, 'location', [(1, (0, 0, -.35)), (start, (0, 0, -.35)), (start + 22, (0, 0, 0)), (528, (0, 0, 0))])
keyed(dash_root, 'rotation_euler', [(193, (.045, -.06, -.015)), (230, (0, 0, 0)), (432, (0, 0, 0))])
for i, obj in enumerate(o for o in dashboard if o.name.startswith('Chart column /')):
    height = obj.dimensions.y
    center = obj.location.y
    baseline = center - height / 2
    keyed(obj, 'scale', [(1, (1, .02, 1)), (217 + i * 3, (1, .02, 1)), (245 + i * 3, (1, 1, 1)), (528, (1, 1, 1))])
    keyed(obj, 'location', [(1, (obj.location.x, baseline + height * .01, obj.location.z)), (217 + i * 3, (obj.location.x, baseline + height * .01, obj.location.z)), (245 + i * 3, (obj.location.x, center, obj.location.z)), (528, (obj.location.x, center, obj.location.z))])
camera_key(193, (60, -7, 24), (60, 0, 0), 21.8)
camera_key(254, (60.25, -4.8, 24), (60, 0, 0), 19.9)
camera_key(336, (60.55, -4.2, 24), (60.2, -.12, 0), 19.3)
camera_key(337, (59.9, -6, 19), (59.6, -1.85, .12), 12.2)
camera_key(388, (60.8, -5.8, 19), (60.5, -1.8, .12), 12.05)
camera_key(432, (61.4, -5.5, 19), (61.1, -1.75, .12), 12.1)

focus_copy = overlay('Focus / camera-facing titles', dash_col, 337, 432)
overlay_ink = material('Film / unlit title backing', (.025, .012, .045), emission=1)
box('Focus / title backing', (-2.3, 2.65, -10.1), (6.5, .8, .04), overlay_ink, dash_col, .1, focus_copy)
text('Focus / heading', 'Everything, in focus.', (-5.2, 2.48, -10), .36, dash_col, white, focus_copy, True)

# Shot 05: logo and product together, with a generous final hold.
final_col = collection('04 | Brand finale | 18–22s')
final_logo = logo_plaque('Final logo', (86.1, 1.5, .7), 5.8, final_col)
keyed(final_logo, 'rotation_euler', [(433, (.22, -.12, -.02)), (460, (.03, 0, 0)), (528, (0, 0, 0))])
mini_root, mini_objects = load_asset('teacher-dashboard.blend', 'Final / miniature dashboard', final_col, (94.1, 0, .7), .43)
keyed(mini_root, 'rotation_euler', [(433, (.04, -.13, .035)), (475, (.03, -.05, -.015)), (528, (.03, -.02, -.02))])
keyed(mini_root, 'location', [(433, (94.3, 0, .5)), (467, (94.1, 0, .85)), (528, (94.1, 0, .95))])
text('Final / heading', 'More space\nto teach.', (83.1, -.75, .7), .75, final_col, white, weight=True)
text('Final / product', 'Teacher Desk', (83.1, -2.75, .7), .26, final_col, secondary)
arc('Final / luminous orbit', (94.1, 0, -.3), 4.3, final_col, lavender, -.7, 4.6, .78)
camera_key(433, (90, -4.8, 24), (90, 0, 0), 18.8)
camera_key(477, (90, -3.5, 24), (90, 0, 0), 18.4)
camera_key(528, (90, -3.1, 24), (90, 0, 0), 18.25)

# Sparse studio particles add depth around the opening and closing identities.
rng = random.Random(42)
for center in [0, 90]:
    for i in range(12):
        angle = rng.random() * math.tau
        radius = rng.uniform(4.7, 7.2)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=rng.uniform(.018, .045), location=(center + math.cos(angle) * radius, math.sin(angle) * radius * .6, rng.uniform(-.4, .15)))
        obj = bpy.context.object
        obj.name = f'Studio glint / {center} / {i}'
        obj.data.materials.append(lavender if i % 3 else coral)
        move_to(obj, intro if center == 0 else final_col)

# Camera keys use eased motion; adjacent frames at cuts never interpolate on screen.
for obj in [camera, camera.data]:
    action = obj.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = 'BEZIER'
                        key.handle_left_type = 'AUTO_CLAMPED'
                        key.handle_right_type = 'AUTO_CLAMPED'

for name, frame in [('01 / College identity', 1), ('02 / Made for teaching', 97), ('03 / Dashboard reveal', 193), ('04 / Everything in focus', 337), ('05 / Brand finale', 433)]:
    marker = scene.timeline_markers.new(name, frame=frame)
    marker.camera = camera

# Original understated stereo score: no external music or licensing dependency.
import wave
sr = 48000
duration = 22
t = np.arange(sr * duration, dtype=np.float64) / sr
left = np.zeros_like(t)
right = np.zeros_like(t)
chords = [(146.832, 174.614, 220), (116.541, 146.832, 174.614), (130.813, 174.614, 220), (130.813, 164.814, 195.998), (146.832, 174.614, 220)]
for i, notes in enumerate(chords):
    start = [0, 4, 8, 14, 18][i]
    end = [4, 8, 14, 18, 22][i]
    local = t - start
    envelope = np.clip(local / .65, 0, 1) * np.clip((end + .7 - t) / 1.15, 0, 1)
    for j, note in enumerate(notes):
        pad = np.sin(math.tau * note * t + .18 * np.sin(math.tau * .15 * t))
        shimmer = .18 * np.sin(math.tau * note * 2.003 * t)
        left += .026 * (pad + shimmer) * envelope * (.9 + .1 * math.sin(j))
        right += .026 * (np.sin(math.tau * note * 1.0015 * t) + shimmer) * envelope
for start in [4, 8, 14, 18]:
    local = np.maximum(t - start, 0)
    gate = (t >= start) * np.exp(-local * 3)
    impact = .18 * np.sin(math.tau * (50 * local + 30 * (1 - np.exp(-local * 5)) / 5)) * gate
    left += impact
    right += impact
    sweep_t = t - (start - .7)
    sweep_env = np.clip(sweep_t / .7, 0, 1) ** 2 * (t < start)
    sweep = .025 * np.sin(math.tau * (210 * sweep_t + 380 * sweep_t ** 2)) * sweep_env
    left += sweep
    right += sweep
for start in np.arange(4.5, 18, .5):
    local = np.maximum(t - start, 0)
    pulse = .027 * np.sin(math.tau * 73.416 * local) * np.exp(-local * 11) * (t >= start)
    left += pulse
    right += pulse
fade = np.minimum(np.clip(t / .5, 0, 1), np.clip((duration - t) / 1.1, 0, 1))
stereo = np.stack([left * fade, right * fade], axis=1)
stereo = np.tanh(stereo * 1.6)
with wave.open(str(OUT / 'soundtrack.wav'), 'wb') as wav:
    wav.setnchannels(2)
    wav.setsampwidth(2)
    wav.setframerate(sr)
    wav.writeframes((stereo * 32767).astype('<i2').tobytes())

# Audio stays available during Blender timeline playback. Frames render visually;
# ffmpeg combines the image sequence and score into the final MP4.
editor = scene.sequence_editor_create()
editor.strips.new_sound('Original cinematic score', str(OUT / 'soundtrack.wav'), channel=1, frame_start=1)
scene.render.use_sequencer = False
scene.frame_set(265)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.overlay.show_overlays = False
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.region_3d.view_camera_zoom = 8
            area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'teacher-desk-cinematic.blend'))
print('CINEMATIC_READY', OUT / 'teacher-desk-cinematic.blend', flush=True)

if '--stills' in __import__('sys').argv:
    scene.render.resolution_percentage = 67
    for frame in [20, 64, 96, 108, 148, 190, 207, 266, 335, 365, 422, 449, 493, 528]:
        scene.frame_set(frame)
        scene.render.filepath = str(WORK / 'stills' / f'shot-{frame:04}.png')
        bpy.ops.render.render(write_still=True)
