"use client";

// Print-only branded field-measure sheet (KIW letterhead style: white with
// gold rules). Filled values print solid; missing ones print as blank lines
// so the sheet can also be completed by hand. Sheets that are not APPROVED
// print with a DO NOT FABRICATE watermark; approved sheets carry their
// revision number, who measured and who approved, and a QR code back to the
// live digital sheet.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Job } from "@/lib/shop/db";
import type {
  CurveSegment,
  FlightSegment,
  MeasureData,
  MeasureSheet,
  PlatformSegment,
  PostMeasure,
  RampSegment,
} from "@/lib/shop/measure";
import type { CheckResult } from "@/lib/shop/measure-checks";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { specValue } from "@/lib/shop/i18n";
import Sketch, { sketchViews } from "./Sketch";

const GOLD = "#b8860b";

function Val({ v }: { v: string }) {
  const has = v && v.trim() !== "";
  return has ? (
    <span style={{ fontWeight: 700 }}>{v}</span>
  ) : (
    <span
      style={{
        display: "inline-block",
        minWidth: "3.5rem",
        borderBottom: "1px solid #999",
      }}
    >
      &nbsp;
    </span>
  );
}

export default function PrintSheet({
  job,
  sheet,
  data,
  lang,
  workerName,
  posts,
  nameById = {},
  checks = [],
  gapCount = 0,
  visible = false,
  qrUrl,
  superseded = false,
  branding,
}: {
  job: Job;
  sheet: MeasureSheet;
  data: MeasureData;
  lang: string;
  workerName: string;
  posts: PostMeasure[];
  nameById?: Record<string, string>;
  checks?: CheckResult[];
  gapCount?: number;
  visible?: boolean; // revision viewer renders it on screen, not print-only
  qrUrl?: string; // approved sheets QR to the LOCKED revision, not the live record
  superseded?: boolean; // an old revision replaced by a newer approval
  branding?: { name: string; address: string; phone: string; website: string };
}) {
  const brand = branding || {
    name: "KING IRON WORKS",
    address: "69 Norman St, Unit 20, Everett, MA 02149",
    phone: "(617) 404-2589",
    website: "kingsironworks.com",
  };
  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const platforms = data.segments.filter((s) => s.kind === "platform") as PlatformSegment[];
  const ramp = data.segments.find((s) => s.kind === "ramp") as RampSegment | undefined;
  const curveSegs = data.segments.filter((s) => s.kind === "curve") as CurveSegment[];
  const anyWinder = flights.some((fl) => fl.steps.some((st) => st.winder));
  // step numbering continues across flights (bottom flight first)
  const flightOffsets: number[] = [];
  for (let i = 0, acc = 0; i < flights.length; i++) {
    flightOffsets.push(acc);
    acc += flights[i].steps.length;
  }

  const approved = sheet.status === "approved";
  const warnings = checks.filter((c) => c.level === "yellow" || c.level === "red");

  // QR: approved work points at the immutable revision; otherwise the live sheet
  const target =
    qrUrl ||
    (approved && sheet.current_rev
      ? `https://kingsironworks.com/shop/job/${job.id}/measure/${sheet.id}/rev/${sheet.current_rev}`
      : `https://kingsironworks.com/shop/job/${job.id}/measure/${sheet.id}`);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(target, { type: "svg", margin: 0, width: 84 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [target]);

  const orientation = data.datums?.orientation;

  return (
    <div
      className={`${visible ? "block" : "hidden print:block"} bg-white text-black p-6`}
      style={{ fontSize: 12, position: "relative" }}
    >
      {/* Superseded watermark: an older revision replaced by a newer approval */}
      {superseded && (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", pointerEvents: "none", zIndex: 5,
          }}
        >
          <div
            style={{
              transform: "rotate(-28deg)", fontSize: 44, fontWeight: 900,
              color: "rgba(120, 113, 108, 0.3)", border: "4px solid rgba(120, 113, 108, 0.3)",
              padding: "10px 30px", letterSpacing: 4,
            }}
          >
            {mt(lang, "supersededMark")}
          </div>
        </div>
      )}
      {/* Not-approved watermark */}
      {!approved && !superseded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <div
            style={{
              transform: "rotate(-28deg)",
              fontSize: 34,
              fontWeight: 900,
              color: "rgba(185, 28, 28, 0.28)",
              border: "4px solid rgba(185, 28, 28, 0.28)",
              padding: "10px 26px",
              letterSpacing: 2,
              textAlign: "center",
            }}
          >
            {mt(lang, "notApprovedMark")}
          </div>
        </div>
      )}

      {/* Letterhead */}
      <div
        className="flex items-start justify-between pb-2 mb-3"
        style={{ borderBottom: `3px solid ${GOLD}` }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{brand.name}</div>
          <div style={{ color: "#555" }}>
            {brand.address} · {brand.phone} · {brand.website}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ textAlign: "right", color: "#555" }}>
            <div style={{ fontWeight: 700, color: "#000" }}>{mt(lang, "fieldMeasure")}</div>
            <div>
              {mt(lang, "revLabel")} {sheet.current_rev || 0}
              {" · "}
              <span
                style={{
                  fontWeight: 800,
                  color: approved ? "#166534" : "#b91c1c",
                }}
              >
                {approved ? mt(lang, "approvedBadge") : mt(lang, "inProgress").toUpperCase()}
              </span>
            </div>
            <div>{mt(lang, "pageOf")}</div>
          </div>
          {qr && (
            <div
              style={{ width: 84, height: 84 }}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          )}
        </div>
      </div>

      {/* Job header */}
      <table className="w-full mb-2" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <Th>{mt(lang, "measuredBy")}</Th>
            <Td>
              {(sheet.submitted_by && nameById[sheet.submitted_by]) || workerName}
              {sheet.submitted_at ? ` · ${new Date(sheet.submitted_at).toLocaleString()}` : ""}
            </Td>
            <Th>{mt(lang, "reviewedByLbl")}</Th>
            <Td>
              {approved && sheet.approved_by ? (
                <>
                  <b>{nameById[sheet.approved_by] || "—"}</b>
                  {sheet.approved_at ? ` · ${new Date(sheet.approved_at).toLocaleString()}` : ""}
                </>
              ) : (
                <Val v="" />
              )}
            </Td>
          </tr>
          <tr>
            <Th>{mt(lang, "jobLabel")}</Th>
            <Td>
              {job.customer_name} · {job.job_number}
            </Td>
            <Th>{shapeLabel(lang, sheet.shape)}</Th>
            <Td>{sheet.name || "—"}</Td>
          </tr>
          <tr>
            <Th>📍</Th>
            <Td>{job.address || ""}</Td>
            <Th>{mt(lang, "dateLabel")}</Th>
            <Td>
              <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
            </Td>
          </tr>
        </tbody>
      </table>

      {/* Orientation + units strip */}
      <div
        style={{
          border: `2px solid ${GOLD}`,
          borderRadius: 6,
          padding: "4px 10px",
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 0.5,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span>
          {mt(lang, "orientBanner")}
          {orientation ? ` · ${mt(lang, `orient_${orientation}`)}` : " · ______________"}
        </span>
        <span>
          {mt(lang, "unitsLabel")}:{" "}
          {mt(lang, data.units === "ftin" ? "unitsFtIn" : "unitsIn")}
        </span>
      </div>

      {/* Warnings */}
      {(warnings.length > 0 || gapCount > 0) && (
        <div
          style={{
            border: "2px solid #b91c1c",
            borderRadius: 6,
            padding: "4px 10px",
            marginBottom: 8,
            fontSize: 11,
            color: "#7f1d1d",
          }}
        >
          ⚠ {mt(lang, "warningsLbl")}:{" "}
          {warnings.map((w) => `${mt(lang, `check_${w.key}`)} (${mt(lang, w.level === "red" ? "levelRed" : "levelYellow")})`).join(" · ")}
          {gapCount > 0
            ? `${warnings.length > 0 ? " · " : ""}${mt(lang, "gapsTitle")}: ${gapCount}`
            : ""}
        </div>
      )}

      {/* Sketches (light palette): first two views of this shape */}
      <div className={`grid ${sketchViews(sheet.shape).length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-3 mb-3`}>
        {sketchViews(sheet.shape)
          .slice(0, 2)
          .map(([vw, key]) => (
            <div key={vw} style={{ border: "1px solid #ccc", borderRadius: 6, padding: 8 }}>
              <div style={{ fontSize: 10, color: "#555", marginBottom: 2 }}>
                {mt(lang, key)}
              </div>
              <Sketch shape={sheet.shape} data={data} lang={lang} light view={vw} />
            </div>
          ))}
      </div>

      {/* Custom shape: dimension table for every drawn line */}
      {sheet.shape === "custom" && data.plan && data.plan.segs.length > 0 && (
        <div className="mb-3">
          <SectionTitle>{mt(lang, "planSegs")}</SectionTitle>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>{mt(lang, "length")}</Th>
                <Th>{mt(lang, "segNoteLbl")}</Th>
              </tr>
            </thead>
            <tbody>
              {data.plan.segs.map((sg, i) => (
                <tr key={i}>
                  <Td>{i + 1}</Td>
                  <Td><Val v={sg.len} /></Td>
                  <Td>{sg.note ? <b>{sg.note}</b> : <Val v="" />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Steps */}
        {flights.length > 0 && (
          <div>
            <SectionTitle>{mt(lang, "steps")}</SectionTitle>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>{mt(lang, "rise")}</Th>
                  <Th>{mt(lang, "run")}</Th>
                  <Th>{mt(lang, "nosing")}</Th>
                  {anyWinder && (
                    <>
                      <Th>{mt(lang, "winderRunIn")}</Th>
                      <Th>{mt(lang, "winderRunOut")}</Th>
                      <Th>{mt(lang, "winderTurn")}</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {flights.flatMap((fl, fi) =>
                  fl.steps.map((st, si) => (
                    <tr key={`${fi}-${si}`}>
                      <Td>{flightOffsets[fi] + si + 1}{st.winder ? " ◺" : ""}</Td>
                      <Td><Val v={st.rise} /></Td>
                      <Td><Val v={st.run} /></Td>
                      <Td><Val v={st.nosing} /></Td>
                      {anyWinder && (
                        <>
                          <Td>{st.winder ? <Val v={st.runIn || ""} /> : "—"}</Td>
                          <Td>{st.winder ? <Val v={st.runOut || ""} /> : "—"}</Td>
                          <Td>{st.winder ? <Val v={st.turnDeg || ""} /> : "—"}</Td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {flights.map((fl, fi) => (
              <div key={fi} className="mt-1">
                {flights.length > 1 && (
                  <b>{mt(lang, fi === 0 ? "lowerFlight" : "upperFlight")}: </b>
                )}
                {mt(lang, "width")}: <Val v={fl.width} /> · {mt(lang, "stairAngle")}:{" "}
                <Val v={fl.angleDeg} />
                {fl.angleBreak && fl.angleBreak.trim() !== "" && (
                  <>
                    {" "}
                    · {mt(lang, "angleBreak")}: <b>{fl.angleBreak}</b>
                  </>
                )}
              </div>
            ))}
            {/* control dimensions */}
            <div className="mt-2">
              <SectionTitle>{mt(lang, "controlsTitle")}</SectionTitle>
              <div>
                {mt(lang, "floorToFloor")}: <Val v={data.overall.floorToFloor} /> ·{" "}
                {mt(lang, "totalRise")}: <Val v={data.overall.totalRise} />
              </div>
              <div>
                {mt(lang, "totalRun")}: <Val v={data.overall.totalRun} /> ·{" "}
                {mt(lang, "rakeLength")}: <Val v={data.overall.rakeLength} />
              </div>
              <div>
                {mt(lang, "widthBottom")}: <Val v={data.overall.widthBottom} /> ·{" "}
                {mt(lang, "widthMid")}: <Val v={data.overall.widthMid} /> ·{" "}
                {mt(lang, "widthTop")}: <Val v={data.overall.widthTop} />
              </div>
            </div>
          </div>
        )}

        {/* Posts */}
        <div>
          <SectionTitle>
            {mt(lang, "posts")} ({posts.length})
            {data.datums?.postRef
              ? ` — ${mt(lang, `postRef_${data.datums.postRef}`)}`
              : ""}
          </SectionTitle>
          {posts.length === 0 ? (
            <div style={{ color: "#777" }}>—</div>
          ) : (
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>{mt(lang, "onStep")}</Th>
                  <Th>{mt(lang, "fromNosing")}</Th>
                  <Th>{mt(lang, "fromEdge")}</Th>
                  <Th>{mt(lang, "mountType")}</Th>
                  <Th>{mt(lang, "anchorInto")}</Th>
                </tr>
              </thead>
              <tbody>
                {posts.map((po, i) => (
                  <tr key={po.id}>
                    <Td>P{i + 1}</Td>
                    <Td>{po.stepIdx !== null ? stepOf(data, po) : mt(lang, "platform")}</Td>
                    <Td><Val v={po.stepIdx !== null ? po.fromNosing : po.pos} /></Td>
                    <Td><Val v={po.fromEdge} /></Td>
                    <Td>{po.mount ? optLabel(lang, po.mount) : <Val v="" />}</Td>
                    <Td>{po.anchor ? optLabel(lang, po.anchor) : <Val v="" />}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {posts.some((po) => po.plate || po.anchors || po.substrate || po.edgeDist || po.obstruction) && (
            <div className="mt-1" style={{ fontSize: 11 }}>
              {posts.map((po, i) =>
                po.plate || po.anchors || po.substrate || po.edgeDist || po.obstruction ? (
                  <div key={po.id}>
                    <b>P{i + 1}:</b>
                    {po.plate ? ` ${mt(lang, "postPlate")}: ${po.plate}.` : ""}
                    {po.anchors ? ` ${mt(lang, "postAnchors")}: ${po.anchors}.` : ""}
                    {po.substrate ? ` ${mt(lang, "postSubstrate")}: ${po.substrate}.` : ""}
                    {po.edgeDist ? ` ${mt(lang, "postEdgeDist")}: ${po.edgeDist}.` : ""}
                    {po.obstruction ? ` ${mt(lang, "postObstruction")}: ${po.obstruction}.` : ""}
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Platforms */}
          {platforms.map((pl, i) => (
            <div key={i} className="mt-2">
              <b>{mt(lang, pl.turn === "none" ? "platform" : "landing")}: </b>
              {mt(lang, "length")}: <Val v={pl.length} /> · {mt(lang, "depth")}:{" "}
              <Val v={pl.depth} /> · {mt(lang, "slope")}: <Val v={pl.slope} />
              {pl.slopeDir && pl.slopeDir.trim() !== "" && <> → {pl.slopeDir}</>}
            </div>
          ))}

          {curveSegs.map((cv, i) => (
            <div key={`cv${i}`} className="mt-2">
              <b>{mt(lang, "curveTitle")}: </b>
              R <Val v={cv.radius} /> · {mt(lang, "curveChord")}: <Val v={cv.chord} /> ·{" "}
              {mt(lang, "curveArc")}: <Val v={cv.arc} />
              {cv.sweepDeg ? <> · {cv.sweepDeg}°</> : null}
              {cv.rise ? <> · {mt(lang, "totalRise")}: <b>{cv.rise}</b></> : null} ·{" "}
              {mt(lang, "width")}: <Val v={cv.width} /> ·{" "}
              {cv.direction === "left" ? "↰" : "↱"}
            </div>
          ))}

          {ramp && (
            <div className="mt-2">
              <b>{mt(lang, "shape_ramp")}: </b>
              {mt(lang, "length")}: <Val v={ramp.length} /> · {mt(lang, "totalRise")}:{" "}
              <Val v={ramp.rise} /> · ∠ <Val v={ramp.angleDeg} /> · {mt(lang, "width")}:{" "}
              <Val v={ramp.width} />
            </div>
          )}

          {data.spiral && (
            <div className="mt-2">
              <b>{mt(lang, "spiralTitle")}: </b>
              {mt(lang, "floorToFloor")}: <Val v={data.spiral.floorToFloor} /> ·{" "}
              {mt(lang, "treadsCount")}: <Val v={data.spiral.treads} /> ·{" "}
              {mt(lang, "rotation")}: <Val v={data.spiral.rotationDeg} /> · Ø{" "}
              <Val v={data.spiral.diameter} /> · {mt(lang, "columnSize")}:{" "}
              <Val v={data.spiral.columnSize} /> ·{" "}
              {mt(lang, data.spiral.direction === "cw" ? "cw" : "ccw")}
            </div>
          )}

          {/* Datums */}
          <div className="mt-2">
            <SectionTitle>{mt(lang, "datumsTitle")}</SectionTitle>
            <div>
              {mt(lang, "bottomDatum")}: <Val v={data.datums.bottomDatum} />
            </div>
            <div>
              {mt(lang, "topDatum")}: <Val v={data.datums.topDatum} /> ·{" "}
              {mt(lang, "surfaceState")}:{" "}
              {data.datums.surfaceState ? (
                <b>{mt(lang, `surf_${data.datums.surfaceState}`)}</b>
              ) : (
                <Val v="" />
              )}
            </div>
            {data.datums.nosingRef && (
              <div>
                {mt(lang, "nosingRefLbl")}: <b>{data.datums.nosingRef}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rail + materials */}
      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <SectionTitle>{mt(lang, "railSection")}</SectionTitle>
          <div>
            {mt(lang, "railKind")}: {data.rail.kind ? optLabel(lang, data.rail.kind) : <Val v="" />} ·{" "}
            {mt(lang, "railHeight")}: <Val v={data.rail.height} /> · {mt(lang, "railSide")}:{" "}
            {data.rail.side ? optLabel(lang, data.rail.side) : <Val v="" />}
          </div>
          <div>
            {mt(lang, "extensions")}: <Val v={data.rail.extensions} /> ·{" "}
            {mt(lang, "returnsLabel")}: <Val v={data.rail.returns} />
          </div>
          {data.rail.brackets && data.rail.brackets.trim() !== "" && (
            <div>
              {mt(lang, "brackets")}: <b>{data.rail.brackets}</b>
            </div>
          )}
          {/* rail spans & terminations */}
          {data.spans.length > 0 && (
            <div className="mt-2">
              <SectionTitle>{mt(lang, "spansTitle")}</SectionTitle>
              {data.spans.map((sp, i) => (
                <div key={sp.id} style={{ marginBottom: 4 }}>
                  <div>
                    <b>#{i + 1}</b>
                    {sp.label ? ` ${sp.label}` : ""} · {mt(lang, "topSpanLbl")}: <Val v={sp.topSpan} />
                    {(sp.start.molding || sp.end.molding) && (
                      <>
                        {" · "}
                        {mt(lang, "lowerSpanLbl")}: <Val v={sp.lowerSpan} />
                      </>
                    )}
                  </div>
                  {(["start", "end"] as const).map((ek) => {
                    const t = sp[ek];
                    if (!t.attachTo) return (
                      <div key={ek} style={{ paddingLeft: 10 }}>
                        {mt(lang, ek === "start" ? "startTerm" : "endTerm")}: <Val v="" />
                      </div>
                    );
                    const hw = t.hardware;
                    const postNo = t.postId ? posts.findIndex((po) => po.id === t.postId) : -1;
                    const hwDims = (
                      [
                        ["hwProfile", hw.profile],
                        ["hwThickness", hw.thickness],
                        ["hwHoleDia", hw.holeDia],
                        ["hwHoleSpacing", hw.holeSpacing],
                        ["hwEdgeDist", hw.edgeDist],
                        ["hwEmbedment", hw.embedment],
                        ["hwOrientation", hw.orientation],
                        ["hwWeldSize", hw.weldSize],
                      ] as [string, string][]
                    ).filter(([, v]) => v && v.trim() !== "");
                    return (
                      <div key={ek} style={{ paddingLeft: 10 }}>
                        {mt(lang, ek === "start" ? "startTerm" : "endTerm")}:{" "}
                        <b>{mt(lang, `attach_${t.attachTo}`)}</b>
                        {t.attachTo === "free_post" && postNo >= 0 ? <> → <b>P{postNo + 1}</b></> : null}
                        {t.attachTo === "continue" && t.spanRef
                          ? ` → #${data.spans.findIndex((x) => x.id === t.spanRef) + 1}`
                          : ""}
                        {t.method ? <> · <b>{mt(lang, `method_${t.method}`)}</b></> : null}
                        {t.material ? ` · ${optLabel(lang, t.material)}` : ""}
                        {t.columnW ? ` · ${t.columnW}×${t.columnD || "?"}` : ""}
                        {t.molding ? ` · ${mt(lang, "moldingLbl").split(" (")[0]}: ${t.molding} @ ${t.moldingHeight || "?"}` : ""}
                        {t.plumb ? ` · ${mt(lang, "plumbLbl")}: ${t.plumb}` : ""}
                        {hw.fastener ? ` · ${hw.qty || "?"}× ${hw.fastener}` : ""}
                        {hw.elevation ? ` @ ${hw.elevation}` : ""}
                        {hw.shopField ? ` (${mt(lang, hw.shopField)})` : ""}
                        {t.backing ? ` · ${t.backing}` : ""}
                        {hwDims.length > 0 && (
                          <div style={{ paddingLeft: 14, fontSize: 11 }}>
                            {hwDims.map(([lbl, v]) => `${mt(lang, lbl)}: ${v}`).join(" · ")}
                          </div>
                        )}
                        {t.note ? <div style={{ paddingLeft: 14, fontSize: 11 }}>{t.note}</div> : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {/* finish conditions */}
          {(data.finish.futureTopping || data.finish.demoPending || data.finish.verifyAfterFinishes ||
            data.finish.bottomSurface || data.finish.topSurface) && (
            <div className="mt-2">
              <SectionTitle>{mt(lang, "finishTitle")}</SectionTitle>
              {data.finish.bottomSurface && (
                <div>{mt(lang, "bottomSurface")}: <b>{data.finish.bottomSurface}</b></div>
              )}
              {data.finish.topSurface && (
                <div>{mt(lang, "topSurface")}: <b>{data.finish.topSurface}</b></div>
              )}
              {data.finish.futureTopping && (
                <div>{mt(lang, "futureTopping")}: <b>{data.finish.futureTopping}</b></div>
              )}
              {data.finish.demoPending && (
                <div>{mt(lang, "demoPending")}: <b>{data.finish.demoPending}</b></div>
              )}
              {data.finish.verifyAfterFinishes && (
                <div style={{ fontWeight: 800, color: "#b91c1c" }}>
                  ⚠ {mt(lang, "verifyAfterFinishes")}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <SectionTitle>{mt(lang, "materialsTitle")}</SectionTitle>
          <div>{mt(lang, "matPost")}: <Val v={data.materials.post} /></div>
          <div>{mt(lang, "matTopRail")}: <Val v={data.materials.topRail} /></div>
          <div>
            {mt(lang, "matPicket")}: <Val v={data.materials.picket} /> ·{" "}
            {mt(lang, "matPicketSpacing")}: <Val v={data.materials.picketSpacing} />
          </div>
          <div>{mt(lang, "matBottomRail")}: <Val v={data.materials.bottomRail} /></div>
          <div>
            {mt(lang, "finish")}:{" "}
            {data.materials.finish ? specValue(lang, data.materials.finish) : <Val v="" />} ·{" "}
            {mt(lang, "color")}:{" "}
            {data.materials.color ? specValue(lang, data.materials.color) : <Val v="" />}
          </div>
          {data.materials.notes && data.materials.notes.trim() !== "" && (
            <div>{mt(lang, "matNotes")}: <b>{data.materials.notes}</b></div>
          )}
          {/* fabrication details */}
          {Object.values(data.fab).some((v) => v && v.trim() !== "") && (
            <div className="mt-2">
              <SectionTitle>{mt(lang, "fabTitle")}</SectionTitle>
              {(
                [
                  ["corners", "fabCorners"],
                  ["flightConnection", "fabFlightConnection"],
                  ["bottomClearance", "fabBottomClearance"],
                  ["infill", "fabInfill"],
                  ["splices", "fabSplices"],
                  ["maxPiece", "fabMaxPiece"],
                  ["access", "fabAccess"],
                  ["gate", "fabGate"],
                  ["touchup", "fabTouchup"],
                ] as [keyof typeof data.fab, string][]
              ).map(([k, lbl]) =>
                data.fab[k] && data.fab[k].trim() !== "" ? (
                  <div key={k}>
                    {mt(lang, lbl)}: <b>{data.fab[k]}</b>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <SectionTitle>{mt(lang, "notes")}</SectionTitle>
        {data.overall.notes && data.overall.notes.trim() !== "" ? (
          <div style={{ whiteSpace: "pre-wrap" }}>{data.overall.notes}</div>
        ) : (
          <div>
            <div style={{ borderBottom: "1px solid #bbb", height: 22 }} />
            <div style={{ borderBottom: "1px solid #bbb", height: 22 }} />
          </div>
        )}
      </div>

      <div
        className="mt-4 pt-2"
        style={{ borderTop: `2px solid ${GOLD}`, color: "#777", fontSize: 10 }}
      >
        {brand.name} · {mt(lang, "fieldMeasure")} · {job.job_number} ·{" "}
        {mt(lang, "revLabel")} {sheet.current_rev || 0} ·{" "}
        {approved ? mt(lang, "approvedBadge") : mt(lang, "notApprovedMark")} ·{" "}
        {data.photos.length} 📷
      </div>
    </div>
  );
}

function stepOf(data: MeasureData, po: PostMeasure): number {
  let n = 0;
  for (let si = 0; si < data.segments.length; si++) {
    const seg = data.segments[si];
    if (seg.kind !== "flight") continue;
    if (si === po.segIdx) return n + (po.stepIdx ?? 0) + 1;
    n += seg.steps.length;
  }
  return (po.stepIdx ?? 0) + 1;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 800,
        textTransform: "uppercase",
        fontSize: 11,
        letterSpacing: 0.5,
        borderBottom: `2px solid ${GOLD}`,
        marginBottom: 4,
        paddingBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        border: "1px solid #ccc",
        padding: "3px 6px",
        textAlign: "left",
        background: "#f4f0e6",
        fontSize: 11,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  colSpan,
}: {
  children?: React.ReactNode;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} style={{ border: "1px solid #ccc", padding: "3px 6px" }}>
      {children}
    </td>
  );
}
