// Shop-piece strings (EN / PT-BR / ES). Merged into the measure dictionary by
// measure-i18n, so mt(lang, key) finds them like any other measure string.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  ["shape_shop_piece", "Shop piece", "Peça de oficina", "Pieza de taller"],
  ["sp_title", "Shop pieces", "Peças de oficina", "Piezas de taller"],
  ["sp_start", "Start the piece", "Começar a peça", "Empezar la pieza"],
  ["sp_piece", "piece", "peça", "pieza"],
  ["sp_pieces", "pieces", "peças", "piezas"],

  // Photos
  ["slot_sp_reference", "Drawing or reference picture", "Desenho ou foto de referência", "Dibujo o foto de referencia"],
  ["slot_sp_site", "Where it goes", "Onde vai ser instalada", "Dónde va"],

  // Types
  ["sp_type", "Item", "Item", "Artículo"],
  ["sp_noType", "Choose the item", "Escolha o item", "Elija el artículo"],
  ["sp_type_bar_frame", "Bar frame", "Estrutura de bar", "Estructura de barra"],
  ["sp_type_counter_frame", "Counter frame", "Estrutura de balcão", "Estructura de mostrador"],
  ["sp_type_wine_rack", "Wine rack", "Adega / porta-vinhos", "Botellero"],
  ["sp_type_bracket", "Bracket", "Mão-francesa", "Ménsula"],
  ["sp_type_shelf_frame", "Shelf frame", "Estrutura de prateleira", "Estructura de estante"],
  ["sp_type_sign_bracket", "Sign bracket", "Suporte de placa", "Soporte de letrero"],
  ["sp_type_furniture_base", "Furniture base", "Base de móvel", "Base de mueble"],
  ["sp_type_grille", "Grille to drawing", "Grade conforme desenho", "Reja según dibujo"],
  ["sp_type_other", "Other", "Outro", "Otro"],

  // Drawing
  ["sp_drawing", "Drawing", "Desenho", "Dibujo"],
  ["sp_front", "Front", "Frente", "Frente"],
  ["sp_side", "Side", "Lateral", "Lateral"],
  ["sp_buildW", "Build width", "Largura final", "Ancho final"],
  ["sp_buildH", "Build height", "Altura final", "Alto final"],
  ["sp_buildD", "Build depth", "Profundidade final", "Fondo final"],

  // Mounting
  ["sp_mountTitle", "How it's mounted", "Como é fixada", "Cómo se fija"],
  ["sp_mount", "Mounting", "Fixação", "Fijación"],
  ["sp_mount_freestanding", "Freestanding", "Solta", "Independiente"],
  ["sp_mount_wall", "Wall-mounted", "Na parede", "En la pared"],
  ["sp_mount_counter", "To counter", "No balcão", "Al mostrador"],
  ["sp_niche", "Fits in a niche", "Encaixa em um nicho", "Va en un nicho"],
  ["sp_inNiche", "in a niche", "em nicho", "en nicho"],
  ["sp_clearance", "Clearance per side", "Folga por lado", "Holgura por lado"],
  ["sp_substrate", "Fastens to", "Fixa em", "Se fija a"],
  ["sp_sub_studs", "Studs", "Montantes", "Montantes"],
  ["sp_sub_masonry", "Masonry", "Alvenaria", "Mampostería"],
  ["sp_sub_concrete", "Concrete", "Concreto", "Concreto"],
  ["sp_sub_wood", "Wood", "Madeira", "Madera"],
  ["sp_sub_steel", "Steel", "Aço", "Acero"],
  ["sp_sub_stone", "Stone", "Pedra", "Piedra"],
  ["sp_sub_loc", "Wall / counter", "Parede / balcão", "Pared / mostrador"],
  ["gap_sub_shoppiece", "What it fastens to", "Onde é fixada", "A qué se fija"],
  ["sp_nx_wBack", "Niche width · back", "Largura do nicho · fundo", "Ancho del nicho · fondo"],
  ["sp_nx_wFront", "Niche width · front", "Largura do nicho · frente", "Ancho del nicho · frente"],
  ["sp_nx_wTop", "Niche width · top", "Largura do nicho · em cima", "Ancho del nicho · arriba"],
  ["sp_nx_wBottom", "Niche width · bottom", "Largura do nicho · embaixo", "Ancho del nicho · abajo"],
  ["sp_nx_hLeft", "Niche height · left", "Altura do nicho · esquerda", "Alto del nicho · izquierda"],
  ["sp_nx_hRight", "Niche height · right", "Altura do nicho · direita", "Alto del nicho · derecha"],
  ["sp_nx_hBack", "Niche height · back", "Altura do nicho · fundo", "Alto del nicho · fondo"],
  ["sp_nx_dTop", "Niche depth · top", "Profundidade do nicho · em cima", "Fondo del nicho · arriba"],
  ["sp_nx_dBottom", "Niche depth · bottom", "Profundidade do nicho · embaixo", "Fondo del nicho · abajo"],
  ["sp_fastener", "Fasteners", "Fixadores", "Fijaciones"],
  ["sp_fastenerPh", "3/8\" lag into studs", "Parafuso 3/8\" nos montantes", "Tirafondo 3/8\" a montantes"],

  // Pieces
  ["sp_piecesTitle", "Pieces & sizes", "Peças e medidas", "Piezas y medidas"],
  ["sp_addPiece", "Add piece", "Adicionar peça", "Añadir pieza"],
  ["sp_label", "Name", "Nome", "Nombre"],
  ["sp_w", "Width", "Largura", "Ancho"],
  ["sp_h", "Height", "Altura", "Alto"],
  ["sp_d", "Depth", "Profundidade", "Fondo"],
  ["sp_widthsTitle", "Niche width", "Largura do nicho", "Ancho del nicho"],
  ["sp_heightsTitle", "Niche height", "Altura do nicho", "Alto del nicho"],
  ["sp_depthsTitle", "Niche depth", "Profundidade do nicho", "Fondo del nicho"],
  ["sp_diagTitle", "Front diagonals", "Diagonais da frente", "Diagonales del frente"],
  ["sp_diagA", "Top-left → bottom-right", "Sup. esq. → inf. dir.", "Sup. izq. → inf. der."],
  ["sp_diagB", "Top-right → bottom-left", "Sup. dir. → inf. esq.", "Sup. der. → inf. izq."],
  ["sp_r_wBack", "Back", "Fundo", "Fondo"],
  ["sp_r_wFront", "Front", "Frente", "Frente"],
  ["sp_r_wTop", "Top", "Em cima", "Arriba"],
  ["sp_r_wBottom", "Bottom", "Embaixo", "Abajo"],
  ["sp_r_hLeft", "Left", "Esquerda", "Izquierda"],
  ["sp_r_hRight", "Right", "Direita", "Derecha"],
  ["sp_r_hBack", "Back", "Fundo", "Fondo"],
  ["sp_r_dTop", "Top", "Em cima", "Arriba"],
  ["sp_r_dBottom", "Bottom", "Embaixo", "Abajo"],
  ["sp_squareFix", "Niche out of square — build", "Nicho fora de esquadro — fabricar", "Nicho fuera de escuadra — fabricar"],
  ["sp_fix_smallest", "Square, to the smallest", "No esquadro, pela menor", "A escuadra, por la menor"],
  ["sp_fix_template", "To a template", "Por gabarito", "Por plantilla"],
  ["sp_buildTo", "Build to", "Fabricar com", "Fabricar a"],
  ["sp_designSize", "Design size — built as entered.", "Medida de projeto — fabricar como informado.", "Medida de diseño — fabricar como se indica."],

  // Materials
  ["sp_materialsTitle", "Materials", "Materiais", "Materiales"],
  ["sp_profile", "Profile", "Perfil", "Perfil"],
  ["sp_use", "Used for", "Usado em", "Se usa en"],
  ["sp_usePh", "frame, legs", "estrutura, pés", "marco, patas"],
  ["sp_otherMaterial", "Other", "Outro", "Otro"],

  // Finish
  ["sp_fin_powder", "Powder coat", "Eletrostática", "Pintura en polvo"],
  ["sp_fin_dtm", "DTM paint", "Pintura DTM", "Pintura DTM"],
  ["sp_fin_clear", "Clear coat", "Verniz", "Barniz"],
  ["sp_fin_raw", "Raw steel", "Aço cru", "Acero crudo"],
  ["sp_fin_galvanized", "Galvanized", "Galvanizado", "Galvanizado"],
  ["sp_fin_blackened", "Blackened", "Oxidado preto", "Pavonado"],

  // Load
  ["sp_loadTitle", "What it carries", "O que vai suportar", "Qué carga lleva"],
  ["sp_load", "Load", "Carga", "Carga"],
  ["sp_load_none", "Nothing", "Nada", "Nada"],
  ["sp_load_bottles", "Bottles", "Garrafas", "Botellas"],
  ["sp_load_people", "People", "Pessoas", "Personas"],
  ["sp_load_stone_top", "Stone top", "Tampo de pedra", "Cubierta de piedra"],
  ["sp_load_equipment", "Equipment", "Equipamento", "Equipo"],
  ["sp_load_other", "Other", "Outro", "Otro"],
  ["sp_bottles", "Bottles", "Garrafas", "Botellas"],
  ["sp_bottlesShort", "bottles", "garrafas", "botellas"],
  ["sp_loadNote", "Load note", "Observação de carga", "Nota de carga"],
  ["sp_loadNotePh", "8' granite top, 2 1/4\"", "Tampo de granito 2,40 m", "Cubierta de granito 2,40 m"],

  // Reference
  ["sp_referenceTitle", "Reference", "Referência", "Referencia"],
  ["sp_drawingRef", "Drawing / reference", "Desenho / referência", "Dibujo / referencia"],
  ["sp_drawingRefPh", "Designer sheet A-3, or client photo", "Prancha A-3 do designer, ou foto do cliente", "Lámina A-3 del diseñador, o foto del cliente"],

  // Check numbers
  ["sp_lbl_short", "short", "menor", "menor"],
  ["sp_lbl_long", "long", "maior", "mayor"],
  ["sp_lbl_min", "min", "mín", "mín"],
  ["sp_lbl_max", "max", "máx", "máx"],

  // Checks
  ["check_sp_square", "Niche diagonals agree (square)", "Diagonais do nicho conferem (esquadro)", "Diagonales del nicho coinciden (escuadra)"],
  ["check_sp_width_spread", "Niche widths agree", "Larguras do nicho conferem", "Anchos del nicho coinciden"],
  ["check_sp_height_spread", "Niche heights agree", "Alturas do nicho conferem", "Altos del nicho coinciden"],
  ["check_sp_depth_spread", "Niche depths agree", "Profundidades do nicho conferem", "Fondos del nicho coinciden"],
  ["check_sp_fab_none", "Clearance leaves nothing to build", "A folga não deixa peça", "La holgura no deja pieza"],
  ["check_sp_typical", "One measurement for several pieces", "Uma medida para várias peças", "Una medida para varias piezas"],
  ["check_sp_people_load", "Carries people — confirm the design load", "Suporta pessoas — confirmar a carga de projeto", "Lleva personas — confirmar la carga de diseño"],
  ["check_sp_stud_load", "Heavy load on studs — confirm blocking", "Carga pesada em montantes — confirmar reforço", "Carga pesada en montantes — confirmar refuerzo"],

  // Gaps
  ["gap_sp_missing", "Piece details", "Detalhes da peça", "Detalles de la pieza"],
  ["gap_sp_mount", "How it's mounted", "Como é fixada", "Cómo se fija"],
  ["gap_sp_clearance", "Clearance", "Folga", "Holgura"],
  ["gap_sp_substrate", "What it fastens to", "Onde é fixada", "A qué se fija"],
  ["gap_sp_pieces", "Add a piece", "Adicione uma peça", "Añada una pieza"],
  ["gap_sp_type", "Item type", "Tipo do item", "Tipo de artículo"],
  ["gap_sp_widths", "Niche widths", "Larguras do nicho", "Anchos del nicho"],
  ["gap_sp_heights", "Niche heights", "Alturas do nicho", "Altos del nicho"],
  ["gap_sp_depths", "Niche depths", "Profundidades do nicho", "Fondos del nicho"],
  ["gap_sp_diagonals", "Diagonals", "Diagonais", "Diagonales"],
  ["gap_sp_width", "Width", "Largura", "Ancho"],
  ["gap_sp_height", "Height", "Altura", "Alto"],
  ["gap_sp_depth", "Depth", "Profundidade", "Fondo"],
  ["gap_sp_materials", "Material list", "Lista de materiais", "Lista de materiales"],
  ["gap_sp_finish", "Finish", "Acabamento", "Acabado"],
  ["gap_sp_load", "What it carries", "O que vai suportar", "Qué carga lleva"],
  ["gap_sp_bottles", "Bottle count", "Número de garrafas", "Número de botellas"],

  // Print
  ["sp_printRule", "Niche: smallest W − 2 × clearance, smallest H and D − 1 × clearance. Clearance", "Nicho: menor L − 2 × folga, menor A e P − 1 × folga. Folga", "Nicho: menor An − 2 × holgura, menor Al y F − 1 × holgura. Holgura"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

export const SHOP_PIECE_STR = { en: build(1), pt: build(2), es: build(3) };
export const SHOP_PIECE_KEYS = ROWS.map((r) => r[0]);
