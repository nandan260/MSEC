# Blender dashboard design

Status: approved by user and implemented; verified locally and in Docker.

## Intent

Give Teacher Desk's overview a complete 3D visual treatment using Blender-created
artwork while keeping teaching tasks easy to read and operate in the browser.
The user selected a 3D dashboard over subtle decorative accents.

## Approaches

- Subtle 3D accents: smaller visual change, mostly retains the current flat overview.
- Full 3D visual treatment: sculpted cards, dimensional illustrations and a cohesive
  workspace. Selected by the user.
- An interactive 3D scene: would add camera navigation and a rendering dependency;
  unnecessary for viewing attendance and managing classes.

## Proposed design

- Warm ivory canvas, deep forest text, sage and lime highlights, restrained amber
  status accents. Soft directional shadows make panels feel like raised objects.
- A welcoming overview banner with a Blender-rendered isometric teaching desk:
  rounded books, notebook, pencil and small plant. Text and actions remain HTML.
- Sculpted metric cards and a dimensional teacher pass. Charts remain live SVG
  with clear labels and actual application data.
- A consistent sidebar and toolbar treatment connects the restyled overview to
  existing modules. Current routes, forms, records and local storage remain intact.
- Increase small overview labels to readable sizes. Allow vertical scrolling
  instead of shrinking content to fit short screens. Stack cards on mobile.
- Keyboard focus remains visible. Touch controls aim for 44 CSS pixels. Decorative
  renders have empty alt text; all meaningful information has text equivalents.
  Avoid continuous motion and honor reduced-motion preferences.

## Scope and implementation choices

This is a visual restyle of the existing overview and shared shell, not a new
navigation model or data feature. Use the existing TypeScript, HTML, CSS and SVG
stack. Blender generates static transparent PNG artwork; retain the generation
script and editable .blend scene for future changes. No WebGL dependency needed.
The palette and desk composition above are proposed implementation choices.

## Guideline basis

- Accessibility > Vision: sufficient contrast, scalable text, screen-reader content.
- Accessibility > Mobility: comfortable controls and keyboard access.
- Layout: hierarchy and adaptable layouts across window sizes.
- Color > Best practices: consistent semantic color use.
- Typography: legible text and clear visual hierarchy.

## Validation and delivery

Build TypeScript and run relevant existing checks. Review desktop and mobile
screenshots; verify navigation, key overview actions, focus and absence of page
overflow. Rebuild Docker images and check the existing public tunnel serves the
new overview. Existing screenshot-match geometry checks may need updating where
they assert the superseded flat design rather than application behavior.
