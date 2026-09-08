# Fabrication template acceptance criteria

The deployed package is a review layout. It must not be presented as sufficient
for fabrication merely because it contains member marks and reference lengths.

## Decisions required before deriving parts

- Top rail: continuous over posts or fitted between posts; cap/rail assembly if multiple members.
- Height datum: finished top face of cap/rail and measurement location on the stair.
- Profiles: actual outside dimensions, wall thickness, material and orientation.
- Bottom rail: placement, clearance datum, and attachment to post faces.
- Infill: spacing convention, orientation, rail-face attachment and end treatment.
- Joint allowances: gap value AND direction in which the gap is measured.
- Posts: cap treatment, top cut, mounting elevation, plate thickness or embedment.
- Connections: fabrication dimensions of plates/clips, hole coordinates and
  diameters, fastening specification, weld size/location and shop/field split.
- Landing transition: actual path, corner construction, cuts or bends, splice
  positions and interfaces to both flights. A centerline path is insufficient.

Existing measurements already contain many of these values as freeform notes.
Resolve and reuse them; do not duplicate them or silently choose shop standards.
Construction decisions belong in reusable shop templates, with project overrides.

## Required output

1. Assembly elevation and plan with finished dimensions, datums, post marks,
   panel marks, rake, bottom clearance and infill layout.
2. Individual part drawings: profile orientation, quantity, retained shape,
   cut-end orientation, dimensioned stock extent and attachment features.
3. Cutting schedule: actual part-specific cutting dimensions with an explicit
   convention; never rename reference-axis lengths to cut lengths.
4. Picket layout: exact quantity, equal end gaps and spacing coordinates.
5. Enlarged, dimensioned mounting and inter-flight connection details.
6. Matching BOM, assembly marks, finish notes and revision identity.

Acceptance: a fabricator can cut, drill, lay out and assemble each marked piece
without deriving missing dimensions or choosing an unrecorded construction method.
Unsupported joints must be explicit blockers, not a generic review note hiding
an invented connection.

## Work started after feedback

`cut_geometry.py` computes retained planar stock polygons for parallel angled
cuts with explicit face clearances and gap directions. Tests verify the transformed
rail end vertices lie on the intended plumb post faces, distinguish stock extent
from edge length, check mirrored cuts and reject impossible allowances.

This module is connected to the local draft generator, not yet deployed. The shop confirmed a continuous top rail over the posts, with one fabricated
section per flight. Bottom rail and infill construction are awaiting its answer. These calculations
cover straight planar stock, not compound miters, round-pipe copes or bend development.
