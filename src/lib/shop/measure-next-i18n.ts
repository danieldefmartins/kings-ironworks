// Labels the Next-measurement card shows for one number at a time, in plain
// trade words. The form fields sit under a heading ("Width" → Top / Middle /
// Bottom); alone on the card a number needs its whole name.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  // Opening — a hole in a wall, read across, down and corner to corner
  ["nx_wTop", "Top width", "Largura em cima", "Ancho arriba"],
  ["nx_wMid", "Middle width", "Largura no meio", "Ancho al medio"],
  ["nx_wBot", "Bottom width", "Largura embaixo", "Ancho abajo"],
  ["nx_hLeft", "Left height", "Altura à esquerda", "Alto a la izquierda"],
  ["nx_hCenter", "Center height", "Altura no centro", "Alto al centro"],
  ["nx_hRight", "Right height", "Altura à direita", "Alto a la derecha"],
  ["nx_diagA", "Diagonal A ↘", "Diagonal A ↘", "Diagonal A ↘"],
  ["nx_diagB", "Diagonal B ↙", "Diagonal B ↙", "Diagonal B ↙"],
  ["nx_reveal", "Reveal depth", "Profundidade do vão", "Fondo del vano"],
  ["nx_julietSill", "Sill height inside", "Altura do peitoril por dentro", "Altura del alféizar por dentro"],
  ["nx_julietProjection", "Projection off the wall", "Projeção da parede", "Vuelo desde la pared"],
  ["nx_threshold", "Threshold height", "Altura da soleira", "Altura del umbral"],
  ["nx_opening", "Opening", "Vão", "Vano"],
  // Structural steel — member by member
  ["nx_spanA", "Clear span at the top", "Vão livre em cima", "Luz libre arriba"],
  ["nx_spanB", "Clear span at the bottom", "Vão livre embaixo", "Luz libre abajo"],
  ["nx_lengthA", "Length", "Comprimento", "Largo"],
  ["nx_lengthB", "Length, second reading", "Comprimento, segunda leitura", "Largo, segunda lectura"],
  ["nx_bearingL", "Left bearing", "Apoio esquerdo", "Apoyo izquierdo"],
  ["nx_bearingR", "Right bearing", "Apoio direito", "Apoyo derecho"],
  ["nx_wallL", "Left wall thickness", "Espessura da parede esquerda", "Espesor del muro izquierdo"],
  ["nx_wallR", "Right wall thickness", "Espessura da parede direita", "Espesor del muro derecho"],
  ["nx_colHeight", "Height, slab to beam", "Altura, piso até a viga", "Altura, losa a viga"],
  ["nx_coverHeight", "Height to cover", "Altura a cobrir", "Altura a cubrir"],
  ["nx_reading", "Reading {n}", "Leitura {n}", "Lectura {n}"],
  ["nx_frameOpening", "Opening width", "Largura da abertura", "Ancho de la abertura"],
  ["nx_frameCc", "Column center to center", "Eixo a eixo das colunas", "Eje a eje de columnas"],
  ["nx_frame", "Frame", "Pórtico", "Pórtico"],
  ["nx_maxLength", "Longest piece that fits in", "Maior peça que entra", "Pieza más larga que entra"],
  // Card
  ["nx_next", "Next", "Próxima", "Siguiente"],
  ["nx_skip", "Skip", "Pular", "Saltar"],
  ["nx_prev", "Previous", "Anterior", "Anterior"],
  ["nx_open", "Open", "Abrir", "Abrir"],
  ["nx_show", "Show on drawing", "Mostrar no desenho", "Mostrar en el dibujo"],
  ["nx_card", "Next measurement", "Próxima medida", "Siguiente medida"],
  ["nx_of", "{a} of {b}", "{a} de {b}", "{a} de {b}"],
  ["nx_recorded", "Measurements recorded", "Medidas registradas", "Medidas registradas"],
  ["nx_allIn", "All measurements in", "Todas as medidas feitas", "Todas las medidas tomadas"],
  ["nx_allInSub", "{n} numbers recorded", "{n} medidas registradas", "{n} medidas registradas"],
  ["nx_detailsLeft", "{n} details left", "Faltam {n} detalhes", "Faltan {n} detalles"],
  ["nx_detailLeft", "1 detail left", "Falta 1 detalhe", "Falta 1 detalle"],
  ["nx_continue", "Continue", "Continuar", "Continuar"],
  ["nx_review", "Review", "Revisar", "Revisar"],
  ["nx_everything", "Everything measured", "Tudo medido", "Todo medido"],
  ["nx_notNumber", "Not a measurement", "Não é uma medida", "No es una medida"],
];

const STR: Record<"en" | "pt" | "es", Record<string, string>> = { en: {}, pt: {}, es: {} };
for (const [k, en, pt, es] of ROWS) {
  STR.en[k] = en;
  STR.pt[k] = pt;
  STR.es[k] = es;
}

/** The card's own words; null when the key is not one of them. */
export function nxText(lang: string | null | undefined, key: string, vars: Record<string, string | number> = {}): string | null {
  const l = lang === "pt" || lang === "es" ? lang : "en";
  const raw = STR[l][key] ?? STR.en[key];
  if (raw === undefined) return null;
  return raw.replace(/\{(\w+)\}/g, (_, v: string) => String(vars[v] ?? ""));
}

export const NEXT_STR = STR;
