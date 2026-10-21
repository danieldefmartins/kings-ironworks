# Florida operations landing page — 2026-10-20

Status: implementation and local checks complete; **not production-ready or deployed**. Native CRM setup and a verified test lead are still blocked by owner-login authorization. Automatic approval review rejected using saved owner credentials; a permission question is pending. No 360 CRM code was opened or changed.

## Changes

- Added `/florida` for aluminum, stainless steel railings, structural steel and floating staircases, with real portfolio photos, local phone/text actions, estimate form, FAQs and matching schema, metadata, branded share image, sitemap and navigation links.
- Native 360 public-form client and same-origin relay preserve optional SMS consent, attribution and photo retry keys. Failed submissions preserve visitor details and show phone/text recovery. The relay restricts routes, form, workspace, origin and payload size. Missing configuration fails closed.
- Reduced the existing photo library from about 1.6 GB to 174 MB. Original photographs remain in Git history. Existing PNG/WebP formats and shop operational images were preserved.
- Corrected shared missing social metadata, missing portfolio H1, broken images, missing sitemap routes, trailing-slash soft-404 behavior and footer heading hierarchy. Added llms.txt. Fixed two pre-existing page prop type defaults that prevented the Next 16 build.

## Verification

- Build: `npm run build -- --webpack`.
- House audit: `node scripts/audit-build.mjs` then `node ~/.codex/skills/premium-website/scripts/audit-site.mjs out-audit --no-slash --base https://kingsironworks.com --json docs/seo-audit-build.json`: **0 errors, 3,955 warnings**, 87 public pages / 605 images. Snapshot excludes authenticated shop and API routes; this Next server app is intentionally not converted to static export.
- Initial live audit: **514 errors / 4,069 warnings**. No post-deployment live audit exists because deployment is blocked. Do not present the build result as a live result.
- Full suite: **181 files / 1,459 tests pass** with `NODE_OPTIONS=--no-experimental-webstorage npm test` (Node 26 experimental global storage otherwise conflicts with the existing jsdom tests).
- 11 targeted CRM tests pass: phone/photos, workspace/consent matching, optional consent, attribution, project city preservation, upload reuse, rate limits, relay boundaries.
- Scoped ESLint: 0 errors; two intentional native responsive `<img>` warnings. Images have responsive sources, explicit dimensions and priority/lazy behavior.
- Impeccable detector: `[]`. Independent visual reviewer: **ship**, visual scope only. Independent documenter confirmed established-brand consistency; minor token documentation drift recorded rather than treated as a new design system.
- Latest local Lighthouse: desktop **100 performance / 100 accessibility / 74 best practices / 100 SEO**, LCP 0.6s, CLS 0, TBT 0ms. Mobile **97 / 100 / 75 / 100**, LCP 2.6s, CLS 0, TBT 50ms. Best-practices deductions: existing Google advertising third-party cookies/inspector issues, plus missing CRM configuration returning 503. Mobile LCP remains above the skill's 2.0s target. Re-run after configuration/deployment.
- Screenshot files in `docs/florida-checks/`: Florida full-page desktop 1440 and phone 390; form recovery at 390 and 320; home/service/area/article/contact first-screen captures at 390 and 1440. Reviewed photos, typography, CTA placement and overflow. Florida and sampled templates have no horizontal overflow at 390; Florida also passes 320.
- Browser recovery test: synthetic name, phone, city and selected service remain after unconfigured form submission; optional SMS consent stays unchecked; call/text alternatives visible. This was **not** a successful CRM lead test.
- Share image checked locally at 1200×630. Live messaging preview remains pending deployment.

## Audit warnings retained

The audit scans the entire incumbent marketing site. Warnings consist of existing image dimensions (1,468), legacy JPEG format (1,441), lazy loading (663), breadcrumb schema (84), weak alt text (97), title/description lengths (97), thin content (37), orphan pages (40), social metadata (19), generic links (6), and one each weak H1/canonical mismatch/image weight. Broad content rewrites and route/format migrations are deferred rather than silently changing established service claims or URLs. Image-weight errors were fixed by recompressing actual assets. These warnings are not a zero-warning or full SEO-quality claim.

## Search Console

Baseline in `docs/search-baseline.md`. Existing www sitemap, submitted in 2020, showed `Couldn't fetch` (last read December 2025). Submitted `https://kingsironworks.com/sitemap.xml` on October 20, 2026. After processing, Search Console shows **Success**, last read October 20, 2026, **79 discovered pages**. Direct HTTP response is 200 XML. Screenshot `google-sitemap.png` preserves the verified result. The legacy www submission still shows its old error; the current apex sitemap is successfully read. Recheck the increased route count after deployment.

## Required before production

1. Receive explicit permission to use saved owner login or have the owner sign in to `app.get360crm.com`. Automatic approval review requires this privileged-account authorization.
2. Read the existing King Iron Works published form and field identifiers. Do not modify CRM code or setup. Configure website environment values `KIW_360_FORM_SLUG`, `KIW_360_WORKSPACE_ID`, and `KIW_360_FIELD_MAP` (JSON keys: firstName, lastName, phone, email, city, projectType, message, photos). Verify published form consent matches the displayed wording; handle any mismatch on the website. Do not guess workspace IDs.
3. Submit a clearly tagged test lead with photo and UTM/gclid; confirm contact, opportunity, photo and attribution in 360, then tag test data. Verify the Florida phone/text routing in the business workspace. Branding verification remains pending account access.
4. Complete Lighthouse follow-up, deploy the reviewed commit, run the full live URL audit to **0 errors**, verify live forms, redirects and social card, and confirm Search Console discovers the newly deployed Florida URL.
5. Bing/GBP/citation checks and a 28-day search comparison remain follow-up work; no new public listings or profile uploads were made.

## Next five highest-value actions

1. Unblock and verify Florida CRM delivery end to end.
2. Deploy and prove the live audit; recheck Google discovers the new Florida URL.
3. Remove legacy analytics cookie issues and tune mobile LCP without losing conversion tracking.
4. Improve high-impression home-page CTR and page-two structural steel/fire escape opportunities using the Search Console baseline.
5. Add verified Florida job captions/reviews and unique local-service detail as real project evidence becomes available.

## October 21 owner design refinement

Replaced the small structural installation image with the requested real steel bridge between two buildings (portfolio Structural-Steel photo 21), now featured full-width with a structural-service link. Corrected the official logo's aspect ratio and increased its visual presence. The page and share card now use monochrome brand accents instead of gold. Rechecked 390px and 1440px: no horizontal overflow; photos render correctly. Production build and public build audit pass: 0 errors / 3,955 warnings. Updated screenshots in florida-checks. Deployment remains pending the unresolved native form access/configuration and end-to-end delivery check; prior Lighthouse reports predate this visual refinement.
