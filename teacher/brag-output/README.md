# Teacher Desk cinematic film

22-second Blender film with the supplied MS Engineering College logo, the
existing modeled teaching desk, animated dashboard panels and chart columns,
cinematic lighting, five camera shots and an original stereo soundtrack.

- `teacher-desk-cinematic.mp4`: final 1920×1080 / 24 fps video with AAC sound.
- `teacher-desk-cinematic.blend`: editable animation with named shot collections
  and timeline markers. Frames 1–528 correspond to the full film.
- `preview.mp4`: quick low-resolution motion preview.
- `poster.jpg`: settled final brand/product composition.
- `assets/ms-engineering-college-logo.png`: original supplied image, unchanged.
- `soundtrack.wav`: original synthesized stereo score.
- `brag-plan.md`: storyboard and creative direction.
- `work/`: intermediate frames and inspected scene stills, excluded from Git.

In Blender, Numpad 0 enters camera view. Space plays/pauses. Timeline markers at
frames 1, 97, 193, 337 and 433 identify shots. Studio overlays are hidden for a
clean presentation; toggle overlays to inspect lights and cameras.

## Rebuild

```sh
blender -b --python-exit-code 1 --python brag-output/create_cinematic.py -- --stills
python3 brag-output/render_movie.py
```

Requires Blender with NumPy (bundled), FFmpeg with libx264/AAC and the project
source `.blend` scenes under `design/blender/`. The render command uses NVIDIA
offload when available. Named fonts are packed into the editable film.

The source logo includes a three-pixel black clipboard border. Blender UV
mapping excludes that capture border without changing the logo artwork.
Dashboard values and identities are fictional demo records. Blender is a visual
presentation; the working dashboard remains available in the browser.
