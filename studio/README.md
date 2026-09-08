# Portfolio studio

Scroll-driven WebGL section integrated into `grid-video.html` from Rune's approved
`rune-portfolio-3d-spike` study, commit `fb9a2a5`. The hero remains independent.
Skip/Replay, the percentage entrance and the final retained approach copy are
part of this release. Existing case pages, project videos and analytics remain.

## Build

From the repository root, run `npm ci` then `npm run build`.
Source is in `studio-src/`; esbuild emits standalone ESM into `studio/runtime/`.
Commit the generated runtime with source changes: GitHub Pages serves the `live`
branch directly and does not run the JavaScript build. Node 22 or later is recommended.
`npx tsc --noEmit` checks the source types.

The GLB and camera track are in `models/atelier/`; Draco decoders are local in
`decoders/draco/`. No Blender sources or third-party model-generation credentials
are shipped. On a normal entrance the model is preloaded while JavaScript imports, and the
percentage loader waits for decoding and the first complete rendered frame. The
prepared canvas is reused on first scroll. Direct content hash links bypass this
work. Failures release the entrance; a 15-second bound prevents a stalled module
from locking the page. Scene invalidation follows progress changes rather than
every scroll event outside the scene.

## Verification and release

The production candidate was served locally as plain static files. Browser checks
covered desktop/mobile first entry, Skip and Replay, final copy, failure fallback,
reduced motion, project grids, Jelsa images and contact. The five-video SBB transport
was separately checked for next/previous selection and real playback.

The original reported first-entry flash was not reproduced exactly. The opening
camera is now initialized from the camera track; automatic projection resets are
disabled, scroll is synchronized before paint and the canvas stays hidden until
it has completed preparation and a first render.

The prior production revision is `e485dd6ab76cb7dc8d9a8702ba7d7db5bda3778c`.
Rollback by reverting this release commit on `live` and pushing the revert, keeping
history intact. Case pages and existing media are outside this release's edits.
