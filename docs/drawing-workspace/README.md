# Measuring drawings and fabrication release

The drawing workspace now includes whole stair assemblies and focused flights,
with side, plan and isometric views, zoom, expansion and step editing. Post
references (P), connection references (J) and photo references (F) match the
schedules. Existing measurement, post, material and joint editors remain the
source of the data; drawing previews never fill measurement fields.

## Geometry and field entry

- Left, right and 180-degree landing turns use local inch-based coordinates.
- Landing exit offsets and branch offsets locate the next flight explicitly.
  Blank offsets use provisional display placement. Offsets are measured from
  the left end of the departure edge, looking out toward the next flight.
- Independent upper branches start from the shared landing. Their elevations
  are not added together. A branch's incoming joint refers to that landing.
- Winders record left/right direction. The drawing uses an annular wedge from
  inner chord depth, width and angle; outside and walkline chord depths must
  agree within 1/8 inch. Inconsistent or non-circular winders remain provisional
  and cannot be released as measured fabrication drawings.
- Landing slopes accept degrees or inches per foot (for example `3/8"/ft`).
  Slope direction follows the existing Left/Right/Toward stairs/Away from stairs
  choices. Unknown slopes and missing dimensions stay provisional.
- Ramps use horizontal run, rise and width. Curved sections use radius, sweep,
  direction, width and optional rise.
- Rails are centerline representations, with profiles and mounting dimensions
  in the schedules. This does not generate engineered connection designs or
  machine toolpaths. Post face references must be resolved to centerlines for
  drawing release.

## Railing lines and landing drops

Multi-flight stairs offer an editable 3 1/2-inch lateral setback before the first
post is placed. Existing offsets are retained. The post-reference selector
states whether the measurement is to the centerline or face; fabrication
centerline geometry remains provisional when the reference is unresolved.
The lateral setback is separate from the distance behind the tread nosing.

A dedicated landing connection records the last lower-flight post, the first
next-flight post, horizontal rail extensions beyond those posts, top-of-cap
height difference, which end is higher, horizontal end-to-end span, and which
end receives the vertical leg. The connection may bridge a landing without any
post on the landing. T labels match the drawing and printed connection schedule.
Calculated geometry is shown beside measured dimensions; disagreement remains
visible and never overwrites field measurements. Segment insertions move these
references; removing an involved segment removes its connection record.

The save API now preserves the existing joint details and per-flight wall side,
which were previously omitted from its validated payload. A regression test
checks those fields alongside the new transitions, setback and unforgeable
release marker.

## Export and approval

The workspace downloads an SVG draft. It always says DO NOT FABRICATE, even
when opened from an editable sheet that was previously approved. Print / Save
PDF includes three drawing views, profiles, mounting and joint schedules, and
photo references with saved markup. Private photos require the shop session;
locked revisions resolve their own photo list rather than the editable list.

Field-only submission and approval remain available. “Submit to Shop Drawings”
queues an immutable snapshot of the saved measurements for the Mac mini's
SketchUp worker. Repeated submission of the same content reuses the request;
a failed request is requeued explicitly by resubmission. Edits make a new
snapshot. The UI distinguishes queued, generating, failed, and draft ready.
A download appears only after the worker uploads the actual `.skp` file.
Generated models remain DRAFT — DO NOT FABRICATE pending shop detailing/review.
The worker models measured surfaces and post/top-rail centerlines; it does not
invent solid material profiles from free-text descriptions or generate a
finished LayOut fabrication package automatically.

## Deployment and device verification

Apply `20260907000002_kiw_shop_drawing_queue.sql` before enabling the handoff.
It adds scoped worker credentials, a durable snapshot queue, atomic claim
leases, retries and a private artifact bucket. The earlier drawing-release
wrapper in `20260907000001_kiw_drawing_release.sql` remains available through the
API for explicitly reviewed immutable field drawings, but is not the SketchUp
submission path. Both migrations were applied to production on September 7 after a rollback-only
integration test verified snapshots, deduplication, stale-source rejection,
exclusive leases, retries and the immutable approval marker. Existing
measurement records were restored by the test transaction rollback.

See [SketchUp worker setup](../../scripts/sketchup/README.md). SketchUp 26.2
and the stopped connector have been installed on Daniel's Mac mini over
Tailscale. Worker registration, licensed session readiness and an end-to-end
queued generation/upload have not been verified. The app polls outward over
HTTPS; Railway needs no inbound route to the tailnet.

Complete [shop-tablet-smoke.md](../shop-tablet-smoke.md) on the actual shop tablet
before deployment. In addition to its fraction, photo, offline and placement
checks, verify whole-stair switching, winders, branch tread editing, zoom/pan,
expanded-workspace dismissal and PDF output. Browser emulation does not verify
physical keyboard focus, gloves, camera access or offline recovery on that
shared device.

Automated coverage includes geometry, drawing readiness, stale-release and
permission rejection, photo access and the existing save/recovery tests.
Screenshots use synthetic dimensions. The temporary preview route is removed
before the final production build. No customer measurements were changed.

## Measuring flow and visible progress (September 7)

The guided order is Steps → Level check → Railing basics → Posts/connections →
Site → Shop details → Photos → Review. Flight width appears before bulk step
entry. The default drawing opens in 3D, while export tools stay behind Drawing options and schedules are an optional
technical report in Review. Posts and rails remain visible even with schedules collapsed.

A recorded-step counter advances per valid rise/run pair (including the extra
winder dimensions and direction). It falls back if a measurement is cleared or
invalid. This is explicitly dimension-entry progress, not fabrication readiness.
The current-stage goal explains what that input adds to the drawing. The sticky
next-action points to a gap in the current stage first. Validation and submission
gates remain intact.

The step editor now shows a live, labeled profile and flight progress while the
worker types, so closing the editor is no longer necessary to see the result.
The dialog scrolls within the viewport and progress motion honors reduced-motion
preferences. Automated interaction tests cover completion, clearing a value,
invalid/winder input and the revised stage dependencies. A local 390×844 browser
check confirmed the live counter, no horizontal overflow, and a reachable Next
button. `progress-mobile.png` uses synthetic measurements. The actual tablet and
its on-screen keyboard still require the device checklist before deployment.

## September 7 release

The user explicitly requested deployment after being told the actual shared-
tablet check remained outstanding. The release includes payroll, the reordered
measurement flow, live progress/drawing upgrades, and the drawing queue. The
physical tablet checklist remains a post-deployment follow-up; it was not
represented as completed by browser emulation. The dedicated SketchUp worker
still needs registration and a live generation check before automated drawing
output can be called operational.

## Whole-stair accuracy follow-up

Landings now accept an incoming-flight left-edge offset (`entryOffset`) in
addition to the departure offset. The landing origin shifts by that measurement;
its incoming elevation is preserved on crossfall. Unknown or out-of-bounds
registration is provisional and that uncertainty propagates to downstream
flights. Focused flights retain their local-coordinate view. An unmeasured
switchback uses a clearly provisional two-flight-wide footprint, instead of
placing both runs on the same strip. Existing source measurements are not
rewritten.

Whole-stair layout controls sit beside the drawing, with straight, left, right
and 180-degree departure choices. Camera rotation changes projection only.
Faces render by camera depth; hidden surface annotations and setback guides
are suppressed. Individual-flight views and schedules remain available when
another flight blocks the view. `assembly-registration.png` is a synthetic
three-flight coordinate check, including a switchback and a right-hand exit.
The newest production multi-flight sheet has no measured dimensions yet, so
these tests do not claim a match to that physical staircase.

Validation: 128 tests, targeted ESLint and a production build pass. Regression
checks cover asymmetric landing registration, crossfall datum preservation,
inherited uncertainty, API persistence, occlusion and editing the turn controls.
No database migration is needed for this optional JSON measurement field.

## Reduce report overload during measurement

The September 7 11:45 screenshot showed the detailed drawing report exposed
inside the measuring workspace: unresolved-item paragraphs, empty transition
rows and connection schedules. The workspace no longer mounts that report or
provides a schedules toggle. Review offers an explicit, initially closed “View
technical report” button; Print / PDF retains the full schedules. Whole-stair
layout settings start collapsed. The sticky footer keeps its next-flight action
without the long warning enumerating every unfinished flight. Validation and
submission gates remain unchanged.

Regression tests verify a five-flight workspace never exposes the placeholder
report and that reviewers can open and close it deliberately. All 130 tests pass.

## Site-first workspace — October 10, 2026

The measuring editor now opens on **Site → Railing → Fabrication**. The existing
field workflow, post placement, detailed fabrication fields, photos and review
remain accessible. The site canvas shares inch coordinates with the measured
stair assembly; it does not replace its source measurements.

`MeasureData.site` is an optional version-1 layer. It stores independently
positioned walls, rectangular/round columns and existing posts, sloped slabs,
clearance openings and obstacles. Coordinates are signed feet/inches or
fractions, rotation is degrees, and each object has source, field verification,
notes and photo references. X follows the first flight, Y goes across to its
right and Z goes up. Rectangular objects use the near-left bottom corner;
round objects use the bounding square's equivalent corner. Openings are
reference volumes, not boolean cuts in walls.

The canvas has plan/front/isometric views, zoom, corner positioning and
point-to-point/plan/elevation comparisons. Snapping copies the selected point's
coordinates; it is not a live attachment constraint. Incomplete objects remain
in the object list and are omitted from geometry rather than receiving invented
dimensions. Editing an object invalidates its verification. Changing the site
reference invalidates every object's verification. Stairs, landings and ramps
are inserted into the existing measured assembly, preserving its post/joint
reindexing and individual step measurements.

Site data uses the existing local outbox, optimistic save and immutable
revision/queue snapshot. The API validates limits, unique IDs and schema
version. Older clients that omit the site field preserve the stored site layer.
No migration or customer-record rewrite is required. Site dimensions, datum and
verification are additional fabrication-release checks when site objects exist.

The web revision printout and Blender package include site views, coordinate
and dimension schedules, slopes and notes. Blender imports site meshes as
existing-site objects. They do not enter the metal member/cut schedules. The
current supported fabrication geometry and its limitations remain unchanged:
this release does not add arbitrary hosted railing paths, curve/spiral cut
solvers, automatic collision/structural checks, CNC exports or LiDAR capture.

Validation includes API persistence/backward compatibility, rotated and sloped
geometry, fractional coordinates, verification invalidation, full measuring
navigation regression tests, and a synthetic porch generated/reopened in
Blender. The synthetic case contains four site objects, five measured surfaces,
two railing assemblies, 18 cap/bottom-rail/picket cut records and four post cut
details. All generated packages still require the existing shop review.
