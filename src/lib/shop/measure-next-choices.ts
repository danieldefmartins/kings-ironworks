// Requirements that are a pick, not a number, answered on the Next card in one
// tap. Without this the card can only say "Open", which sends the measurer to
// another panel to find the question — the opposite of "just answer what is
// asked". Anything not listed here (photos, a post's mounting…) still opens
// its panel, and "Other" always does.

import { MATERIAL_PRESETS, type MeasureData, type Termination } from "./measure";
import { mt } from "./measure-i18n";
import { orderedPosts, type Gap } from "./measure-checks";
import { applyShopHardware, linkColumn, siteColumns } from "./measure-shop-defaults";
import { blankSubstrate, getSub, guessMaterial, setSub } from "./measure-substrate";

export interface GapChoice { value: string; label: string }
export interface GapChoices {
  /** What is being asked, as a question rather than as "… missing". */
  question: string;
  options: GapChoice[];
  put: (d: MeasureData, value: string) => void;
}

const Q: Record<string, Record<string, string>> = {
  orientation: { en: "Looking up the stairs, where is the wall?", pt: "Olhando escada acima, onde fica a parede?", es: "Mirando hacia arriba, ¿dónde está la pared?" },
  mat_post: { en: "Post material", pt: "Material do poste", es: "Material del poste" },
  mat_toprail: { en: "Top rail material", pt: "Material do corrimão superior", es: "Material del pasamanos superior" },
  returns: { en: "How does the rail end?", pt: "Como o corrimão termina?", es: "¿Cómo termina el pasamanos?" },
  mat_picket: { en: "Picket / infill material", pt: "Material do balaústre / preenchimento", es: "Material del barrote / relleno" },
  max_piece: { en: "Largest piece that fits through the access", pt: "Maior peça que passa pelo acesso", es: "Pieza más grande que pasa por el acceso" },
};
const FITS: Record<string, string> = { en: "No limit — it fits", pt: "Sem limite — passa", es: "Sin límite — pasa" };
// Stored in English, like the material presets: the shop reads one vocabulary.
const RETURNS: [string, Record<string, string>][] = [
  ["Return into the wall", { en: "Return into the wall", pt: "Retorno na parede", es: "Retorno al muro" }],
  ["Loop end", { en: "Loop end", pt: "Ponta em laço", es: "Extremo en lazo" }],
  ["Open end", { en: "Open end", pt: "Ponta aberta", es: "Extremo abierto" }],
];
const q = (key: string, lang: string) => Q[key]?.[lang] ?? Q[key]?.en ?? "";

// ---- One rail end: "what does this end attach to?" ---------------------------
type L3 = Record<string, string>;
const tr = (l: L3, lang: string) => l[lang] ?? l.en;
const END_WORD: Record<"stair" | "level", Record<"start" | "end", L3>> = {
  stair: { start: { en: "Bottom end", pt: "Ponta de baixo", es: "Extremo de abajo" }, end: { en: "Top end", pt: "Ponta de cima", es: "Extremo de arriba" } },
  level: { start: { en: "Start end", pt: "Ponta inicial", es: "Extremo inicial" }, end: { en: "Far end", pt: "Ponta final", es: "Extremo final" } },
};
const RAIL: L3 = { en: "Rail", pt: "Corrimão", es: "Baranda" };
const ATTACHES: L3 = { en: "attaches to", pt: "fixa em", es: "se fija a" };
const MADE_OF: Record<string, L3> = {
  wall: { en: "what is the wall made of?", pt: "de que é a parede?", es: "¿de qué es la pared?" },
  existing_post: { en: "what is the column made of?", pt: "de que é a coluna?", es: "¿de qué es la columna?" },
  floor: { en: "what is the floor made of?", pt: "de que é o piso?", es: "¿de qué es el piso?" },
};
/** The one-tap answers for a rail end. Stored exactly as the full form stores them. */
export const END_TARGETS: { value: string; label: L3 }[] = [
  { value: "wall_clip", label: { en: "Wall clip", pt: "Clipe na parede", es: "Clip a la pared" } },
  { value: "wall_plate", label: { en: "Wall plate", pt: "Chapa na parede", es: "Placa a la pared" } },
  { value: "post", label: { en: "Post", pt: "Poste", es: "Poste" } },
  { value: "column", label: { en: "Existing column", pt: "Coluna existente", es: "Columna existente" } },
  { value: "open", label: { en: "Open", pt: "Aberta", es: "Abierto" } },
];
const MATERIALS: [string, L3][] = [
  ["Wood", { en: "Wood", pt: "Madeira", es: "Madera" }],
  ["Brick", { en: "Brick", pt: "Tijolo", es: "Ladrillo" }],
  ["Concrete", { en: "Concrete", pt: "Concreto", es: "Concreto" }],
  ["Steel", { en: "Steel", pt: "Aço", es: "Acero" }],
];
function railEnd(detail: string | undefined, data?: MeasureData): { index: number; end: "start" | "end"; get: (d: MeasureData) => Termination | undefined; name: (lang: string) => string } | null {
  const m = /^#(\d+) (start|end)$/.exec(detail || "");
  if (!m) return null;
  const index = Number(m[1]) - 1, end = m[2] as "start" | "end";
  const stair = !data || data.segments.some((s) => s.kind === "flight" || s.kind === "ramp");
  const many = index > 0 || (data?.spans.length ?? 1) > 1;
  return { index, end, get: (d) => d.spans[index]?.[end], name: (lang) => `${many ? `${tr(RAIL, lang)} ${index + 1} · ` : ""}${tr(END_WORD[stair ? "stair" : "level"][end], lang)}` };
}
/** Record a one-tap rail-end answer: a complete connection, with the shop's usual part where one is needed. */
export function setRailEndTarget(d: MeasureData, index: number, end: "start" | "end", value: string): void {
  const t = d.spans[index]?.[end];
  if (!t) return;
  delete t.columnId;
  t.postId = ""; t.spanRef = "";
  if (value === "wall_clip" || value === "wall_plate") {
    t.attachTo = "wall"; t.method = value === "wall_clip" ? "clip" : "wall_plate";
    applyShopHardware(t);
  } else if (value === "post") {
    t.attachTo = "free_post"; t.method = "";
    // The bottom end stands on the first railing post, the top end on the last one.
    const posts = orderedPosts(d).filter((p) => p.pointType === "railing_post");
    t.postId = (end === "start" ? posts[0] : posts[posts.length - 1])?.id ?? "";
  } else if (value === "column") {
    t.attachTo = "existing_post"; t.method = "clip";
    applyShopHardware(t);
    const columns = siteColumns(d);
    if (columns.length === 1) linkColumn(t, columns[0]);
  } else if (value === "open") {
    t.attachTo = "open"; t.method = "";
  }
}

export function gapChoices(gap: Pick<Gap, "key" | "detail">, lang: string, data?: MeasureData): GapChoices | null {
  // Each end of a rail piece is its own question, asked by name.
  const at = gap.key === "term_target" || gap.key === "term_material" ? railEnd(gap.detail, data) : null;
  if (at && gap.key === "term_target") {
    return {
      question: `${at.name(lang)} ${tr(ATTACHES, lang)}`,
      options: END_TARGETS.map((o) => ({ value: o.value, label: tr(o.label, lang) })),
      put: (d, v) => setRailEndTarget(d, at.index, at.end, v),
    };
  }
  if (at && gap.key === "term_material") {
    const target = (data && at.get(data)?.attachTo) || "wall";
    return {
      question: `${at.name(lang)}: ${tr(MADE_OF[target] ?? MADE_OF.wall, lang)}`,
      options: MATERIALS.map(([value, label]) => ({ value, label: tr(label, lang) })),
      put: (d, v) => {
        const t = at.get(d), sp = d.spans[at.index];
        if (!t || !sp) return;
        const key = `term:${sp.id}:${at.end}`, material = guessMaterial(v);
        if (material) setSub(d, key, { ...(getSub(d, key) ?? blankSubstrate()), material });
        if (!t.material.trim()) t.material = v;
      },
    };
  }
  // Any other requirement about one flight, joint or span is answered where that thing is.
  if (gap.detail) return null;
  switch (gap.key) {
    case "orientation":
      return {
        question: q("orientation", lang),
        options: (["left_wall", "right_wall", "both_open", "both_wall"] as const).map((value) => ({ value, label: mt(lang, `orient_${value}`) })),
        put: (d, v) => { d.datums.orientation = v as MeasureData["datums"]["orientation"]; },
      };
    case "floor_change":
      return {
        question: mt(lang, "floorChangeQuestion"),
        options: ([["none", "floorChangeNone"], ["bottom", "floorChangeBottom"], ["top", "floorChangeTop"], ["both", "floorChangeBoth"]] as const).map(([value, key]) => ({ value, label: mt(lang, key) })),
        put: (d, v) => { d.finish.floorChange = v as MeasureData["finish"]["floorChange"]; },
      };
    case "mat_post":
      return { question: q("mat_post", lang), options: MATERIAL_PRESETS.post.map((value) => ({ value, label: value })), put: (d, v) => { d.materials.post = v; } };
    case "mat_toprail":
      return { question: q("mat_toprail", lang), options: MATERIAL_PRESETS.topRail.map((value) => ({ value, label: value })), put: (d, v) => { d.materials.topRail = v; } };
    case "returns":
      return { question: q("returns", lang), options: RETURNS.map(([value, label]) => ({ value, label: label[lang] ?? label.en })), put: (d, v) => { d.rail.returns = v; } };
    case "mat_picket":
      return { question: q("mat_picket", lang), options: MATERIAL_PRESETS.picket.map((value) => ({ value, label: value })), put: (d, v) => { d.materials.picket = v; } };
    case "max_piece":
      return { question: q("max_piece", lang), options: [{ value: "fits", label: FITS[lang] ?? FITS.en }], put: (d, v) => { d.fab.maxPiece = v; } };
    default:
      return null;
  }
}
