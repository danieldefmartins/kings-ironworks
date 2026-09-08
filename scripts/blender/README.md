# KIW Blender drawing worker

Blender replaces the previous interactive SketchUp connector. The Mac mini runs
Blender 4.5 LTS in a separate background process for each immutable measurement
request. No signed-in Blender account or paid license is required.

Each private ZIP contains `railing.blend`, `shop-drawings.pdf`, vector SVG sheets,
`measurements.json`, and a manifest. Blender models and sheets use the same
inch-coordinate payload from `src/lib/shop/shop-drawings.ts` as the web geometry.
The model contains measured surfaces, post/rail centerline references, landing
transitions, wall boundaries, named cameras, and the complete source snapshot.
PDFs include whole-stair views, local flight elevations with step dimensions,
post-edge references, and material/connection schedules. Profiles and engineering
remain shop review work. The ZIP is a draft, never an automatic fabrication release.

## Operation

- Code: `~/shop-drawings/blender-worker` on the Mac mini.
- Private config: `~/shop-drawings/blender-worker/config.json`, mode 0600.
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender`.
- User LaunchAgent: `com.kiw.blender-drawings` starts at login and restarts after failure.
- Jobs and logs stay in the worker folder. Do not commit configs or generated customer files.
- A dedicated hashed worker token is registered using `register-worker.mjs` with
  the existing server environment; no database key is copied to the mini.
- HTTP polling is outbound every 15 seconds. Generation has a 180-second limit;
  leases and heartbeat renew every 45 seconds while building. Expired leases
  cannot complete. Upload must exist before the server marks the request ready.
- `worker.py --config config.json --heartbeat-only` verifies connectivity without
  claiming a queued job. `--once` handles at most one request.
- To stop: `launchctl bootout gui/$(id -u)/com.kiw.blender-drawings` on the mini.
  Existing local documents are untouched; Blender uses factory startup with
  automatic script execution disabled and never opens arbitrary incoming files.

## Synthetic sample

`sample-payload.ts` creates a fictional five-flight fixture using the actual
measuring-tool factories and `blenderPayload()`. Bundle with the repository's
esbuild and run it with Node. Then run:

```
Blender --background --factory-startup --disable-autoexec --python-exit-code 1 \
  --python build_drawings.py -- sample.json sample-output
Blender --background --disable-autoexec sample-output/railing.blend \
  --python-exit-code 1 --python verify_model.py
```

`verify_model.py` checks every saved surface and post against the source inch
coordinates, plus cameras and scene units. The sample uses example dimensions,
not customer field records.

Official references: [Blender license](https://www.blender.org/about/license/),
[background command line](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html).

## Verified on September 8, 2026

- Blender 4.5.13 LTS installed from the checksum-verified official ARM64 installer.
- Five-flight sample: 29 surfaces, 10 posts, four landing connections, 10 sheets.
- Saved `.blend` reopened and every surface/post coordinate matched its payload.
- Background rendering produced a PNG preview.
- Isolated live queue test reached ready, uploaded a valid ZIP, and downloaded
  through the signed-in Shop link. Customer measurement sheets were untouched.
- API authentication, lease, upload and submission tests pass in the 144-test suite.
- HTTP requests identify themselves as `KIW-Blender-Worker/1.0`; default Python
  identification was rejected upstream during integration testing.

## Custom KIW template (September 8 update)

The submission control accepts all app project types. A saved immutable snapshot
queues automatically and the existing Mac mini worker creates a private package.
`assembly.py` supplies the same member envelopes to Blender and PDF/SVG output.
`shop_template.py` creates a right-hand KIW title block, arrangement views,
segment elevations/plans, enlarged transition paths, grouped member quantities,
post offsets, connection specifications, and a paginated review list. The ZIP
also carries `assembly.json` and `member-schedule.csv`.

Supported straight post bays can show top/bottom rails and vertical pickets from
explicit profiles and clearance. Common numeric inch profiles are accepted;
ambiguous catalog descriptions are retained for review, not guessed. Drawings
use external profile envelopes, not hollow section interiors or connection cuts.
Reference-axis lengths are deliberately NOT labeled saw cut lengths. Current
post-top axes, infill spacing convention, end treatments, mounting/embedment and
separate graspable handrails require shop detailing. Curved/winder bays and custom
infill are not replaced with straight or vertical members. Non-segment project
types (gates, fences, spiral, etc.) receive their recorded specification package
and an explicit custom-geometry detailing item, not an invented staircase model.
Automatic fabrication-ready drawings for those types are not implemented yet.

Validate with `python3 -m unittest discover -s scripts/blender -p 'test_*.py'`, the
application test suite, and `verify_model.py` against a generated Blender file.
