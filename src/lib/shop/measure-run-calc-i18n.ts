// Next-card words for the railed-run work types: labels of the numbers they
// add to the walk, and the "Same for all" copy for sides, segments and posts.
// Rows are [key, EN, PT-BR, ES].
const ROWS: [string, string, string, string][] = [
  ["deckSideTurn", "Corner angle", "Ângulo do canto", "Ángulo de la esquina"],
  ["nx_planLine", "Line length", "Comprimento da linha", "Largo de la línea"],
  ["nx_copyAll_sides", "Same for all sides", "Igual para todos os lados", "Igual en todos los lados"],
  ["nx_copied_sides", "Copied to {n} sides", "Copiado para {n} lados", "Copiado a {n} lados"],
  ["nx_copied1_sides", "Copied to 1 side", "Copiado para 1 lado", "Copiado a 1 lado"],
  ["nx_copyAll_segments", "Same for all segments", "Igual para todos os segmentos", "Igual en todos los segmentos"],
  ["nx_copied_segments", "Copied to {n} segments", "Copiado para {n} segmentos", "Copiado a {n} segmentos"],
  ["nx_copied1_segments", "Copied to 1 segment", "Copiado para 1 segmento", "Copiado a 1 segmento"],
  ["nx_copyAll_posts", "Same for all posts", "Igual para todos os postes", "Igual en todos los postes"],
  ["nx_copied_posts", "Copied to {n} posts", "Copiado para {n} postes", "Copiado a {n} postes"],
  ["nx_copied1_posts", "Copied to 1 post", "Copiado para 1 poste", "Copiado a 1 poste"],
  ["nx_ramp_ok", "1:{r} · within 1:12", "1:{r} · dentro de 1:12", "1:{r} · dentro de 1:12"],
  ["nx_ramp_steep", "1:{r} · steeper than 1:12", "1:{r} · mais íngreme que 1:12", "1:{r} · más empinada que 1:12"],
];
export const RUN_NEXT_ROWS = ROWS;
