"use client";

// Print block for a wall-cap railing: the wall and guard summary, the
// elevation, a section at the tightest post, then one table of every post the
// fabricator drills — run, cap width, top of cap, both edge distances — and
// every check.

import { mt } from "@/lib/shop/measure-i18n";
import { parseMeas } from "@/lib/shop/measure-parse";
import {
  guardHeight,
  guardRequirement,
  postCut,
  postsOf,
  cornerTop,
  runRailLength,
  runRise,
  runTag,
  WC_TOL,
  wallCapChecks,
  wallCapSummary,
  type WallCapData,
  type WcLimits,
} from "@/lib/shop/measure-wall-cap";
import { CapSection } from "./WallCapSketch";
import { checkNumbers, useMeasFmt, type Fmt } from "./MeasureFormKit";
import { WC_CHECK_LABELS } from "./WallCapSections";

const GOLD = "#b8860b";
const cell: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "4px 6px", textAlign: "left", verticalAlign: "top" };
const head: React.CSSProperties = { ...cell, background: "#f1f5f9", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.3 };
const LEVEL_COLOR = { green: "#166534", yellow: "#92400e", red: "#b91c1c", na: "#64748b" } as const;

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, borderBottom: `2px solid ${GOLD}`, margin: "10px 0 4px" }}>{children}</div>;
}
const v = (s: string | undefined | null) => (s && s.trim() ? s : "—");
const m = (fm: Fmt, s: string) => (parseMeas(s) === null ? (s.trim() || "—") : fm(parseMeas(s)));
const mi = (fm: Fmt, s: string) => (parseMeas(s) === null ? (s.trim() || "—") : fm(parseMeas(s)));

export default function WallCapPrint({ w, lang, limits }: { w: WallCapData; lang: string; limits: WcLimits }) {
  const fm = useMeasFmt();
  const t = (k: string) => mt(lang, k);
  const checks = wallCapChecks(w, limits).filter((c) => c.level !== "na");
  const sum = wallCapSummary(w);
  const posts = postsOf(w);
  const req = guardRequirement(w, limits);
  const have = guardHeight(w);
  const cut = postCut(w);
  const tight = [...posts].sort((a, b) => Math.min(parseMeas(a.p.edgeHigh) ?? 99, parseMeas(a.p.edgeLow) ?? 99) - Math.min(parseMeas(b.p.edgeHigh) ?? 99, parseMeas(b.p.edgeLow) ?? 99))[0];
  const red = [...new Set(checks.filter((c) => c.level === "red" && c.detail).map((c) => (c.detail || "").split(" ")[0]))];
  const yn = (x: string) => (x ? t(x === "yes" ? "st_yes" : "st_no") : "—");
  return (
    <div className="mt-2" style={{ breakInside: "auto" }}>
      <Title>{w.kind ? t(`wc_kind_${w.kind}`) : t("wc_title")}</Title>
      <div>
        {t("wc_material")}: <b>{w.material ? t(`wc_mat_${w.material}`) : "—"}</b>
        {" "}· {t("wc_loose")}: <b>{yn(w.loose)}</b> · {t("wc_cracked")}: <b>{yn(w.cracked)}</b>
        {w.kind === "roof_edge" && <> · {t("wc_membrane")}: <b>{yn(w.membrane)}</b>{w.membrane === "yes" && <> · {t("wc_noPenetration")}: <b>{yn(w.noPenetration)}</b>{w.flashBy ? <> · {t("wc_flashBy")}: <b>{w.flashBy === "others" ? t("st_byOthers") : t(`wc_flash_${w.flashBy}`)}</b></> : null}</>}</>}
      </div>
      <div>
        {t("wc_dropSide")}: <b>{w.dropSide ? t(w.dropSide === "left" ? "wc_left" : "wc_right") : "—"}</b>
        {" "}· {t("wc_drop")}: <b>{m(fm, w.drop)}</b> · {t("wc_capAboveWalk")}: <b>{mi(fm, w.capAboveWalk)}</b> · {t("wc_railHeight")}: <b>{mi(fm, w.railHeight)}</b>
        {" "}· {t("wc_guard")}: <b>{fm(have)}</b>{req.required !== null ? <> ({t("wc_lbl_required")} {fm(req.required)})</> : req.drop !== null ? <> ({t("wc_noGuardReq")})</> : null}
      </div>
      <div>
        {t("wc_mount")}: <b>{w.mount ? t(`wc_mount_${w.mount}`) : "—"}</b>
        {w.mount === "core" && <> · {t("wc_coreDia")}: <b>{mi(fm, w.coreDia)}</b> · {t("wc_coreDepth")}: <b>{mi(fm, w.coreDepth)}</b></>}
        {w.mount === "plate" && <> · {t("wc_plateSize")}: <b>{v(w.plateSize)}</b></>}
        {(w.mount === "side_high" || w.mount === "side_low") && <> · {t("wc_faceDepth")}: <b>{mi(fm, w.faceDepth)}</b></>}
        {cut.length !== null && <> · {t("wc_postCut")}: <b>{fm(cut.length)}</b> ({cut.parts.map((p) => `${t(`wc_part_${p.key}`)} ${fm(p.value)}`).join(" + ")})</>}
        {" "}· {t("st_finish")}: <b>{w.finish ? t(`wc_fin_${w.finish}`) : "—"}</b>{w.color ? <> · {w.color}</> : null}
      </div>
      {w.datum && <div>{t("wc_datum")}: <b>{w.datum}</b></div>}

      {/* The elevation prints in the sketch above; the section at the tightest post goes here. */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 10, marginTop: 6, breakInside: "avoid", alignItems: "start" }}>
        <div style={{ border: "1px solid #cbd5e1" }}><CapSection w={w} post={tight?.p ?? null} mark={tight?.mark} lang={lang} /></div>
        <div style={{ fontSize: 11, color: "#334155" }}>
          <div style={{ fontWeight: 700 }}>{t("wc_section")} · {tight?.mark ?? "—"}</div>
          <div>{red.length ? `${t("st_toFix")}: ${red.join(", ")}` : ""}</div>
        </div>
      </div>

      <Title>{t("wc_postTable")}</Title>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead style={{ display: "table-header-group" }}>
          <tr>
            <th style={head}>{t("wc_runCol")}</th>
            <th style={head}>{t("wc_postCol")}</th>
            <th style={head}>{t("wc_at")}</th>
            <th style={head}>{t("wc_capWidth")}</th>
            <th style={head}>{t("wc_top")}</th>
            {w.mount === "core" && <th style={head}>▲ {t("wc_edgeHigh")}</th>}
            {w.mount === "core" && <th style={head}>▼ {t("wc_edgeLow")}</th>}
          </tr>
        </thead>
        <tbody>
          {posts.map(({ p, mark, run }) => {
            const edge = (s: string) => { const n = parseMeas(s); return <td style={{ ...cell, color: n !== null && n < WC_TOL.edgeMin ? LEVEL_COLOR.red : undefined, fontWeight: n !== null && n < WC_TOL.edgeMin ? 700 : undefined }}>{mi(fm, s)}</td>; };
            return (
              <tr key={p.id} style={{ breakInside: "avoid" }}>
                <td style={cell}>{runTag(run)}</td>
                <td style={{ ...cell, fontWeight: 700 }}>{mark}</td>
                <td style={cell}>{m(fm, p.at)}</td>
                <td style={cell}>{mi(fm, p.capWidth)}{p.material ? ` · ${t(`wc_mat_${p.material}`)}` : ""}</td>
                <td style={cell}>{v(p.top)}</td>
                {w.mount === "core" && edge(p.edgeHigh)}
                {w.mount === "core" && edge(p.edgeLow)}
              </tr>
            );
          })}
        </tbody>
      </table>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 6 }}>
        <thead>
          <tr>
            <th style={head}>{t("wc_runCol")}</th>
            <th style={head}>{t("wc_runLength")}</th>
            <th style={head}>{t("wc_turnTitle")}</th>
            <th style={head}>{t("wc_capFalls")}</th>
            <th style={head}>{t("wc_railStyle")}</th>
            <th style={head}>{t("wc_railLength")}</th>
          </tr>
        </thead>
        <tbody>
          {w.runs.map((r, i) => (
            <tr key={r.id} style={{ breakInside: "avoid" }}>
              <td style={{ ...cell, fontWeight: 700 }}>{runTag(i)}</td>
              <td style={cell}>{m(fm, r.length)}</td>
              <td style={cell}>{i === 0 ? "—" : `${v(r.turn)}° ${r.turnDir ? t(r.turnDir === "left" ? "wc_left" : "wc_right") : ""}`}</td>
              <td style={cell}>{fm(runRise(r, cornerTop(w, i))?.rise ?? null)}</td>
              <td style={cell}>{r.rail ? t(`wc_rail_${r.rail}`) : "—"}</td>
              <td style={cell}>{fm(runRailLength(r, cornerTop(w, i)))}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cell, fontWeight: 700 }} colSpan={5}>{`${sum.posts} ${t(sum.posts === 1 ? "wc_post" : "wc_posts")}`}</td>
            <td style={{ ...cell, fontWeight: 700 }}>{fm(sum.railLength)}</td>
          </tr>
        </tbody>
      </table>

      {checks.length > 0 && (
        <>
          <Title>{t("st_checksTitle")}</Title>
          {/* Issues in full; passed checks as one line so the sheet stays one page. */}
          {checks.some((c) => c.level === "green") && <div style={{ color: LEVEL_COLOR.green }}>✓ {checks.filter((c) => c.level === "green").length} {t("st_passed")}</div>}
          {checks.filter((c) => c.level !== "green").map((c, i) => (
            <div key={i} style={{ color: LEVEL_COLOR[c.level] }}>
              {c.level === "green" ? "✓" : c.level === "red" ? "✕" : "!"} {t(`check_${c.key}`)}{c.detail ? ` · ${c.detail}` : ""}
              {checkNumbers(lang, c, WC_CHECK_LABELS, fm) ? <span style={{ color: "#475569" }}> — {checkNumbers(lang, c, WC_CHECK_LABELS, fm)}</span> : null}
            </div>
          ))}
        </>
      )}
      {w.notes && <div style={{ marginTop: 4 }}>{t("st_notes")}: {w.notes}</div>}
    </div>
  );
}
