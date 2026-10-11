// Mounting substrate + future finish strings (EN / PT-BR / ES). Merged into the
// measure dictionary by measure-i18n, so mt(lang, key) finds them.
// One row per key keeps the three languages side by side.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  // Card / editor
  ["sub_title", "Mounting", "Fixação", "Fijación"],
  ["sub_material", "Goes into", "Fixa em", "Se fija en"],
  ["sub_condition", "Condition", "Estado", "Estado"],
  ["sub_edge", "To nearest edge", "Até a borda mais próxima", "Al borde más cercano"],
  ["sub_depth", "Depth available", "Profundidade disponível", "Profundidad disponible"],
  ["sub_mount", "Mount", "Montagem", "Montaje"],
  ["sub_hidden", "Hidden in the slab / wall", "Oculto na laje / parede", "Oculto en la losa / muro"],
  ["sub_scanned", "Scanned — holes clear", "Escaneado — furos livres", "Escaneado — perforaciones libres"],
  ["sub_standoff", "Standoff block + flashing", "Calço espaçador + rufo", "Bloque separador + tapajuntas"],
  ["sub_blocking", "Reaches rim joist / blocking", "Alcança a viga de borda / bloqueio", "Llega a la viga de borde / bloqueo"],
  ["sub_anchor", "Anchor", "Chumbador", "Anclaje"],
  ["sub_suggested", "Suggested", "Sugerido", "Sugerido"],
  ["sub_anchorUsed", "Anchor used, if different", "Chumbador usado, se diferente", "Anclaje usado, si es distinto"],
  ["sub_same", "Same as previous", "Igual ao anterior", "Igual al anterior"],
  ["sub_applyAll", "Apply to all", "Aplicar a todos", "Aplicar a todos"],
  ["sub_applied", "Applied", "Aplicado", "Aplicado"],
  ["sub_photo", "Photo", "Foto", "Foto"],
  ["sub_note", "Note", "Observação", "Nota"],
  ["sub_min", "min", "mín", "mín"],
  ["sub_more", "More", "Mais", "Más"],
  ["sub_less", "Less", "Menos", "Menos"],
  ["sub_change", "Change", "Alterar", "Cambiar"],
  ["sub_notSet", "Not set", "Não definido", "Sin definir"],

  // Materials
  ["sub_mat_poured_concrete", "Poured concrete", "Concreto moldado", "Hormigón colado"],
  ["sub_mat_precast", "Precast step", "Degrau pré-moldado", "Escalón prefabricado"],
  ["sub_mat_brick", "Brick", "Tijolo", "Ladrillo"],
  ["sub_mat_stone", "Stone / granite", "Pedra / granito", "Piedra / granito"],
  ["sub_mat_block_hollow", "Block (hollow)", "Bloco (vazado)", "Bloque (hueco)"],
  ["sub_mat_block_filled", "Block (filled)", "Bloco (grauteado)", "Bloque (relleno)"],
  ["sub_mat_wood_framing", "Wood framing / rim", "Estrutura de madeira / viga", "Estructura de madera / viga"],
  ["sub_mat_wood_deck", "Wood deck boards", "Tábuas de deck", "Tablas de deck"],
  ["sub_mat_composite", "Composite decking", "Deck compósito", "Deck compuesto"],
  ["sub_mat_stucco", "Stucco / EIFS", "Reboco / EIFS", "Estuco / EIFS"],
  ["sub_mat_siding", "Siding over sheathing", "Revestimento sobre chapa", "Revestimiento sobre tablero"],
  ["sub_mat_steel", "Steel", "Aço", "Acero"],
  ["sub_mat_tile_slab", "Tile over slab", "Piso sobre laje", "Baldosa sobre losa"],
  ["sub_mat_existing_iron", "Existing iron", "Ferro existente", "Hierro existente"],

  // Conditions
  ["sub_cond_sound", "Sound", "Bom", "Sano"],
  ["sub_cond_cracked", "Cracked", "Trincado", "Agrietado"],
  ["sub_cond_spalled", "Spalled", "Desplacado", "Desconchado"],
  ["sub_cond_rotted", "Rotted", "Podre", "Podrido"],
  ["sub_cond_unknown", "Unknown", "Desconhecido", "Desconocido"],

  // Mounts
  ["sub_mount_core_drill", "Core-drilled", "Furo com coroa", "Perforación con corona"],
  ["sub_mount_surface_flange", "Surface flange", "Flange na superfície", "Brida superficial"],
  ["sub_mount_side_mount", "Side / fascia", "Lateral / testeira", "Lateral / frontal"],
  ["sub_mount_through_bolt", "Through-bolt", "Parafuso passante", "Perno pasante"],
  ["sub_mount_embed", "Embedded", "Embutido", "Empotrado"],
  ["sub_mount_weld", "Weld to existing", "Solda no existente", "Soldar al existente"],

  // Hidden utilities
  ["sub_hidden_none", "None", "Nada", "Nada"],
  ["sub_hidden_radiant", "Radiant heat", "Piso aquecido", "Calefacción radiante"],
  ["sub_hidden_conduit", "Conduit / pipe", "Eletroduto / cano", "Conducto / tubo"],
  ["sub_hidden_pt_slab", "Post-tensioned slab", "Laje protendida", "Losa postensada"],
  ["sub_hidden_unknown", "Unknown", "Desconhecido", "Desconocido"],

  // Anchors
  ["sub_anchor_core_grout", "Hydraulic cement / epoxy grout in core", "Cimento hidráulico / graute epóxi no furo", "Cemento hidráulico / grout epóxico en el núcleo"],
  ["sub_anchor_wedge_adhesive", "Wedge or adhesive anchor", "Chumbador de expansão ou químico", "Anclaje de expansión o químico"],
  ["sub_anchor_adhesive", "Adhesive anchor", "Chumbador químico", "Anclaje químico"],
  ["sub_anchor_adhesive_screen", "Adhesive anchor with screen tube", "Chumbador químico com tela", "Anclaje químico con tamiz"],
  ["sub_anchor_sleeve_brick", "Sleeve / adhesive anchor into brick, not mortar", "Chumbador camisa / químico no tijolo, não na argamassa", "Anclaje de camisa / químico en el ladrillo, no en el mortero"],
  ["sub_anchor_lag_blocking", "Structural lag into framing, add blocking", "Tirafundo estrutural na estrutura, com bloqueio", "Tirafondo estructural en la estructura, con bloqueo"],
  ["sub_anchor_through_bolt", "Through-bolt with backing plate", "Parafuso passante com contraplaca", "Perno pasante con contraplaca"],
  ["sub_anchor_standoff_flash", "Standoff block + flashing, lag to framing", "Calço espaçador + rufo, tirafundo na estrutura", "Bloque separador + tapajuntas, tirafondo a la estructura"],
  ["sub_anchor_weld", "Field weld", "Solda em campo", "Soldadura en obra"],
  ["sub_anchor_bolt_steel", "Bolt to steel", "Parafusar no aço", "Atornillar al acero"],
  ["sub_anchor_core_tile", "Diamond core through tile, grout in slab", "Coroa diamantada no piso, graute na laje", "Corona de diamante por la baldosa, grout en la losa"],
  ["sub_anchor_embed_grout", "Embed and grout", "Embutir e grautear", "Empotrar y rellenar con grout"],
  ["sub_anchor_scan_first", "Do not drill — GPR scan first", "Não furar — escanear (GPR) antes", "No perforar — escanear (GPR) primero"],

  // Location labels
  ["sub_loc_start", "start", "início", "inicio"],
  ["sub_loc_end", "end", "fim", "fin"],
  ["sub_loc_brackets", "Wall brackets", "Suportes de parede", "Soportes de muro"],
  ["sub_loc_hinge", "Hinge post", "Poste das dobradiças", "Poste de bisagras"],
  ["sub_loc_latch", "Latch post", "Poste do trinco", "Poste del pestillo"],
  ["sub_loc_fence_posts", "Fence posts", "Postes da cerca", "Postes de la cerca"],
  ["sub_loc_anchorage", "Anchorage", "Ancoragem", "Anclaje"],
  ["sub_loc_deck_posts", "Guard posts", "Postes do guarda-corpo", "Postes de la baranda"],
  ["sub_loc_level", "Level", "Nível", "Nivel"],
  ["sub_loc_well", "Well wall", "Parede do poço", "Muro del pozo"],
  ["sub_loc_jamb", "Jamb", "Ombreira", "Jamba"],
  ["sub_loc_endL", "left end", "apoio esq.", "apoyo izq."],
  ["sub_loc_endR", "right end", "apoio dir.", "apoyo der."],
  ["sub_loc_base", "base", "base", "base"],

  // Checks
  ["check_sub_edge", "Anchor edge distance", "Distância do chumbador à borda", "Distancia del anclaje al borde"],
  ["check_sub_depth", "Depth for the core / embed", "Profundidade para o furo / embutimento", "Profundidad para el núcleo / empotramiento"],
  ["check_sub_condition", "Substrate is sound", "Base em bom estado", "Soporte en buen estado"],
  ["check_sub_hidden", "Hidden utilities checked", "Instalações ocultas verificadas", "Instalaciones ocultas verificadas"],
  ["check_sub_pt_slab", "Post-tensioned slab scanned before drilling", "Laje protendida escaneada antes de furar", "Losa postensada escaneada antes de perforar"],
  ["check_sub_cladding", "Standoff + flashing over cladding", "Calço + rufo sobre o revestimento", "Separador + tapajuntas sobre el revestimiento"],
  ["check_sub_decking", "Post reaches framing, not just deck boards", "Poste alcança a estrutura, não só as tábuas", "Poste llega a la estructura, no solo a las tablas"],
  ["check_sub_weld", "Weld only to steel", "Solda só em aço", "Soldar solo a acero"],
  ["check_finish_riser_mix", "Risers stay even after finishes", "Espelhos continuam iguais após o acabamento", "Contrahuellas parejas tras los acabados"],

  // Future finish
  ["fin_title", "Finished surfaces", "Superfícies acabadas", "Superficies terminadas"],
  ["fin_installed", "Finish installed?", "Acabamento instalado?", "¿Acabado instalado?"],
  ["fin_yes", "Installed", "Instalado", "Instalado"],
  ["fin_no", "Not yet", "Ainda não", "Aún no"],
  ["fin_thickness", "Thickness to add", "Espessura a acrescentar", "Espesor a agregar"],
  ["fin_toCome", "to come", "a instalar", "por instalar"],
  ["fin_measuredOn", "measured on", "medido sobre", "medido sobre"],
  ["fin_after", "After finish", "Após acabamento", "Tras el acabado"],
  ["fin_heights", "Heights from the finished surface", "Alturas a partir da superfície acabada", "Alturas desde la superficie terminada"],
  ["fin_type_hardwood", "Hardwood", "Madeira", "Madera"],
  ["fin_type_tile", "Tile", "Porcelanato", "Baldosa"],
  ["fin_type_carpet", "Carpet", "Carpete", "Alfombra"],
  ["fin_type_stone", "Stone / pavers", "Pedra / pavers", "Piedra / adoquines"],
  ["fin_type_composite", "Composite", "Compósito", "Compuesto"],
  ["fin_type_siding", "Siding", "Revestimento", "Revestimiento"],
  ["fin_type_stucco", "Stucco", "Reboco", "Estuco"],
  ["fin_surf_bottom", "Bottom floor", "Piso de baixo", "Piso inferior"],
  ["fin_surf_treads", "Treads", "Pisos dos degraus", "Huellas"],
  ["fin_surf_landing", "Landing", "Patamar", "Descanso"],
  ["fin_surf_top", "Top floor", "Piso de cima", "Piso superior"],
  ["fin_surf_floor", "Floor", "Piso", "Piso"],
  ["fin_surf_deck", "Deck surface", "Superfície do deck", "Superficie del deck"],
  ["fin_surf_ground", "Ground", "Chão", "Suelo"],
  ["fin_surf_wall", "Wall", "Parede", "Muro"],
  ["fin_surf_slab", "Slab", "Laje", "Losa"],
  ["fin_rough_bottom", "subfloor", "contrapiso", "contrapiso"],
  ["fin_rough_treads", "rough tread", "degrau bruto", "huella en bruto"],
  ["fin_rough_landing", "rough landing", "patamar bruto", "descanso en bruto"],
  ["fin_rough_top", "subfloor", "contrapiso", "contrapiso"],
  ["fin_rough_floor", "subfloor", "contrapiso", "contrapiso"],
  ["fin_rough_deck", "deck framing", "estrutura do deck", "estructura del deck"],
  ["fin_rough_ground", "grade", "terreno", "terreno"],
  ["fin_rough_wall", "sheathing", "chapa", "tablero"],
  ["fin_rough_slab", "slab", "laje", "losa"],
  ["fin_h_rail", "Rail height", "Altura do corrimão", "Altura del pasamanos"],
  ["fin_h_bottom", "Bottom clearance", "Folga inferior", "Holgura inferior"],
  ["fin_h_guard", "Guard height", "Altura do guarda-corpo", "Altura de la baranda"],
  ["fin_h_clear", "Ground clearance", "Folga ao chão", "Holgura al suelo"],
  ["fin_h_gate", "Gate height", "Altura do portão", "Altura del portón"],
  ["fin_h_fence", "Fence height", "Altura da cerca", "Altura de la cerca"],
  ["fin_h_sill", "Sill above floor", "Peitoril acima do piso", "Antepecho sobre el piso"],
  ["fin_h_column", "clear above finished floor", "livre acima do piso acabado", "libre sobre piso terminado"],

  // Print
  ["mount_print_title", "Mounting", "Fixação", "Fijación"],
  ["mount_col_loc", "Location", "Local", "Ubicación"],
  ["mount_col_sub", "Substrate", "Base", "Soporte"],
  ["mount_col_cond", "Condition", "Estado", "Estado"],
  ["mount_col_anchor", "Anchor", "Chumbador", "Anclaje"],
  ["mount_col_edge", "Edge", "Borda", "Borde"],
  ["mount_scan", "scan first", "escanear antes", "escanear antes"],
  ["fin_print_title", "Finishes to come", "Acabamentos a instalar", "Acabados por instalar"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

export const SUBSTRATE_STR = { en: build(1), pt: build(2), es: build(3) };
export const SUBSTRATE_KEYS = ROWS.map((r) => r[0]);
