"use client";

// A balcony guard is an anchoring problem before it is a railing problem:
// the slab edge decides the embedment and the edge distance.

import { type BalconyData } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, Grid, MInput, MSelect } from "../fields";

export default function BalconySections({
  lang,
  balcony,
  setBalcony,
}: {
  lang: string;
  balcony: BalconyData;
  setBalcony: (fn: (b: BalconyData) => void) => void;
}) {
  return (
    <>
    <Card stage="setup" title={`🏗 ${mt(lang, "balTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "balHint")}</p>
      <Grid>
        <MSelect help="balKind" label={mt(lang, "balKind")} value={balcony.kind} lang={lang}
          options={["balcony", "juliet", "deck_edge", "roof_edge"]}
          labels={Object.fromEntries(["balcony", "juliet", "deck_edge", "roof_edge"].map((k) => [k, mt(lang, `balK_${k}`)]))}
          onChange={(v) => setBalcony((b) => void (b.kind = v as BalconyData["kind"]))} />
        <MSelect help="balMount" label={mt(lang, "balMount")} value={balcony.mount} lang={lang}
          options={["top", "fascia", "core_drill", "embedded"]}
          labels={Object.fromEntries(["top", "fascia", "core_drill", "embedded"].map((k) => [k, mt(lang, `balM_${k}`)]))}
          onChange={(v) => setBalcony((b) => void (b.mount = v as BalconyData["mount"]))} />
        <MInput help="balEdgeLength" label={mt(lang, "balEdgeLength")} value={balcony.edgeLength}
          onChange={(v) => setBalcony((b) => void (b.edgeLength = v))} />
        <MInput help="balProjection" label={mt(lang, "balProjection")} placeholder="—" value={balcony.projection}
          onChange={(v) => setBalcony((b) => void (b.projection = v))} />
        <MInput help="balGuardHeight" label={mt(lang, "balGuardHeight")} value={balcony.guardHeight}
          onChange={(v) => setBalcony((b) => void (b.guardHeight = v))} />
        <MInput help="balPicketSpacing" label={mt(lang, "balPicketSpacing")} placeholder="—" value={balcony.picketSpacing}
          onChange={(v) => setBalcony((b) => void (b.picketSpacing = v))} />
        <MInput help="balReturns" label={mt(lang, "balReturns")} value={balcony.returns}
          onChange={(v) => setBalcony((b) => void (b.returns = v))} />
        <MInput help="balCorners" label={mt(lang, "balCorners")} placeholder="—" value={balcony.corners}
          onChange={(v) => setBalcony((b) => void (b.corners = v))} />
        <MInput help="balFinishedFloor" label={mt(lang, "balFinishedFloor")} value={balcony.finishedFloor}
          onChange={(v) => setBalcony((b) => void (b.finishedFloor = v))} />
        <MInput help="balDrainage" label={mt(lang, "balDrainage")} placeholder="—" value={balcony.drainage}
          onChange={(v) => setBalcony((b) => void (b.drainage = v))} />
        {balcony.kind === "juliet" && (
          <MInput help="balDoorOpening" label={mt(lang, "balDoorOpening")} value={balcony.doorOpening}
            onChange={(v) => setBalcony((b) => void (b.doorOpening = v))} />
        )}
      </Grid>
    </Card>

    <Card stage="locations" title={`⚙ ${mt(lang, "balAnchorTitle")}`}>
      <p className="mb-3 text-xs text-neutral-400">{mt(lang, "balAnchorHint")}</p>
      <Grid>
        <MInput help="balSlabMaterial" label={mt(lang, "balSlabMaterial")} value={balcony.slabMaterial}
          onChange={(v) => setBalcony((b) => void (b.slabMaterial = v))} />
        <MInput help="balSlabThickness" label={mt(lang, "balSlabThickness")} value={balcony.slabThickness}
          onChange={(v) => setBalcony((b) => void (b.slabThickness = v))} />
        <MInput help="balAnchorType" label={mt(lang, "balAnchorType")} value={balcony.anchorType}
          onChange={(v) => setBalcony((b) => void (b.anchorType = v))} />
        <MInput help="balEmbedment" label={mt(lang, "balEmbedment")} value={balcony.anchorEmbedment}
          onChange={(v) => setBalcony((b) => void (b.anchorEmbedment = v))} />
        <MInput help="balEdgeDistance" label={mt(lang, "balEdgeDistance")} value={balcony.edgeDistance}
          onChange={(v) => setBalcony((b) => void (b.edgeDistance = v))} />
        <MInput help="balMinCover" label={mt(lang, "balMinCover")} placeholder="—" value={balcony.minCover}
          onChange={(v) => setBalcony((b) => void (b.minCover = v))} />
        <MInput help="balPlatePlan" label={mt(lang, "balPlatePlan")} placeholder="—" value={balcony.platePlan}
          onChange={(v) => setBalcony((b) => void (b.platePlan = v))} />
        <MInput help="balEdgeCondition" label={mt(lang, "balEdgeCondition")} placeholder="—" value={balcony.edgeCondition}
          onChange={(v) => setBalcony((b) => void (b.edgeCondition = v))} />
      </Grid>
    </Card>
    </>
  );
}
