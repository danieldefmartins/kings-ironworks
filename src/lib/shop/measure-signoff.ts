// Customer sign-off on field dimensions — dispute protection.
//
// At the end of a measure the customer looks at the key dimensions and design
// choices in their own language and signs on the device. What makes the
// signature worth anything later is knowing EXACTLY what it covered, so the
// sign-off records a fingerprint of the measurement data at the moment of
// signing (same idea as the checkedSignature pattern elsewhere in the measure
// libs: snapshot what was checked, compare later). Any later edit to a
// dimension changes the fingerprint and the sign-off reads "out of date —
// re-sign". It is never silently valid.
//
// The signature image is a small PNG data URL kept inside the sheet data
// rather than uploaded through the job photo gallery: it must work offline
// (the sheet syncs when the crew is back online), it must not show up as a
// "photo" of the job, and it travels with every approved revision snapshot.
// The API caps its size (see SIGNATURE_MAX_CHARS).

import { formatIn, parseMeas } from "./measure-parse";
import type { MeasureData, MeasureShape } from "./measure";

export type SignoffLang = "en" | "pt" | "es";
export const SIGNOFF_LANGS: SignoffLang[] = ["en", "pt", "es"];

/** ~60 KB of base64 — a downscaled 2-colour signature is 5–20 KB. */
export const SIGNATURE_MAX_CHARS = 80000;

export interface SignoffLine {
  label: string;
  value: string;
}

export interface CustomerSignoff {
  name: string;
  email: string;
  lang: SignoffLang;
  signedAt: string; // ISO timestamp
  signature: string; // data:image/png;base64,...
  hash: string; // measurementHash(data) at signing
  /** Exactly what the customer was shown, in the language they read it in. */
  summary: SignoffLine[];
}

// Keys that are NOT measurements or design choices: editing them must never
// invalidate a customer's signature. Photos/annotations are evidence, the code
// profile is the shop's own check, steel/scene data is internal shop work.
const EXCLUDED = new Set([
  "signoff",
  "code",
  "photos",
  "annotations",
  "units",
  "sceneSetup",
  "steelPlan",
  "nativeSteel",
  "drawingReleaseVersion",
]);

// Stable, normalisation-proof serialisation: keys sorted, and empty values
// ("" / null / undefined / false / [] / {}) dropped, so a sheet re-normalised
// on load (blank defaults filled in, legacy ids assigned) fingerprints the same.
function canon(v: unknown): unknown {
  if (v === null || v === undefined || v === "" || v === false) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? undefined : t;
  }
  if (Array.isArray(v)) {
    const a = v.map((x) => canon(x) ?? null);
    return a.every((x) => x === null) ? undefined : a;
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) {
      // Identities are not measurements, and legacy sheets gain them on load.
      if (k === "id") continue;
      const c = canon(o[k]);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

// FNV-1a, two independent 32-bit lanes → 16 hex chars. Not cryptographic; it
// only has to notice that a dimension changed.
function fnv(str: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function measurementHash(data: MeasureData): string {
  const src: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) if (!EXCLUDED.has(k)) src[k] = v;
  const s = JSON.stringify(canon(src) ?? {});
  return `${fnv(s, 0x811c9dc5)}${fnv(s, 0x01000193 ^ 0x5bd1e995)}`;
}

export type SignoffState = "none" | "valid" | "stale";

export function signoffState(data: MeasureData): SignoffState {
  const so = data.signoff;
  if (!so || !so.signature || !so.hash) return "none";
  return so.hash === measurementHash(data) ? "valid" : "stale";
}

export function makeSignoff(
  data: MeasureData,
  input: { name: string; email: string; lang: SignoffLang; signature: string; summary: SignoffLine[] },
  now: Date = new Date()
): CustomerSignoff {
  return {
    name: input.name.trim().slice(0, 120),
    email: input.email.trim().slice(0, 200),
    lang: input.lang,
    signedAt: now.toISOString(),
    signature: input.signature,
    hash: measurementHash(data),
    summary: input.summary.slice(0, 40).map((l) => ({ label: l.label.slice(0, 120), value: l.value.slice(0, 300) })),
  };
}

// ---- What the customer is shown -------------------------------------------------

const S: Record<SignoffLang, Record<string, string>> = {
  en: {
    item: "Item", railType: "Rail type", railHeight: "Rail height", side: "Side", finish: "Finish", color: "Color",
    post: "Posts", topRail: "Top rail", picket: "Pickets", picketSpacing: "Picket spacing", stairs: "Stairs",
    risers: "risers", flights: "flights", width: "Width", floorToFloor: "Total rise", totalRun: "Total run",
    rake: "Rail length (along stair)", posts: "Posts on site", landings: "Landings", notes: "Notes",
    gateOpening: "Gate opening", gateHeight: "Gate height", gateUse: "Use", fenceRun: "Fence length",
    fenceHeight: "Fence height", deckPerimeter: "Railed perimeter", guardHeight: "Guard height",
    edgeLength: "Railed edge", wellSize: "Well size", wellDepth: "Well depth", includes: "Includes",
    spiralDiameter: "Diameter", spiralTreads: "Treads", levels: "Levels",
    Guardrail: "Guardrail", Handrail: "Handrail", Both: "Guardrail + handrail", Left: "Left", Right: "Right",
    grate: "grate", guard: "guard", gate: "gate", ladder: "ladder", pool: "Pool", driveway: "Driveway", walk: "Walk", service: "Service",
  },
  pt: {
    item: "Item", railType: "Tipo de corrimão", railHeight: "Altura do corrimão", side: "Lado", finish: "Acabamento", color: "Cor",
    post: "Postes", topRail: "Corrimão superior", picket: "Balaústres", picketSpacing: "Espaço entre balaústres", stairs: "Escada",
    risers: "degraus", flights: "lances", width: "Largura", floorToFloor: "Altura total", totalRun: "Comprimento total",
    rake: "Comprimento do corrimão (na escada)", posts: "Postes no local", landings: "Patamares", notes: "Observações",
    gateOpening: "Vão do portão", gateHeight: "Altura do portão", gateUse: "Uso", fenceRun: "Comprimento da cerca",
    fenceHeight: "Altura da cerca", deckPerimeter: "Perímetro com guarda-corpo", guardHeight: "Altura do guarda-corpo",
    edgeLength: "Borda com guarda-corpo", wellSize: "Tamanho do poço", wellDepth: "Profundidade do poço", includes: "Inclui",
    spiralDiameter: "Diâmetro", spiralTreads: "Degraus", levels: "Níveis",
    Guardrail: "Guarda-corpo", Handrail: "Corrimão", Both: "Guarda-corpo + corrimão", Left: "Esquerda", Right: "Direita",
    grate: "grade", guard: "guarda-corpo", gate: "portão", ladder: "escada de acesso", pool: "Piscina", driveway: "Garagem", walk: "Pedestres", service: "Serviço",
  },
  es: {
    item: "Artículo", railType: "Tipo de baranda", railHeight: "Altura de la baranda", side: "Lado", finish: "Acabado", color: "Color",
    post: "Postes", topRail: "Pasamanos superior", picket: "Barrotes", picketSpacing: "Espacio entre barrotes", stairs: "Escalera",
    risers: "escalones", flights: "tramos", width: "Ancho", floorToFloor: "Altura total", totalRun: "Largo total",
    rake: "Largo de la baranda (en la escalera)", posts: "Postes en sitio", landings: "Descansos", notes: "Notas",
    gateOpening: "Abertura del portón", gateHeight: "Altura del portón", gateUse: "Uso", fenceRun: "Largo de la cerca",
    fenceHeight: "Altura de la cerca", deckPerimeter: "Perímetro con baranda", guardHeight: "Altura de la baranda",
    edgeLength: "Borde con baranda", wellSize: "Tamaño del pozo", wellDepth: "Profundidad del pozo", includes: "Incluye",
    spiralDiameter: "Diámetro", spiralTreads: "Escalones", levels: "Niveles",
    Guardrail: "Baranda de protección", Handrail: "Pasamanos", Both: "Baranda + pasamanos", Left: "Izquierda", Right: "Derecha",
    grate: "rejilla", guard: "baranda", gate: "portón", ladder: "escalera de acceso", pool: "Piscina", driveway: "Entrada de autos", walk: "Peatonal", service: "Servicio",
  },
};

export function signoffText(lang: SignoffLang, key: string): string {
  return S[lang][key] || S.en[key] || key;
}

/** A dimension as the customer reads it: 36" or 12' 4-1/2". */
function dim(v: string | undefined | null): string {
  const t = (v || "").trim();
  if (!t) return "";
  const n = parseMeas(t);
  if (n === null) return t;
  if (n >= 60) {
    const ft = Math.floor(n / 12);
    const rest = n - ft * 12;
    return rest < 1 / 32 ? `${ft}'` : `${ft}' ${formatIn(rest)}`;
  }
  return formatIn(n);
}

/** Key dimensions and design choices, only those actually recorded. */
export function signoffSummary(
  data: MeasureData,
  shape: MeasureShape,
  lang: SignoffLang,
  extra?: { shapeName?: string; finishLabel?: (v: string) => string }
): SignoffLine[] {
  const t = (k: string) => signoffText(lang, k);
  const lines: SignoffLine[] = [];
  const add = (label: string, value: string | undefined | null) => {
    const v = (value || "").trim();
    if (v) lines.push({ label, value: v });
  };
  add(t("item"), extra?.shapeName);

  const flights = data.segments.filter((s) => s.kind === "flight");
  if (flights.length) {
    const risers = flights.reduce((a, f) => a + (f.kind === "flight" ? f.steps.length : 0), 0);
    add(t("stairs"), `${risers} ${t("risers")}${flights.length > 1 ? ` · ${flights.length} ${t("flights")}` : ""}`);
    const w = flights[0].kind === "flight" ? dim(flights[0].width) : "";
    add(t("width"), w);
  }
  const landings = data.segments.filter((s) => s.kind === "platform").length;
  if (landings && flights.length) add(t("landings"), String(landings));
  add(t("floorToFloor"), dim(data.overall.floorToFloor) || dim(data.overall.totalRise));
  add(t("totalRun"), dim(data.overall.totalRun));
  add(t("rake"), dim(data.overall.rakeLength));

  if (data.gate) {
    const g = data.gate;
    add(t("gateUse"), g.use ? t(g.use) : "");
    add(t("gateOpening"), dim(g.widthTop) || dim(g.widthBottom));
    add(t("gateHeight"), dim(g.heightHinge) || dim(g.heightLatch));
  }
  if (data.fence) {
    add(t("fenceRun"), dim(data.fence.totalRun));
    add(t("fenceHeight"), dim(data.fence.height));
  }
  if (data.deck) {
    add(t("deckPerimeter"), dim(data.deck.totalPerimeter));
    add(t("guardHeight"), dim(data.deck.guardHeight));
  }
  if (data.balcony) {
    add(t("edgeLength"), dim(data.balcony.edgeLength));
    add(t("guardHeight"), dim(data.balcony.guardHeight));
  }
  if (data.well) {
    const w = data.well;
    const a = dim(w.lengthAtHouse);
    const b = dim(w.projection);
    add(t("wellSize"), a && b ? `${a} × ${b}` : a || b);
    add(t("wellDepth"), dim(w.depth));
    add(t("includes"), w.deliverables.map((d) => t(d)).join(", "));
  }
  if (data.spiral) {
    add(t("spiralDiameter"), dim(data.spiral.diameter));
    add(t("spiralTreads"), data.spiral.treads);
    add(t("floorToFloor"), dim(data.spiral.floorToFloor));
  }
  if (data.fire) add(t("levels"), String(data.fire.levels.length));

  const isRailShape = !data.gate && !data.fence && !data.well && !data.fire;
  if (isRailShape && shape !== "deck" && shape !== "balcony") {
    add(t("railType"), data.rail.kind ? t(data.rail.kind) : "");
    add(t("railHeight"), dim(data.rail.height));
    add(t("side"), data.rail.side ? t(data.rail.side) : "");
  }
  const railPosts = data.posts.filter((p) => p.pointType === "railing_post").length;
  if (railPosts) add(t("posts"), String(railPosts));
  const fl = extra?.finishLabel || ((v: string) => v);
  add(t("post"), data.materials.post ? fl(data.materials.post) : "");
  add(t("topRail"), data.materials.topRail ? fl(data.materials.topRail) : "");
  add(t("picket"), data.materials.picket ? fl(data.materials.picket) : "");
  add(t("picketSpacing"), dim(data.materials.picketSpacing));
  add(t("finish"), data.materials.finish ? fl(data.materials.finish) : "");
  add(t("color"), data.materials.color ? fl(data.materials.color) : "");
  add(t("notes"), data.overall.notes);
  return lines;
}
