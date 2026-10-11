"use client";

// Print blocks for the code check and the customer sign-off. Kept apart from
// PrintSheet so the sheet only gains two lines.

import type { MeasureData, MeasureShape } from "@/lib/shop/measure";
import { codeCheck } from "@/lib/shop/measure-code";
import { codeActualText, codeLimitText, codeRuleLabel, ct } from "@/lib/shop/measure-code-i18n";
import { signoffState } from "@/lib/shop/measure-signoff";

// Org accent (white-label), set on the print root; KIW gold otherwise.
const GOLD = "var(--brand-accent, #b8860b)";
const cell: React.CSSProperties = { border: "1px solid #ccc", padding: "2px 5px" };
const head: React.CSSProperties = { ...cell, background: "#f4f0e6", textAlign: "left", fontWeight: 600 };
const LEVEL = { red: ["✗", "#b32c35"], yellow: ["?", "#8a5100"], green: ["✓", "#217338"] } as const;

function Title({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 11, letterSpacing: 0.5, borderBottom: `2px solid ${GOLD}`, marginBottom: 4, paddingBottom: 2 }}>
      {children}
    </div>
  );
}

export function CodeCheckPrint({ data, shape, lang, orgDefault }: { data: MeasureData; shape: MeasureShape; lang: string; orgDefault?: string | null }) {
  const rep = codeCheck(data, shape, orgDefault);
  if (!rep.results.length) return null;
  const rows = [...rep.results].sort((a, b) => ["red", "yellow", "green"].indexOf(a.level) - ["red", "yellow", "green"].indexOf(b.level));
  return (
    <div className="mt-3" style={{ breakInside: "avoid" }}>
      <Title>
        {ct(lang, "codeTitle")} · {ct(lang, `prof_${rep.settings.profile}`)} · {ct(lang, `occ_${rep.occupancy}`)}
      </Title>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            <th style={head}></th>
            <th style={head}>&nbsp;</th>
            <th style={head}>{ct(lang, "measured")}</th>
            <th style={head}>{ct(lang, "limit")}</th>
            <th style={head}>{ct(lang, "cite")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={{ ...cell, color: LEVEL[r.level][1], fontWeight: 800, textAlign: "center", width: 16 }}>{LEVEL[r.level][0]}</td>
              <td style={cell}>
                {codeRuleLabel(lang, r)}
                {r.level !== "green" && r.note ? <span style={{ color: "#666" }}> — {ct(lang, `code_note_${r.note}`)}</span> : null}
              </td>
              <td style={{ ...cell, fontWeight: 700, whiteSpace: "nowrap" }}>{codeActualText(lang, r)}</td>
              <td style={{ ...cell, whiteSpace: "nowrap" }}>{codeLimitText(r)}</td>
              <td style={{ ...cell, whiteSpace: "nowrap", fontFamily: "monospace" }}>{r.cite}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SignoffPrint({ data, lang }: { data: MeasureData; lang: string }) {
  const so = data.signoff;
  const state = signoffState(data);
  const cl = so?.lang || lang;
  return (
    <div className="mt-3" style={{ breakInside: "avoid" }}>
      <Title>{ct(lang, "signPrintTitle")}</Title>
      {so && state !== "none" ? (
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            {so.summary.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <tbody>
                  {so.summary.map((l, i) => (
                    <tr key={i}>
                      <td style={{ ...cell, color: "#555" }}>{l.label}</td>
                      <td style={{ ...cell, fontWeight: 700 }}>{l.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ marginTop: 4, fontSize: 10, color: "#444" }}>{ct(cl, "signConfirm")}</div>
          </div>
          <div style={{ width: 230, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={so.signature} alt="" style={{ width: 230, height: "auto", opacity: state === "stale" ? 0.35 : 1 }} />
            <div style={{ borderTop: "1px solid #333", paddingTop: 2, fontSize: 10 }}>
              <b>{so.name}</b>
              <div style={{ color: "#555" }}>
                {new Date(so.signedAt).toLocaleString()}
                {so.email ? ` · ${so.email}` : ""}
              </div>
            </div>
            {state === "stale" && (
              <div style={{ marginTop: 4, fontSize: 9, fontWeight: 800, color: "#b32c35", border: "2px solid #b32c35", padding: "2px 4px" }}>
                {ct(lang, "signPrintStale")}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Unsigned: a line to sign by hand, like the rest of the paper sheet.
        <div style={{ display: "flex", gap: 24, marginTop: 18, fontSize: 10, color: "#555" }}>
          <div style={{ flex: 2, borderTop: "1px solid #333", paddingTop: 2 }}>× {ct(cl, "signHere")}</div>
          <div style={{ flex: 1.4, borderTop: "1px solid #333", paddingTop: 2 }}>{ct(cl, "signName")}</div>
          <div style={{ flex: 1, borderTop: "1px solid #333", paddingTop: 2 }}>{ct(cl, "signDate")}</div>
        </div>
      )}
    </div>
  );
}
