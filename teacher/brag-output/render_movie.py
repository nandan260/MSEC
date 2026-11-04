"""Render and encode the full Blender film; resume existing PNG frames safely."""
import json
import os
import shutil
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
FRAMES = OUT / 'work/frames'
FRAMES.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, __NV_PRIME_RENDER_OFFLOAD='1', __GLX_VENDOR_LIBRARY_NAME='nvidia')
render_code = (
    "import bpy; s=bpy.context.scene; "
    "s.eevee.taa_render_samples=32; "
    "s.render.resolution_percentage=100; s.frame_step=1; "
    "s.render.use_file_extension=True; s.render.use_overwrite=False; "
    "s.render.filepath=" + repr(str(FRAMES / 'frame_')) + "; "
    "bpy.ops.render.render(animation=True)"
)
subprocess.run([
    'blender', '-b', str(OUT / 'teacher-desk-cinematic.blend'), '-t', '6',
    '--python-exit-code', '1', '--python-expr', render_code,
], check=True, env=env)
frames = sorted(FRAMES.glob('frame_*.png'))
if len(frames) != 528:
    raise RuntimeError(f'Expected 528 frames, got {len(frames)}')

# Use the settled final brand/product frame as the poster and idle first frame.
shutil.copyfile(FRAMES / 'frame_0493.png', OUT / 'work/poster-frame.png')
shutil.copyfile(FRAMES / 'frame_0493.png', FRAMES / 'frame_0001.png')
video = OUT / 'teacher-desk-cinematic.mp4'
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'warning', '-xerror', '-y',
    '-framerate', '24', '-start_number', '1', '-i', str(FRAMES / 'frame_%04d.png'),
    '-i', str(OUT / 'soundtrack.wav'),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'loudnorm=I=-20:TP=-1.5:LRA=8',
    '-t', '22', '-movflags', '+faststart', str(video),
], check=True)
subprocess.run([
    'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
    '-i', str(OUT / 'work/poster-frame.png'), '-frames:v', '1', '-q:v', '2',
    str(OUT / 'poster.jpg'),
], check=True)
result = subprocess.run([
    'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(video)
], check=True, capture_output=True, text=True)
metadata = json.loads(result.stdout)
picture = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'video')
audio = next(stream for stream in metadata['streams'] if stream['codec_type'] == 'audio')
assert (picture['width'], picture['height']) == (1920, 1080)
assert picture['r_frame_rate'] == '24/1'
assert int(picture['nb_frames']) == 528
assert abs(float(metadata['format']['duration']) - 22) < .1
assert audio['channels'] == 2
(OUT / 'verification.json').write_text(json.dumps(metadata, indent=2) + '\n')
print('VERIFIED_FILM', video, flush=True)
