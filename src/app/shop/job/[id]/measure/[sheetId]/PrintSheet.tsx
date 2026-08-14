"use client";

// Print-only branded field-measure sheet (KIW letterhead style: white with
// gold rules). Filled values print solid; missing ones print as blank lines
// so the sheet can also be completed by hand.

import type { Job } from "@/lib/shop/db";
import type {
  FlightSegment,
  MeasureData,
  MeasureSheet,
  PlatformSegment,
  PostMeasure,
  RampSegment,
} from "@/lib/shop/measure";
import { mt, optLabel, shapeLabel } from "@/lib/shop/measure-i18n";
import { specValue } from "@/lib/shop/i18n";
import Sketch from "./Sketch";

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
}: {
  job: Job;
  sheet: MeasureSheet;
  data: MeasureData;
  lang: string;
  workerName: string;
  posts: PostMeasure[];
}) {
  const flights = data.segments.filter((s) => s.kind === "flight") as FlightSegment[];
  const platforms = data.segments.filter((s) => s.kind === "platform") as PlatformSegment[];
  const ramp = data.segments.find((s) => s.kind === "ramp") as RampSegment | undefined;
  let stepNo = 0;

  return (
    <div className="hidden print:block bg-white text-black p-6" style={{ fontSize: 12 }}>
      {/* Letterhead */}
      <div className="flex items-start justify-between pb-2 mb-3" style={{ borderBottom: `3px solid ${GOLD}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>
            KING IRON WORKS
          </div>
          <div style={{ color: "#555" }}>
            69 Norman St, Unit 20, Everett, MA 02149 · (617) 404-2589 · kingsironworks.com
          </div>
        </div>
        <div style={{ textAlign: "right", color: "#555" }}>
          <div style={{ fontWeight: 700, color: "#000" }}>{mt(lang, "fieldMeasure")}</div>
          <div>{mt(lang, "pageOf")}</div>
        </div>
      </div>

      {/* Job header */}
      <table className="w-full mb-3" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <Th>{mt(lang, "measuredBy")}</Th>
            <Td>{workerName}</Td>
            <Th>{mt(lang, "dateLabel")}</Th>
            <Td>
              <span suppressHydrationWarning>{new Date().toLocaleDateString()}</span>
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
            <Th>{job.address ? "📍" : ""}</Th>
            <Td colSpan={3}>{job.address || ""}</Td>
          </tr>
        </tbody>
      </table>

      {/* Sketch (light palette) */}
      <div className="mb-3" style={{ border: "1px solid #ccc", borderRadius: 6, padding: 8 }}>
        <Sketch shape={sheet.shape} data={data} lang={lang} light />
      </div>

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
                </tr>
              </thead>
              <tbody>
                {flights.flatMap((fl, fi) =>
                  fl.steps.map((st, si) => {
                    stepNo += 1;
                    return (
                      <tr key={`${fi}-${si}`}>
                        <Td>{stepNo}</Td>
                        <Td><Val v={st.rise} /></Td>
                        <Td><Val v={st.run} /></Td>
                        <Td><Val v={st.nosing} /></Td>
                      </tr>
                    );
                  })
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
          </div>
        )}

        {/* Posts */}
        <div>
          <SectionTitle>
            {mt(lang, "posts")} ({posts.length})
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

          {/* Platforms */}
          {platforms.map((pl, i) => (
            <div key={i} className="mt-2">
              <b>{mt(lang, pl.turn === "none" ? "platform" : "landing")}: </b>
              {mt(lang, "length")}: <Val v={pl.length} /> · {mt(lang, "depth")}:{" "}
              <Val v={pl.depth} /> · {mt(lang, "slope")}: <Val v={pl.slope} />
              {pl.slopeDir && pl.slopeDir.trim() !== "" && <> → {pl.slopeDir}</>}
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
          <div className="mt-1">
            {mt(lang, "totalRise")}: <Val v={data.overall.totalRise} /> ·{" "}
            {mt(lang, "totalRun")}: <Val v={data.overall.totalRun} /> ·{" "}
            {mt(lang, "rakeLength")}: <Val v={data.overall.rakeLength} />
          </div>
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
            <div style={{ borderBottom: "1px solid #bbb", height: 22 }} />
          </div>
        )}
      </div>

      <div
        className="mt-4 pt-2"
        style={{ borderTop: `2px solid ${GOLD}`, color: "#777", fontSize: 10 }}
      >
        KING IRON WORKS · {mt(lang, "fieldMeasure")} · {job.job_number}
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
