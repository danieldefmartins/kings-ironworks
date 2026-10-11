// Strings for the post plan of railed runs (deck, fence, wall cap, balcony,
// ramp, drawn runs). EN / PT-BR / ES. The shared card words are in
// measure-post-suggest-i18n.ts.
import type { RunLabel, RunNote } from "./measure-post-suggest-runs";

type Row = [en: string, pt: string, es: string];
const pick = (lang: string, r: Row) => (lang === "pt" ? r[1] : lang === "es" ? r[2] : r[0]);

const WORDS: Record<string, Row> = {
  side: ["Side {n}", "Lado {n}", "Lado {n}"],
  segment: ["Segment {n}", "Segmento {n}", "Segmento {n}"],
  run: ["Run {n}", "Trecho {n}", "Tramo {n}"],
  drawn: ["Run {n}", "Trecho {n}", "Tramo {n}"],
  front: ["Front", "Frente", "Frente"],
  juliet: ["Across the opening", "Na abertura", "En la abertura"],
  returnLeft: ["Left return", "Retorno esquerdo", "Retorno izquierdo"],
  returnRight: ["Right return", "Retorno direito", "Retorno derecho"],
  leftSide: ["Left side", "Lado esquerdo", "Lado izquierdo"],
  rightSide: ["Right side", "Lado direito", "Lado derecho"],
  gradePerBay: ["grade {v} per bay", "desnível de {v} por vão", "desnivel de {v} por vano"],
  layoutCompact: ["Post layout", "Distribuição dos postes", "Distribución de postes"],
  returnsLinked: ["Same count both returns", "Mesma quantidade nos dois retornos", "Misma cantidad en ambos retornos"],
};

export function rw(lang: string, key: string, vars: Record<string, string | number> = {}): string {
  const r = WORDS[key];
  let s = r ? pick(lang, r) : key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function runLabelText(lang: string, l: RunLabel | undefined, fallback: string): string {
  if (!l) return fallback;
  return rw(lang, l.key, { n: l.n ?? "" }).trim();
}

export function runNoteText(lang: string, n: RunNote | undefined, fmt: (v: number) => string): string {
  return n ? rw(lang, n.key, { v: fmt(n.value) }) : "";
}
