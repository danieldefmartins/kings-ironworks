// Wall-cap railing strings (EN / PT-BR / ES). Merged into the measure
// dictionary by measure-i18n, so mt(lang, key) finds them like any other
// measure string. One row per key keeps the three languages side by side.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  ["shape_wall_cap", "Railing on a wall", "Guarda-corpo sobre muro", "Barandilla sobre muro"],
  ["wc_title", "Railing on a wall", "Guarda-corpo sobre muro", "Barandilla sobre muro"],
  ["wc_start", "Start the wall", "Começar o muro", "Empezar el muro"],

  // Photos
  ["slot_wc_overall", "The whole wall, end to end", "O muro inteiro, de ponta a ponta", "El muro completo, de punta a punta"],
  ["slot_wc_cap", "The cap close up, both faces", "O capeamento de perto, as duas faces", "La albardilla de cerca, ambas caras"],
  ["slot_wc_drop", "The drop side, with grade", "O lado da queda, com o terreno", "El lado de la caída, con el terreno"],
  ["slot_wc_ends", "Each end and corner", "Cada ponta e canto", "Cada extremo y esquina"],

  // Views
  ["wc_views", "View", "Vista", "Vista"],
  ["wc_elevation", "Elevation", "Elevação", "Alzado"],
  ["wc_section", "Section", "Corte", "Sección"],
  ["wc_dropShort", "Drop", "Queda", "Caída"],
  ["wc_railShort", "Rail", "Corrimão", "Pasamanos"],
  ["wc_walkSide", "Walk side", "Lado do piso", "Lado de paso"],
  ["wc_guardShort", "Guard", "Guarda", "Guarda"],

  // Summary
  ["wc_run", "run", "trecho", "tramo"],
  ["wc_runs", "runs", "trechos", "tramos"],
  ["wc_post", "post", "poste", "poste"],
  ["wc_posts", "posts", "postes", "postes"],
  ["wc_railLength", "Rail length", "Comprimento do corrimão", "Largo del pasamanos"],
  ["wc_guard", "Guard height", "Altura da guarda", "Altura de la guarda"],
  ["wc_maxStep", "Cap falls", "Desnível do topo", "Desnivel de la albardilla"],
  ["wc_minCap", "Min. cap", "Topo mín.", "Albardilla mín."],

  // The wall
  ["wc_wallTitle", "The wall", "O muro", "El muro"],
  ["wc_kind", "Kind of wall", "Tipo de muro", "Tipo de muro"],
  ["wc_kind_retaining", "Retaining wall", "Muro de arrimo", "Muro de contención"],
  ["wc_kind_parapet", "Parapet", "Platibanda", "Pretil"],
  ["wc_kind_knee", "Knee wall", "Mureta", "Murete"],
  ["wc_kind_roof_edge", "Roof edge", "Borda do telhado", "Borde de techo"],
  ["wc_material", "Cap", "Capeamento", "Albardilla"],
  ["wc_mat_concrete", "Concrete", "Concreto", "Concreto"],
  ["wc_mat_precast", "Precast", "Pré-moldado", "Prefabricado"],
  ["wc_mat_stone", "Stone", "Pedra", "Piedra"],
  ["wc_mat_brick", "Brick", "Tijolo", "Ladrillo"],
  ["wc_mat_block", "Block", "Bloco", "Bloque"],
  ["wc_mat_wood", "Wood", "Madeira", "Madera"],
  ["wc_sameAsWall", "Same as the wall", "Igual ao muro", "Igual que el muro"],
  ["wc_loose", "Loose caps?", "Capeamento solto?", "¿Albardilla suelta?"],
  ["wc_cracked", "Cracked?", "Trincado?", "¿Agrietada?"],
  ["wc_membrane", "Roof membrane on the wall?", "Manta do telhado sobre o muro?", "¿Membrana del techo sobre el muro?"],
  ["wc_noPenetration", "No penetrations allowed?", "Proibido furar?", "¿Prohibido perforar?"],
  ["wc_flashBy", "Who flashes each post", "Quem faz o arremate de cada poste", "Quién sella cada poste"],
  ["wc_flash_roofer", "Roofer", "Telhadista", "Techador"],
  ["wc_flash_kiw", "Us", "Nós", "Nosotros"],

  // Drop & guard
  ["wc_guardTitle", "Drop & guard", "Queda e guarda", "Caída y guarda"],
  ["wc_dropSide", "Drop side", "Lado da queda", "Lado de la caída"],
  ["wc_dropSideHint", "Standing at P1, looking along the wall.", "Em pé no P1, olhando ao longo do muro.", "De pie en P1, mirando a lo largo del muro."],
  ["wc_left", "Left", "Esquerda", "Izquierda"],
  ["wc_right", "Right", "Direita", "Derecha"],
  ["wc_leftShort", "L", "E", "I"],
  ["wc_rightShort", "R", "D", "D"],
  ["wc_drop", "Drop, top of cap to grade", "Queda, topo ao terreno", "Caída, albardilla al terreno"],
  ["wc_capAboveWalk", "Cap above walk side", "Topo acima do piso", "Albardilla sobre el piso"],
  ["wc_railHeight", "Rail above cap", "Corrimão acima do topo", "Pasamanos sobre la albardilla"],
  ["wc_occupancy", "Occupancy", "Uso", "Uso"],
  ["wc_occ_residential", "Residential", "Residencial", "Residencial"],
  ["wc_occ_commercial", "Commercial", "Comercial", "Comercial"],
  ["wc_noGuardReq", "No guard required", "Guarda não exigida", "No se exige guarda"],
  ["wc_noGuardShort", "none required", "não exigida", "no exigida"],
  ["wc_positionMore", "Position", "Posição", "Posición"],
  ["wc_positionLess", "Done", "Pronto", "Listo"],
  ["wc_guardRequired", "Guard required", "Guarda exigida", "Guarda exigida"],
  ["wc_guardFromWalk", "measured from the walk side", "medida a partir do piso", "medida desde el piso"],

  // Mount
  ["wc_mountTitle", "Mount", "Fixação", "Fijación"],
  ["wc_mount", "Posts set", "Postes", "Postes"],
  ["wc_mount_core", "Core-drilled", "Chumbado (furo)", "Perforado (núcleo)"],
  ["wc_mount_plate", "Base plate", "Chapa de base", "Placa base"],
  ["wc_mount_side_high", "Side · walk face", "Lateral · face do piso", "Lateral · cara de paso"],
  ["wc_mount_side_low", "Side · drop face", "Lateral · face da queda", "Lateral · cara de caída"],
  ["wc_mount_clamp", "Clamp · no holes", "Grampo · sem furos", "Abrazadera · sin perforar"],
  ["wc_coreDia", "Core diameter", "Diâmetro do furo", "Diámetro del núcleo"],
  ["wc_coreDepth", "Core depth", "Profundidade do furo", "Profundidad del núcleo"],
  ["wc_plateSize", "Plate size", "Tamanho da chapa", "Tamaño de placa"],
  ["wc_faceDepth", "Solid face below cap", "Face sólida abaixo do topo", "Cara sólida bajo la albardilla"],
  ["wc_postCut", "Post cut", "Corte do poste", "Corte del poste"],
  ["wc_part_rail", "rail", "corrimão", "pasamanos"],
  ["wc_part_embed", "embed", "embutido", "empotrado"],
  ["wc_part_face", "face", "face", "cara"],

  // Runs & posts
  ["wc_runsTitle", "Runs & posts", "Trechos e postes", "Tramos y postes"],
  ["wc_addRun", "Add a run (corner)", "Adicionar trecho (canto)", "Añadir tramo (esquina)"],
  ["wc_addPost", "Add post", "Adicionar poste", "Añadir poste"],
  ["wc_runLength", "Run length", "Comprimento do trecho", "Largo del tramo"],
  ["wc_turnTitle", "Turn from the last run", "Virada do trecho anterior", "Giro desde el tramo anterior"],
  ["wc_turnDir", "Turns", "Vira para", "Gira a"],
  ["wc_turnAngle", "Angle °", "Ângulo °", "Ángulo °"],
  ["wc_postsTitle", "Posts", "Postes", "Postes"],
  ["wc_capFalls", "Cap moves", "Topo varia", "Varía"],
  ["wc_capWidth", "Cap width", "Largura do topo", "Ancho de albardilla"],
  ["wc_top", "Top of cap ±", "Topo ±", "Albardilla ±"],
  ["wc_edgeHigh", "Edge, walk side", "Borda, lado do piso", "Borde, lado de paso"],
  ["wc_edgeLow", "Edge, drop side", "Borda, lado da queda", "Borde, lado de caída"],
  ["wc_at", "From run start", "Do início do trecho", "Desde el inicio"],
  ["wc_railStyle", "Rail", "Corrimão", "Pasamanos"],
  ["wc_rail_raked", "Raked", "Inclinado", "Inclinado"],
  ["wc_rail_stepped", "Stepped", "Escalonado", "Escalonado"],
  ["wc_decide", "decide raked / stepped", "decidir inclinado / escalonado", "decidir inclinado / escalonado"],
  ["wc_slopeHint", "Top of cap moves", "O topo varia", "La albardilla varía"],
  ["wc_datum", "Elevations measured from", "Cotas medidas a partir de", "Cotas medidas desde"],
  ["wc_datumPh", "laser at P1, top of cap = 0", "laser no P1, topo = 0", "láser en P1, albardilla = 0"],
  ["wc_cap", "Cap", "Topo", "Albardilla"],

  // Finish
  ["wc_finishTitle", "Finish", "Acabamento", "Acabado"],
  ["wc_fin_dtm", "DTM paint", "Pintura DTM", "Pintura DTM"],
  ["wc_fin_galvanized", "Galvanized", "Galvanizado", "Galvanizado"],
  ["wc_fin_powder", "Powder coat", "Pintura eletrostática", "Pintura en polvo"],
  ["wc_fin_galv_powder", "Galv + powder", "Galv. + eletrostática", "Galv. + polvo"],

  // Check numbers
  ["wc_lbl_min", "min", "mín", "mín"],
  ["wc_lbl_edge", "edge", "borda", "borde"],
  ["wc_lbl_edges", "edges", "bordas", "bordes"],
  ["wc_lbl_needs", "needs", "precisa", "necesita"],
  ["wc_lbl_plate", "plate", "chapa", "placa"],
  ["wc_lbl_required", "required", "exigida", "exigida"],
  ["wc_lbl_have", "have", "tem", "tiene"],
  ["wc_lbl_tol", "tol.", "tol.", "tol."],
  ["wc_lbl_rise", "moves", "varia", "varía"],

  // Checks
  ["check_wc_edge", "Core edge distance (3\" min)", "Distância do furo à borda (mín 3\")", "Distancia del núcleo al borde (mín 3\")"],
  ["check_wc_edge_sum", "Edge distances add up to the cap", "Distâncias às bordas somam o topo", "Distancias a los bordes suman la albardilla"],
  ["check_wc_cap_narrow_core", "Cap too narrow to core", "Topo estreito demais para furar", "Albardilla muy angosta para perforar"],
  ["check_wc_plate_fit", "Base plate fits the cap", "Chapa cabe no topo", "La placa cabe en la albardilla"],
  ["check_wc_guard_height", "Guard height for the drop", "Altura da guarda para a queda", "Altura de guarda para la caída"],
  ["check_wc_slope_decision", "Cap slopes — choose raked or stepped", "Topo inclinado — escolha inclinado ou escalonado", "Albardilla inclinada — elija inclinado o escalonado"],
  ["check_wc_loose", "Loose cap — reset before posts", "Topo solto — refazer antes dos postes", "Albardilla suelta — reasentar antes de postes"],
  ["check_wc_cracked", "Cracked cap — core away from cracks", "Topo trincado — furar longe das trincas", "Albardilla agrietada — perforar lejos de grietas"],
  ["check_wc_membrane", "Posts go through the roof membrane", "Postes atravessam a manta do telhado", "Postes atraviesan la membrana del techo"],

  // Gaps
  ["gap_wc_missing", "Wall details", "Detalhes do muro", "Detalles del muro"],
  ["gap_wc_kind", "Kind of wall", "Tipo de muro", "Tipo de muro"],
  ["gap_wc_material", "Cap material", "Material do topo", "Material de la albardilla"],
  ["gap_wc_drop_side", "Drop side", "Lado da queda", "Lado de la caída"],
  ["gap_wc_drop", "Drop height", "Altura da queda", "Altura de la caída"],
  ["gap_wc_rail_height", "Rail height", "Altura do corrimão", "Altura del pasamanos"],
  ["gap_wc_mount", "How the posts are set", "Como os postes são fixados", "Cómo se fijan los postes"],
  ["gap_wc_core_dia", "Core diameter", "Diâmetro do furo", "Diámetro del núcleo"],
  ["gap_wc_core_depth", "Core depth", "Profundidade do furo", "Profundidad del núcleo"],
  ["gap_wc_plate", "Base plate size", "Tamanho da chapa", "Tamaño de placa"],
  ["gap_wc_face_depth", "Solid face below the cap", "Face sólida abaixo do topo", "Cara sólida bajo la albardilla"],
  ["gap_wc_condition", "Cap condition", "Estado do topo", "Estado de la albardilla"],
  ["gap_wc_membrane", "Roof membrane?", "Manta do telhado?", "¿Membrana del techo?"],
  ["gap_wc_no_penetration", "Penetrations allowed?", "Pode furar?", "¿Se puede perforar?"],
  ["gap_wc_runs", "Add the wall runs", "Adicione os trechos do muro", "Añada los tramos del muro"],
  ["gap_wc_run_length", "Run length", "Comprimento do trecho", "Largo del tramo"],
  ["gap_wc_turn", "Turn at the corner", "Virada no canto", "Giro en la esquina"],
  ["gap_wc_rail_style", "Raked or stepped", "Inclinado ou escalonado", "Inclinado o escalonado"],
  ["gap_wc_cap_width", "Cap width", "Largura do topo", "Ancho de albardilla"],
  ["gap_wc_top", "Top of cap", "Topo do muro", "Parte superior de la albardilla"],
  ["gap_wc_edges", "Edge distances", "Distâncias às bordas", "Distancias a los bordes"],
  ["gap_wc_datum", "What elevations are measured from", "Referência das cotas", "Referencia de las cotas"],
  ["gap_wc_finish", "Finish", "Acabamento", "Acabado"],

  // Print
  ["wc_postTable", "Posts — drill table", "Postes — tabela de furação", "Postes — tabla de perforación"],
  ["wc_runCol", "Run", "Trecho", "Tramo"],
  ["wc_postCol", "Post", "Poste", "Poste"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

export const WALL_CAP_STR = { en: build(1), pt: build(2), es: build(3) };
export const WALL_CAP_KEYS = ROWS.map((r) => r[0]);
