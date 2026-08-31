# Shop tablet smoke checklist

Mandatory before every `/shop` deploy. On the **actual shared tablet**, signed in
as a real worker, not a desktop browser at a narrow width.

These checks exist because the automated suite deliberately does not fake them.
`vitest` covers the save path — ordering, durability, recovery, conflicts (see
`useSheetSync.test.tsx` and `useSheetSync.debounce.test.tsx`, 19 tests, ~0.5s).
Everything below turns on real focus, real pointer events and a real camera, and
jsdom will happily report all three as passing while the tablet is broken.

Run the whole list. It takes about ten minutes.

---

## 1. Fraction entry

The fraction bar inserts into whichever measurement field has focus. It does
this on `pointerdown` with `preventDefault`, specifically so the field does not
lose focus first — the single most fragile interaction in the tool.

- [ ] Tap a rise field. The fraction bar appears along the bottom.
- [ ] Type `7`, tap `1/2`. Field reads `7 1/2"`. The keyboard does **not** dismiss.
- [ ] Tap `1/4` three times quickly. All three land, in order, no dropped taps.
- [ ] Whole number only (`7`), move to the next field: value sticks.
- [ ] Switch units to feet+inches in **More**. The bar gains `'` and `"`.
- [ ] Enter `3' 6 1/2"` in one field using the bar. Reads back correctly.
- [ ] Type nonsense (`abc`). Nothing crashes; the geometry check shows no result
      rather than a wrong one.
- [ ] Tap outside every measurement field. The bar disappears.
- [ ] With the bar showing, scroll the page. It stays put and stays usable.

## 2. Photo capture

- [ ] Open a required photo slot. **Take Photo** opens the rear camera.
- [ ] Take one. It appears in the slot, and the slot stops asking.
- [ ] Choose from library instead. Same result.
- [ ] Mark up a photo (arrow, circle). Save. Reopen — markup is still there.
- [ ] Replace an existing slot photo. The old one is replaced, not added
      alongside; the slot still shows exactly one.
- [ ] Turn Wi-Fi off, try to take a photo. It fails visibly — not silently — and
      the sheet's other measurements are untouched.
- [ ] Turn Wi-Fi back on, retry the same slot. It succeeds.
- [ ] Portrait photo of a stair: check it is not rotated 90° in the print sheet.

## 3. Point menus on the sketch

- [ ] Tap a step on the sketch. The point menu opens.
- [ ] Add a railing post. It appears at that step, on the correct side.
- [ ] With **Nothing — all new** answered in routing, confirm the menu leads with
      a single full-width "New railing post" and the other three types sit under
      "Something else is here".
- [ ] Tap an existing point. Relocate it to another step. It moves; its
      measurements travel with it.
- [ ] Tap a point, **Add other side**. A mirrored point appears.
- [ ] Remove a point. Confirm it is gone from both the sketch and the posts list.
- [ ] Tap five steps rapidly. Five points, no duplicates, no menu stuck open.
- [ ] Dismiss the menu by tapping the backdrop, and again with the Cancel button.
- [ ] Rotate the tablet mid-placement. Nothing is lost.

## 4. Reach and legibility (gloves on)

- [ ] Every control on the review screen can be hit wearing work gloves.
- [ ] The sticky next-action bar is readable in direct sunlight.
- [ ] On a phone, the "Step N of 8" line and its All sections drawer both work;
      no horizontal page scroll anywhere.

---

## After deploying

This deploy signs everyone out — v1 session tokens are rejected rather than
upgraded. Deploy **between shifts**, then, in this order:

1. **Offline recovery on the shared tablet, first.** Airplane mode, measure
   three fields, force-quit the browser, reopen the sheet, confirm the numbers
   are there and the banner says saved-on-device. Restore signal, confirm it
   uploads. This is the check that matters most and the one the refactor
   touched most.
2. An existing session is redirected cleanly to the login screen.
3. Worker login succeeds in EN, PT and ES.
4. A new straight stair shows **13 blockers and 6 follow-ups** after carry-over.
5. "Continue measuring" jumps to the correct field.
6. Submission succeeds with ordinary photos still outstanding.
7. The three fabrication-critical photos (well wall profile, balcony slab edge,
   fire escape anchors) still block submission.
8. Archive a job, confirm it leaves the list, restore it from Admin.
