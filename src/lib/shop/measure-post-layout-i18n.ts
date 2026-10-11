// Calculated post layout strings (EN / PT-BR / ES). Merged into the measure
// dictionary by measure-i18n, so mt(lang, key) finds them.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  ["pl_calc", "Calculated", "Calculado", "Calculado"],
  ["pl_height", "Height to rail", "Altura até o corrimão", "Altura al pasamanos"],
  ["pl_base", "Stands at", "Apoio na cota", "Apoyo en cota"],
  ["pl_run", "Run", "Horizontal", "Horizontal"],
  ["pl_rail", "Rail", "Corrimão", "Pasamanos"],
  ["pl_angle", "Angle", "Ângulo", "Ángulo"],
  ["pl_clear", "Clear", "Vão livre", "Luz libre"],
  ["pl_pickets", "Pickets", "Balaústres", "Balaustres"],
  ["pl_gap", "Gap", "Abertura", "Abertura"],
  ["pl_oc", "o.c.", "c/c", "e/e"],
  ["pl_level", "Level", "Nível", "Nivel"],
  ["pl_viaLanding", "via landing", "pelo patamar", "por el descanso"],
  ["pl_lastPost", "Last post on this side", "Último poste deste lado", "Último poste de este lado"],
  ["pl_fromFirst", "From first step", "Do primeiro degrau", "Desde el primer peldaño"],
  ["pl_measured", "Measured", "Medido", "Medido"],
  ["pl_check", "check", "conferir", "verificar"],
  ["pl_centered", "Centered", "Centralizado", "Centrado"],
  ["pl_centeredOnTread", "Centered on tread", "Centralizado no degrau", "Centrado en el peldaño"],
  ["pl_spans", "Spans — calculated", "Vãos — calculados", "Tramos — calculados"],
  ["pl_span", "Span", "Vão", "Tramo"],
  ["pl_side_left", "Left", "Esquerda", "Izquierda"],
  ["pl_side_right", "Right", "Direita", "Derecha"],
  ["pl_assumedPost", "post size assumed 1-1/2\"", "poste assumido 1-1/2\"", "poste supuesto 1-1/2\""],
  ["check_post_first_distance", "First step → post, measured vs calculated", "Primeiro degrau → poste, medido x calculado", "Primer peldaño → poste, medido vs calculado"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

export const POST_LAYOUT_STR = { en: build(1), pt: build(2), es: build(3) };
