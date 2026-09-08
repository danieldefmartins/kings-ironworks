> Replaced by the [Blender worker](../blender/README.md). Kept for historical reference; the live worker API now requires Blender.

# KIW SketchUp worker

The app saves measurements, queues an immutable request, and reports progress.
The Mac mini pulls work over HTTPS from inside SketchUp, builds a draft `.skp`,
uploads through a short-lived URL, and completes its lease. Models contain
measured stair/landing surfaces, post and rail centerlines, landing drops,
dimensions, Plan/Side/ISO scenes, and original measurements in model attributes
and a local JSON companion. Orange/VERIFY geometry is unresolved reference
geometry. Solid profiles, weld/anchor engineering and final LayOut pages still
require shop detailing. No drawing is automatically released for fabrication.

## Setup after staging/database and device checks

1. Apply the queue migration and deploy the web endpoints.
2. Register a dedicated worker locally using the server environment:
   `node --env-file=.env.local scripts/sketchup/register-worker.mjs https://YOUR_SHOP /private/tmp/kiw-worker-config.json`
   The script requires explicit Supabase URL, service-role key and SHOP_ORG_ID.
   It writes a new file with permissions 0600 and stores only the token's hash
   in the database. It never prints the token. Do not commit the config.
3. Copy that config to the Mac mini at
   `~/shop-drawings/kiw-worker/config.json`, permissions 0600. The existing
   `~/shop-drawings` PDF generator is preserved in place.
4. Install `kiw_shop_drawings.rb` in
   `~/Library/Application Support/SketchUp 2026/SketchUp/Plugins/`.
   SketchUp 26.2 and this connector were installed on the mini in this session.
5. Open SketchUp, complete any required account/license prompts, then choose
   **Extensions → KIW Shop Drawings → Start worker**. It requires an interactive
   session; installation alone does not mean connected. The worker does not
   claim while the active model has unsaved changes. New jobs use separate
   documents; previous models are not overwritten.
6. Submit a synthetic complete measurement sheet. Verify `.skp` opens, dimensions
   and post references match, landing height differences match, all three scenes
   are present, upload succeeds and app status changes to draft ready. Test
   worker-offline recovery and stale lease rejection before customer use.

The connector starts only from its menu; it does not auto-start after reboots.
Stop via the same menu. Revoke a lost credential by setting the matching
`kiw_shop_drawing_workers.revoked=true`; provision a new token to reconnect.
Request leases last five minutes and retry up to three attempts. Resubmitting
an unchanged failed measurement explicitly retries that request. Logs and local
artifacts are under `~/shop-drawings/kiw-worker`. Logs omit tokens and signed URLs.

## Validation status

Ruby syntax, API auth/lease/upload boundaries and TypeScript are checked locally.
A rollback-only database integration check passed for snapshot deduplication,
stale-source rejection, exclusive worker leases, retries and revision approval.
Actual SketchUp generation and storage signed upload still need verification. Installation has been verified separately
from connection. No live request has been claimed or produced in this session.

API references: [SketchUp HTTP requests](https://ruby.sketchup.com/Sketchup/Http/Request.html),
[SketchUp Ruby API](https://ruby.sketchup.com/),
[model saving](https://ruby.sketchup.com/Sketchup/Model.html#save-instance_method).
