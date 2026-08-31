"use client";

// A deck is a run of sides that turn at corners — not a landing. Two things
// this sheet exists to capture:
//
//  - The height above grade AT EACH SIDE. Ground falls away, so one side needs
//    a guard and another does not, and only the measurer standing there knows.
//  - What the post actually holds on to. A post fixed to the deck boards alone
//    levers straight out under a push at guard height.
//
// If the deck is not a simple rectangle, the drawing below it takes over: draw
// each run, dimension every line.

import {
  newDeckSide,
  type DeckData,
  type DeckSide,
} from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, ChipRow, Grid, MInput, MSelect, SmallBtn } from "../fields";

const SURFACES = ["wood", "composite", "pvc", "concrete", "paver", "roof_deck"] as const;
const MOUNTS = ["surface", "fascia", "through_bolt", "core_drill", "embedded"] as const;
const OPENINGS = ["none", "stairs", "gate", "gap"] as const;

export default function DeckSections({
  lang,
  deck,
  setDeck,
  setSide,
}: {
  lang: string;
  deck: DeckData;
  setDeck: (fn: (d: DeckData) => void) => void;
  setSide: (id: string, fn: (s: DeckSide) => void) => void;
}) {
  return (
    <>
      <Card stage="setup" title={`🪵 ${mt(lang, "deckTitle")}`}>
        <p className="mb-3 text-xs text-neutral-400">{mt(lang, "deckHint")}</p>
        <Grid>
          <MSelect help="deckSurface" label={mt(lang, "deckSurface")} value={deck.surface} lang={lang}
            options={[...SURFACES]}
            labels={Object.fromEntries(SURFACES.map((k) => [k, mt(lang, `deckSurf_${k}`)]))}
            onChange={(v) => setDeck((d) => void (d.surface = v as DeckData["surface"]))} />
          <MSelect help="deckOccupancy" label={mt(lang, "deckOccupancy")} value={deck.occupancy} lang={lang}
            options={["residential", "commercial"]}
            labels={{ residential: mt(lang, "deckOcc_residential"), commercial: mt(lang, "deckOcc_commercial") }}
            onChange={(v) => setDeck((d) => void (d.occupancy = v as DeckData["occupancy"]))} />
          <MInput help="deckTotalPerimeter" label={mt(lang, "deckTotalPerimeter")} value={deck.totalPerimeter}
            onChange={(v) => setDeck((d) => void (d.totalPerimeter = v))} />
          <MInput help="deckOutOfLevel" label={mt(lang, "deckOutOfLevel")} placeholder="—" value={deck.outOfLevel}
            onChange={(v) => setDeck((d) => void (d.outOfLevel = v))} />
          <MInput help="deckGuardHeight" label={mt(lang, "deckGuardHeight")} value={deck.guardHeight}
            onChange={(v) => setDeck((d) => void (d.guardHeight = v))} />
          <MInput help="deckPicketSpacing" label={mt(lang, "deckPicketSpacing")} placeholder="—" value={deck.picketSpacing}
            onChange={(v) => setDeck((d) => void (d.picketSpacing = v))} />
          <MInput help="deckPostSpacing" label={mt(lang, "deckPostSpacing")} value={deck.postSpacing}
            onChange={(v) => setDeck((d) => void (d.postSpacing = v))} />
          <MInput help="deckMaxPostSpacing" label={mt(lang, "deckMaxPostSpacing")} placeholder="—" value={deck.maxPostSpacing}
            onChange={(v) => setDeck((d) => void (d.maxPostSpacing = v))} />
          <MInput help="deckPostCount" label={mt(lang, "deckPostCount")} placeholder="—" value={deck.postCount}
            onChange={(v) => setDeck((d) => void (d.postCount = v))} />
          <MInput help="deckCorners" label={mt(lang, "deckCorners")} value={deck.corners}
            onChange={(v) => setDeck((d) => void (d.corners = v))} />
          <MInput help="deckGates" label={mt(lang, "deckGates")} placeholder="—" value={deck.gates}
            onChange={(v) => setDeck((d) => void (d.gates = v))} />
          <MInput help="deckLevelNote" label={mt(lang, "deckLevelNote")} placeholder="—" value={deck.levelNote}
            onChange={(v) => setDeck((d) => void (d.levelNote = v))} />
        </Grid>
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={deck.closedLoop}
            onChange={(e) => setDeck((d) => void (d.closedLoop = e.target.checked))}
            className="h-4 w-4 accent-amber-500"
          />
          {mt(lang, "deckClosedLoop")}
        </label>
      </Card>

      <Card stage="locations" title={`🔩 ${mt(lang, "deckStructureTitle")}`}>
        <p className="mb-3 text-xs text-neutral-400">{mt(lang, "deckStructureHint")}</p>
        <Grid>
          <MSelect help="deckMount" label={mt(lang, "deckMount")} value={deck.mount} lang={lang}
            options={[...MOUNTS]}
            labels={Object.fromEntries(MOUNTS.map((k) => [k, mt(lang, `deckM_${k}`)]))}
            onChange={(v) => setDeck((d) => void (d.mount = v as DeckData["mount"]))} />
          <MInput help="deckDeckingThickness" label={mt(lang, "deckDeckingThickness")} value={deck.deckingThickness}
            onChange={(v) => setDeck((d) => void (d.deckingThickness = v))} />
          <MInput help="deckRimJoistSize" label={mt(lang, "deckRimJoistSize")} value={deck.rimJoistSize}
            onChange={(v) => setDeck((d) => void (d.rimJoistSize = v))} />
          <MInput help="deckRimMaterial" label={mt(lang, "deckRimMaterial")} value={deck.rimMaterial}
            onChange={(v) => setDeck((d) => void (d.rimMaterial = v))} />
          <MInput help="deckJoistDirection" label={mt(lang, "deckJoistDirection")} placeholder="—" value={deck.joistDirection}
            onChange={(v) => setDeck((d) => void (d.joistDirection = v))} />
          <MInput help="deckBlocking" label={mt(lang, "deckBlocking")} value={deck.blocking}
            onChange={(v) => setDeck((d) => void (d.blocking = v))} />
          <MInput help="deckLedgerCondition" label={mt(lang, "deckLedgerCondition")} placeholder="—" value={deck.ledgerCondition}
            onChange={(v) => setDeck((d) => void (d.ledgerCondition = v))} />
          <MInput help="deckFramingCondition" label={mt(lang, "deckFramingCondition")} placeholder="—" value={deck.framingCondition}
            onChange={(v) => setDeck((d) => void (d.framingCondition = v))} />
          <MInput help="deckStairSheets" label={mt(lang, "deckStairSheets")} placeholder="—" value={deck.stairSheets}
            onChange={(v) => setDeck((d) => void (d.stairSheets = v))} />
        </Grid>
      </Card>

      <Card stage="steps" title={`📐 ${mt(lang, "deckSidesTitle")}`}>
        <div className="space-y-3">
          {deck.sides.map((sd, i) => (
            <div key={sd.id} className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-amber-400">
                  {sd.label ? sd.label : `${i + 1}`}
                </span>
                <label className="flex items-center gap-2 text-xs text-neutral-300">
                  <input
                    type="checkbox"
                    checked={sd.railed}
                    onChange={(e) => setSide(sd.id, (s) => void (s.railed = e.target.checked))}
                    className="h-4 w-4 accent-amber-500"
                  />
                  {mt(lang, "deckSideRailed")}
                </label>
              </div>
              <Grid>
                <MInput help="deckSideLength" label={mt(lang, "deckSideLength")} value={sd.length}
                  onChange={(v) => setSide(sd.id, (s) => void (s.length = v))} />
                <MInput help="deckSideHeight" label={mt(lang, "deckSideHeight")} value={sd.heightAboveGrade}
                  onChange={(v) => setSide(sd.id, (s) => void (s.heightAboveGrade = v))} />
                <MInput help="deckSideTurn" label={mt(lang, "deckSideTurn")} placeholder="90" value={sd.turnDeg}
                  onChange={(v) => setSide(sd.id, (s) => void (s.turnDeg = v))} />
                <MInput help="deckSideEdgeDetail" label={mt(lang, "deckSideEdgeDetail")} placeholder="—" value={sd.edgeDetail}
                  onChange={(v) => setSide(sd.id, (s) => void (s.edgeDetail = v))} />
              </Grid>
              <div className="mt-3">
                <ChipRow help="deckSideOpening" label={mt(lang, "deckSideOpening")} value={sd.opening || ""}
                  options={OPENINGS.map((k) => [k, mt(lang, `deckOpen_${k}`)])}
                  onChange={(v) => setSide(sd.id, (s) => void (s.opening = v as DeckSide["opening"]))} />
              </div>
              {sd.opening && sd.opening !== "none" && (
                <div className="mt-3"><Grid>
                  <MInput help="deckSideOpeningWidth" label={mt(lang, "deckSideOpeningWidth")} value={sd.openingWidth}
                    onChange={(v) => setSide(sd.id, (s) => void (s.openingWidth = v))} />
                </Grid></div>
              )}
              <div className="mt-3">
                <MInput help="deckSideObstruction" label={mt(lang, "deckSideObstruction")} placeholder="—" value={sd.obstruction}
                  onChange={(v) => setSide(sd.id, (s) => void (s.obstruction = v))} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <SmallBtn onClick={() => setDeck((d) => void d.sides.push(newDeckSide(String(d.sides.length + 1))))}>
            ＋ {mt(lang, "deckAddSide")}
          </SmallBtn>
        </div>
      </Card>
    </>
  );
}
