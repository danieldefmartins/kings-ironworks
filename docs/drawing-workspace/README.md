# Measured drawing workspace — first release

Built September 7, 2026. Screenshots use synthetic dimensions, not a customer record.

The steps stage now offers a full-screen drawing workspace for rectangular stair
flights and level, straight landings. Side, plan and isometric views share the
same inch-based coordinates. Unequal measured risers and runs change geometry;
missing or invalid dimensions use explicitly provisional display geometry and
never write inferred values to a sheet. Selecting a numbered step opens the
existing measurement editor. Zoom and scrolling let the crew read individual
steps; the isometric overview fits the available screen.

A selected rectangular flight in a complex assembly is supported. Whole turned
assemblies, winders, branches, sloped landings, and other shape families retain
the existing sketches. The new views cover field stair geometry, not rail
fabrication: posts, profiles, connection details, photo callouts, drawing export,
and release approval are later milestones. Existing print sheets are unchanged.

The sheet list now normalizes older data and uses organization tolerances like
the editor, avoiding different readiness inputs between the two screens.

Validation: 60 tests passed, targeted ESLint passed, production build passed.
Browser checks covered mobile/desktop layouts, view switching, expansion, and
opening a step editor above the full-screen drawing. A temporary fixture route
was removed after capture. No production job data was edited or deployed.

Before shop deployment, complete the existing real-tablet checklist in
[shop-tablet-smoke.md](../shop-tablet-smoke.md), including fraction entry and
point placement, plus opening a tread from each new drawing view and dismissing
the expanded workspace with its close button. Browser emulation does not
substitute for that device check.
