"use client";

// The stair itself: the spiral column, the straightedge check on each flight,
// the pitch, the winder walkline, every rise and run, and the landings, ramps
// and curves between them. This is the part a tape measure produces.

import {
  type MeasureData,
  type FlightSegment,
  type PlatformSegment,
  type RampSegment,
  type CurveSegment,
} from "@/lib/shop/measure";
import { formatIn, parseMeas } from "@/lib/shop/measure-checks";
import { helpText } from "@/lib/shop/measure-help";
import { mt } from "@/lib/shop/measure-i18n";
import {
  Card,
  Grid,
  SmallBtn,
  MInput,
  ChipRow,
  ChoiceMInput,
  InfoHint,
  NominalFill,
  stepNumber,
  slopeDirectionChoices,
} from "../fields";

export default function StairSections({
  lang,
  data,
  set,
  isSpiral,
  isBuilder,
  hasWinders,
  multiFlight,
  flights,
  platforms,
  ramps,
  curves,
}: {
  lang: string;
  data: MeasureData;
  set: (fn: (d: MeasureData) => void) => void;
  isSpiral: boolean;
  isBuilder: boolean;
  hasWinders: boolean;
  multiFlight: boolean;
  flights: { seg: FlightSegment; i: number }[];
  platforms: { seg: PlatformSegment; i: number }[];
  ramps: { seg: RampSegment; i: number }[];
  curves: { seg: CurveSegment; i: number }[];
}) {
  return (
    <>
      {isSpiral && data.spiral && (
        <Card stage="steps" title={mt(lang, "spiralTitle")}>
          <Grid>
            <MInput help="floorToFloor" label={mt(lang, "floorToFloor")} value={data.spiral.floorToFloor}
              onChange={(v) => set((d) => void (d.spiral!.floorToFloor = v))} />
            <MInput help="treadsCount" label={mt(lang, "treadsCount")} placeholder="—" value={data.spiral.treads}
              onChange={(v) => set((d) => void (d.spiral!.treads = v))} />
            <MInput help="rotation" label={mt(lang, "rotation")} placeholder="°" value={data.spiral.rotationDeg}
              onChange={(v) => set((d) => void (d.spiral!.rotationDeg = v))} />
            <MInput help="diameter" label={mt(lang, "diameter")} value={data.spiral.diameter}
              onChange={(v) => set((d) => void (d.spiral!.diameter = v))} />
            <MInput help="columnSize" label={mt(lang, "columnSize")} value={data.spiral.columnSize}
              onChange={(v) => set((d) => void (d.spiral!.columnSize = v))} />
            <MInput help="clearWidth" label={mt(lang, "clearWidth")} value={data.spiral.clearWidth}
              onChange={(v) => set((d) => void (d.spiral!.clearWidth = v))} />
          </Grid>
          <div className="mt-3">
            <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "direction")}</div>
            <div className="flex gap-2">
              {(["ccw", "cw"] as const).map((dir) => (
                <button key={dir}
                  onClick={() => set((d) => void (d.spiral!.direction = dir))}
                  className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                    data.spiral!.direction === dir
                      ? "border-amber-500 bg-amber-500/10 text-amber-300"
                      : "border-neutral-700 bg-neutral-800 text-neutral-300"
                  }`}>
                  {dir === "ccw" ? "⟲" : "⟳"} {mt(lang, dir)}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <MInput help="landingNote" label={mt(lang, "landingNote")} placeholder="—" value={data.spiral.landingNote}
              onChange={(v) => set((d) => void (d.spiral!.landingNote = v))} />
          </div>
        </Card>
      )}

      {/* Flights — one measured row per step */}
      {flights.map(({ seg, i }, fi) => (
        <Card stage="level" key={`level-${i}`} title={`📏 ${mt(lang, "straightedgeCheck")} ${flights.length > 1 ? fi + 1 : ""}`}>
          <p className="mb-3 text-xs text-neutral-400">{mt(lang, "straightedgeHint")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {seg.steps.map((st, si) => (
              <MInput key={si} label={`${mt(lang, "step")} ${stepNumber(flights, fi, si)} — ${mt(lang, "levelGap")}`}
                placeholder={mt(lang, "touchingZero")} value={st.levelGap || ""}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].levelGap = v))} />
            ))}
          </div>
        </Card>
      ))}

      {flights.map(({ seg, i }, fi) => (
        <Card stage="locations" key={`angle-${i}`} title={`📐 ${mt(lang, "stairAngle")}${flights.length > 1 ? ` ${fi + 1}` : ""}`}>
          <p className="mb-3 text-xs text-neutral-400">{mt(lang, "angleFinderHint")}</p>
          <Grid>
            <MInput help="stairAngle" label={mt(lang, "stairAngle")} value={seg.angleDeg} placeholder="°"
              onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleDeg = v))} />
            <ChoiceMInput label={`${mt(lang, "angleBreak")} — ${mt(lang, "angleBreakHint")}`}
              choices={[["No change", mt(lang, "choiceNoChange")]]} placeholder="—" value={seg.angleBreak}
              onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).angleBreak = v))} />
          </Grid>
          <DerivedAngle seg={seg} lang={lang} />
          {/* Per flight, because a switchback puts the same wall on your other
              hand. Blank inherits the sheet-level orientation, which is right
              for a single-flight stair and for every sheet written before. */}
          {flights.length > 1 && (
            <div className="mt-3">
              <ChipRow
                label={mt(lang, "flightWallSide")}
                value={seg.wallSide}
                options={[
                  ["left", mt(lang, "choiceLeft")],
                  ["right", mt(lang, "choiceRight")],
                  ["both", mt(lang, "flightWallBoth")],
                  ["none", mt(lang, "flightWallNone")],
                ]}
                onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).wallSide = v as FlightSegment["wallSide"]))}
              />
            </div>
          )}
        </Card>
      ))}

      {hasWinders && (
        <Card stage="steps" title={`◺ ${mt(lang, "winderSetupTitle")}`}>
          <ChoiceMInput label={mt(lang, "walklineLbl")} hint={mt(lang, "walklineInfo")} hintDiagram="walkline" value={data.datums.walkline}
            choices={[["Mid-tread", mt(lang, "choiceMidTread")], ['12" from narrow edge', mt(lang, "choiceWalkline12")]]}
            onChange={(v) => set((d) => void (d.datums.walkline = v))} />
        </Card>
      )}

      {flights.map(({ seg, i }, fi) => (
        <Card stage="steps"
          key={i}
          title={
            flights.length > 1
              ? `${mt(lang, fi === 0 ? "lowerFlight" : "upperFlight")}`
              : mt(lang, "steps")
          }
        >
          {/* typical step: enter once, correct exceptions */}
          <NominalFill
            lang={lang}
            onFill={(nr, nu) =>
              set((d) => {
                const fl = d.segments[i] as FlightSegment;
                // spread first: winder fields and nosing survive the fill
                fl.steps = fl.steps.map((st) => ({
                  ...st,
                  rise: nr || st.rise,
                  run: nu || st.run,
                }));
              })
            }
          />

          {/* header row only where the compact grid shows (sm+) */}
          <div className="hidden sm:grid grid-cols-[2.2rem_1fr_1fr_1fr_3rem] gap-2 items-end mb-1 text-[11px] text-neutral-400">
            <span>#</span>
            {/* On tablets the per-field labels are hidden and this row is
                what the measurer reads, so the explanations live here too. */}
            <span className="flex items-center">
              {mt(lang, "rise")}
              <InfoHint text={helpText(lang, "rise")!} />
            </span>
            <span className="flex items-center">
              {mt(lang, "run")}
              <InfoHint text={helpText(lang, "run")!} />
            </span>
            <span className="flex items-center">
              {mt(lang, "nosing")}
              <InfoHint text={helpText(lang, "nosing")!} />
            </span>
            <span>◺</span>
          </div>
          {seg.steps.map((st, si) => (
            <div
              key={si}
              className="mb-3 rounded-xl border border-neutral-800 bg-neutral-950/40 p-3 sm:mb-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[2.2rem_1fr_1fr_1fr_3rem] sm:gap-2 sm:items-center"
            >
              <div className="sm:hidden text-xs font-bold text-amber-400 mb-2">
                {mt(lang, "step")} {stepNumber(flights, fi, si)}
              </div>
              <span className="hidden sm:block text-sm font-bold text-neutral-400 text-center border border-neutral-800 rounded-full w-7 h-7 leading-[26px]">
                {stepNumber(flights, fi, si)}
              </span>
              <div className="grid grid-cols-1 gap-2 sm:contents">
                <MInput help="rise" label={mt(lang, "rise")} labelClass="sm:hidden" value={st.rise}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].rise = v))} />
                <MInput help="run" label={mt(lang, "run")} labelClass="sm:hidden" value={st.run}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].run = v))} />
                <MInput help="nosing" label={mt(lang, "nosing")} labelClass="sm:hidden" value={st.nosing}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].nosing = v))} />
              </div>
              {/* winder toggle — triangular tread that turns the stair */}
              <button
                onClick={() =>
                  set((d) => {
                    const stp = (d.segments[i] as FlightSegment).steps[si];
                    stp.winder = !stp.winder;
                  })
                }
                className={`mt-2 sm:mt-0 px-2 py-2 rounded-lg border text-sm font-bold ${
                  st.winder
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-neutral-700 bg-neutral-800 text-neutral-500"
                }`}
                title={mt(lang, "winderLbl")}
              >
                ◺ <span className="sm:hidden">{mt(lang, "winderLbl")}</span>
              </button>
              {st.winder && (
                <div className="mt-2 sm:col-span-5 grid grid-cols-1 sm:grid-cols-3 gap-2 border border-amber-900/50 rounded-lg p-2 bg-amber-500/5">
                  <MInput help="winderRunIn" label={mt(lang, "winderRunIn")} value={st.runIn || ""}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].runIn = v))} />
                  <MInput help="winderRunOut" label={mt(lang, "winderRunOut")} value={st.runOut || ""}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].runOut = v))} />
                  <MInput help="winderTurn" label={mt(lang, "winderTurn")} placeholder="°" value={st.turnDeg || ""}
                    onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).steps[si].turnDeg = v))} />
                </div>
              )}
              {si === 0 && (
                <div className="mt-2 sm:mt-0 sm:col-span-5">
                  <SmallBtn
                    onClick={() =>
                      set((d) => {
                        const fl = d.segments[i] as FlightSegment;
                        const s1 = fl.steps[0];
                        // copy dimensions only — each step keeps its own
                        // winder flag and winder measurements
                        fl.steps = fl.steps.map((st) => ({
                          ...st,
                          rise: s1.rise,
                          run: s1.run,
                          nosing: s1.nosing,
                        }));
                      })
                    }
                  >
                    ⇊ {mt(lang, "copyToAll")}
                  </SmallBtn>
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            <SmallBtn onClick={() => set((d) => void (d.segments[i] as FlightSegment).steps.push({ rise: "", run: "", nosing: "" }))}>
              {mt(lang, "addStep")}
            </SmallBtn>
            <SmallBtn
              onClick={() =>
                set((d) => {
                  const fl = d.segments[i] as FlightSegment;
                  if (fl.steps.length > 1) {
                    fl.steps.pop();
                    d.posts = d.posts.filter(
                      (p) => !(p.segIdx === i && p.stepIdx !== null && p.stepIdx >= fl.steps.length)
                    );
                  }
                })
              }
            >
              {mt(lang, "removeStep")}
            </SmallBtn>
          </div>
          <Grid>
            <MInput help="width" label={mt(lang, "width")} value={seg.width}
              onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).width = v))} />
          </Grid>
          {multiFlight && (
            <div className="mt-3 border border-neutral-800 rounded-lg p-3 bg-neutral-950/40">
              <div className="text-xs text-neutral-500 mb-2">{mt(lang, "flightCtrlHint")}</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MInput help="flightRake" label={mt(lang, "flightRake")} value={seg.rake}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).rake = v))} />
                <MInput help="flightCtrlRise" label={mt(lang, "flightCtrlRise")} value={seg.ctrlRise}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).ctrlRise = v))} />
                <MInput help="flightCtrlRun" label={mt(lang, "flightCtrlRun")} value={seg.ctrlRun}
                  onChange={(v) => set((d) => void ((d.segments[i] as FlightSegment).ctrlRun = v))} />
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Platforms / landings */}
      {platforms.map(({ seg, i }) => (
        <Card stage="level" key={i} title={mt(lang, seg.turn === "none" ? "platform" : "landing")}>
          <Grid>
            <MInput help="length" label={mt(lang, "length")} value={seg.length}
              onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).length = v))} />
            <MInput help="depth" label={mt(lang, "depth")} value={seg.depth}
              onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).depth = v))} />
            <MInput help="landingDiag" label={mt(lang, "landingDiag")} value={seg.diag}
              onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).diag = v))} />
            <ChoiceMInput label={`${mt(lang, "slope")} — ${mt(lang, "slopeHint")}`} value={seg.slope}
              choices={[["0", mt(lang, "choiceLevel")]]}
              onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slope = v))} />
            {seg.slope.trim() !== "" && (
              <ChoiceMInput label={mt(lang, "slopeDir")} placeholder="—" value={seg.slopeDir}
                choices={slopeDirectionChoices(lang)} onChange={(v) => set((d) => void ((d.segments[i] as PlatformSegment).slopeDir = v))} />
            )}
          </Grid>
          {(seg.turn === "left" || seg.turn === "right") && (
            <div className="mt-3">
              <div className="text-[11px] text-neutral-400 mb-1">{mt(lang, "turn")}</div>
              <div className="flex gap-2">
                {(["left", "right"] as const).map((tn) => (
                  <button key={tn}
                    onClick={() => set((d) => void ((d.segments[i] as PlatformSegment).turn = tn))}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                      seg.turn === tn
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}>
                    {tn === "left" ? "↰" : "↱"} {mt(lang, tn === "left" ? "turnLeft" : "turnRight")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Ramps (one card per ramp segment) */}
      {ramps.map(({ seg, i }) => (
        <Card stage="steps" key={i} title={`${mt(lang, "shape_ramp")}${ramps.length > 1 || isBuilder ? ` #${i + 1}` : ""}`}>
          <Grid>
            <MInput help="rampSlopeLen" label={mt(lang, "rampSlopeLen")} value={seg.length}
              onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).length = v))} />
            <MInput help="rampRunH" label={mt(lang, "rampRunH")} value={seg.runH}
              onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).runH = v))} />
            <MInput help="totalRise" label={mt(lang, "totalRise")} value={seg.rise}
              onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).rise = v))} />
            <MInput help="stairAngle" label={mt(lang, "stairAngle")} value={seg.angleDeg} placeholder="°"
              onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).angleDeg = v))} />
            <MInput help="width" label={mt(lang, "width")} value={seg.width}
              onChange={(v) => set((d) => void ((d.segments[i] as RampSegment).width = v))} />
          </Grid>
        </Card>
      ))}

      {/* Curves */}
      {curves.map(({ seg, i }) => (
        <Card stage="steps" key={i} title={`⌒ ${mt(lang, "curveTitle")}${isBuilder ? ` #${i + 1}` : ""}`}>
          <Grid>
            <MInput help="curveRadius" label={mt(lang, "curveRadius")} value={seg.radius}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).radius = v))} />
            <MInput help="curveChord" label={mt(lang, "curveChord")} value={seg.chord}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).chord = v))} />
            <MInput help="curveArc" label={mt(lang, "curveArc")} value={seg.arc}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).arc = v))} />
            <MInput help="curveSweep" label={mt(lang, "curveSweep")} placeholder="°" value={seg.sweepDeg}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).sweepDeg = v))} />
            <MInput help="curveRise" label={mt(lang, "curveRise")} value={seg.rise}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).rise = v))} />
            <MInput help="width" label={mt(lang, "width")} value={seg.width}
              onChange={(v) => set((d) => void ((d.segments[i] as CurveSegment).width = v))} />
          </Grid>
          <div className="mt-3">
            <ChipRow help="turn"
              label={mt(lang, "turn")}
              value={seg.direction}
              options={[
                ["left", `↰ ${mt(lang, "turnLeft")}`],
                ["right", `↱ ${mt(lang, "turnRight")}`],
              ]}
              onChange={(v) =>
                set((d) => void ((d.segments[i] as CurveSegment).direction = (v || "left") as "left" | "right"))
              }
            />
          </div>
        </Card>
      ))}

      {/* Posts */}
    </>
  );
}


// The angle the steps already say, shown beside the one the finder says.
//
// The sheet has always computed this and compared the two — it just never
// showed the number, so a disagreement arrived as a colour with nothing to
// compare against. On a stair that is awkward to measure, seeing both is the
// point: they are two independent readings of the same thing, and which one
// to trust is a judgement the measurer makes standing there.
function DerivedAngle({ seg, lang }: { seg: FlightSegment; lang: string }) {
  let rise = 0;
  let run = 0;
  let complete = seg.steps.length > 0;
  for (const st of seg.steps) {
    const r = parseMeas(st.rise);
    const u = parseMeas(st.run);
    if (r === null || u === null) { complete = false; break; }
    rise += r;
    run += u;
  }
  if (!complete || run <= 0) {
    return (
      <p className="mt-2 text-xs text-neutral-500">{mt(lang, "derivedAngleWaiting")}</p>
    );
  }
  const calc = (Math.atan2(rise, run) * 180) / Math.PI;
  const meas = parseMeas(seg.angleDeg);
  const off = meas === null ? null : Math.abs(calc - meas);
  const tone =
    off === null ? "text-neutral-400" : off <= 1 ? "text-green-400" : off <= 2.5 ? "text-amber-400" : "text-red-400";
  return (
    <div className="mt-2 rounded-lg border border-neutral-700 bg-neutral-950/50 p-2.5">
      <div className="text-xs text-neutral-300">
        {mt(lang, "derivedAngle")}: <b className="tabular-nums">{calc.toFixed(1)}°</b>
        <span className="text-neutral-500"> · {mt(lang, "fromSteps")} {formatIn(rise)}&quot; / {formatIn(run)}&quot;</span>
      </div>
      {off !== null && (
        <div className={`mt-1 text-xs font-semibold ${tone}`}>
          {mt(lang, "vsFinder")} {meas!.toFixed(1)}° · {mt(lang, "offBy")} {off.toFixed(1)}°
        </div>
      )}
    </div>
  );
}
