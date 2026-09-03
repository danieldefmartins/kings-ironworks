"use client";

// The joints between separately-fabricated pieces.
//
// Each flight is built in the shop on its own and welded to the next one on
// site. Everything else on this sheet describes a piece; this describes where
// two pieces meet, which is the dimension that decides whether steel made a
// week apart actually fits. Before this existed the sheet carried a single
// free-text box for every joint on the stair — three flights, four joints, one
// sentence — so the shop was guessing the connection and a wrong guess is a
// return trip.

import { JOINT_METHODS, type JointMeasure, type MeasureData, type Segment } from "@/lib/shop/measure";
import { mt } from "@/lib/shop/measure-i18n";
import { Card, Grid, MInput, ChipRow } from "../fields";

function segLabel(lang: string, seg: Segment | undefined, i: number): string {
  if (!seg) return `#${i + 1}`;
  const n = `${i + 1}`;
  if (seg.kind === "flight") return `${mt(lang, "flight")} ${n}`;
  if (seg.kind === "platform") return `${mt(lang, "landing")} ${n}`;
  if (seg.kind === "ramp") return `${mt(lang, "ramp")} ${n}`;
  return `${mt(lang, "curve")} ${n}`;
}

export default function JointSections({
  lang,
  data,
  set,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
}) {
  const joints = data.joints || [];
  if (joints.length === 0) return null;

  const edit = (idx: number, fn: (j: JointMeasure) => void) =>
    set((d) => {
      const j = (d.joints || [])[idx];
      if (j) fn(j);
    });

  return (
    <>
      {joints.map((j, idx) => {
        const lower = data.segments[j.afterSegment];
        const upper = data.segments[j.afterSegment + 1];
        const onePiece = j.method === "one_piece";
        return (
          <Card
            stage="locations"
            key={`joint-${j.afterSegment}`}
            title={`🔗 ${mt(lang, "jointTitle")} J${j.afterSegment + 1} — ${segLabel(lang, lower, j.afterSegment)} → ${segLabel(lang, upper, j.afterSegment + 1)}`}
          >
            <p className="mb-3 text-xs text-neutral-400">{mt(lang, "jointHint")}</p>

            <ChipRow
              label={mt(lang, "jointMethod")}
              value={j.method}
              options={JOINT_METHODS.map((m) => [m, mt(lang, `jointMethod_${m}`)] as [string, string])}
              onChange={(v) => edit(idx, (jt) => void (jt.method = v as JointMeasure["method"]))}
            />

            {/* Fabricated through means there is no joint here — asking for a
                gap and an angle would be asking about something that does not
                exist. */}
            {!onePiece && (
              <>
                <Grid>
                  <MInput
                    label={mt(lang, "jointGap")}
                    hint={mt(lang, "jointGapHint")}
                    value={j.gap}
                    placeholder='0"'
                    onChange={(v) => edit(idx, (jt) => void (jt.gap = v))}
                  />
                  <MInput
                    label={mt(lang, "jointAngleChange")}
                    hint={mt(lang, "jointAngleChangeHint")}
                    value={j.angleChange}
                    placeholder="°"
                    onChange={(v) => edit(idx, (jt) => void (jt.angleChange = v))}
                  />
                </Grid>
                <Grid>
                  <MInput
                    label={mt(lang, "jointOffsetV")}
                    value={j.offsetV}
                    placeholder='0"'
                    onChange={(v) => edit(idx, (jt) => void (jt.offsetV = v))}
                  />
                  <MInput
                    label={mt(lang, "jointOffsetH")}
                    value={j.offsetH}
                    placeholder='0"'
                    onChange={(v) => edit(idx, (jt) => void (jt.offsetH = v))}
                  />
                </Grid>

                <ChipRow
                  label={mt(lang, "jointCarriedBy")}
                  value={j.carriedBy}
                  options={[
                    ["lower", mt(lang, "jointCarriedLower")],
                    ["upper", mt(lang, "jointCarriedUpper")],
                    ["both", mt(lang, "jointCarriedBoth")],
                  ]}
                  onChange={(v) => edit(idx, (jt) => void (jt.carriedBy = v as JointMeasure["carriedBy"]))}
                />

                <Grid>
                  <MInput
                    label={mt(lang, "jointLeaveLong")}
                    hint={mt(lang, "jointLeaveLongHint")}
                    value={j.leaveLong}
                    placeholder="—"
                    onChange={(v) => edit(idx, (jt) => void (jt.leaveLong = v))}
                  />
                  <MInput
                    label={mt(lang, "jointNote")}
                    value={j.note}
                    placeholder="—"
                    onChange={(v) => edit(idx, (jt) => void (jt.note = v))}
                  />
                </Grid>
              </>
            )}
          </Card>
        );
      })}
    </>
  );
}
