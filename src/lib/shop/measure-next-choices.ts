// Requirements that are a pick, not a number, answered on the Next card in one
// tap. Without this the card can only say "Open", which sends the measurer to
// another panel to find the question — the opposite of "just answer what is
// asked". Anything not listed here (photos, a post's mounting…) still opens
// its panel, and "Other" always does.

import { MATERIAL_PRESETS, type MeasureData } from "./measure";
import { mt } from "./measure-i18n";
import type { Gap } from "./measure-checks";

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

export function gapChoices(gap: Pick<Gap, "key" | "detail">, lang: string): GapChoices | null {
  // A requirement about one flight, joint or span is answered where that thing is.
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
