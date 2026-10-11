// Shot-list strings (EN / PT-BR / ES). Merged into the measure dictionary by
// measure-i18n, so mt(lang, key) finds them — including gap labels, which read
// mt(lang, `slot_${slot}`). One row per key keeps the languages side by side.

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  // Shots added by the pro shot list
  ["slot_mount_surface", "Where it mounts, close up", "Onde vai fixar, de perto", "Donde se fija, de cerca"],
  ["slot_existing_rail", "The existing railing", "O guarda-corpo existente", "La baranda existente"],
  ["slot_spiral_opening", "The floor opening from above", "A abertura no piso vista de cima", "La abertura del piso desde arriba"],
  ["slot_well_grade", "Grade around the well", "O terreno em volta do poço", "El terreno alrededor del foso"],
  ["slot_fe_each_level", "Each level and its window", "Cada nível e sua janela", "Cada nivel y su ventana"],
  ["slot_fe_corrosion", "Worst rust or damage, close up", "Pior ferrugem ou dano, de perto", "El peor óxido o daño, de cerca"],
  ["slot_gate_inside", "From inside, looking out", "De dentro, olhando para fora", "Desde adentro, mirando hacia afuera"],
  ["slot_gate_hinge", "Hinge post, close up", "Poste das dobradiças, de perto", "Poste de bisagras, de cerca"],
  ["slot_gate_latch", "Latch post, close up", "Poste da trava, de perto", "Poste del pestillo, de cerca"],
  ["slot_fence_mount", "Where posts land, close up", "Onde os postes apoiam, de perto", "Donde apoyan los postes, de cerca"],
  ["slot_bal_underside", "Underside of the slab", "Parte de baixo da laje", "Parte inferior de la losa"],
  ["slot_deck_stairs", "Deck stairs, from the side", "Escada do deck, de lado", "Escalera del deck, de lado"],
  ["slot_op_head", "Head / lintel, close up", "Verga, de perto", "Dintel, de cerca"],
  ["slot_op_inside", "From the inside", "Pelo lado de dentro", "Desde adentro"],
  ["slot_st_bearing_far", "The other bearing end, close up", "O outro apoio, de perto", "El otro apoyo, de cerca"],
  ["slot_st_beam_under", "Beam underside / existing framing", "Parte de baixo da viga / estrutura existente", "Parte inferior de la viga / estructura existente"],

  // Ghost hints — one per silhouette
  ["shotHint_stair_up", "Stand at the bottom. Whole stair in frame.", "Fique embaixo. Escada inteira no quadro.", "Párese abajo. Toda la escalera en el cuadro."],
  ["shotHint_stair_down", "Stand at the top, looking down.", "Fique em cima, olhando para baixo.", "Párese arriba, mirando hacia abajo."],
  ["shotHint_side", "Square to the side, top to bottom.", "De frente para a lateral, de cima a baixo.", "De frente al costado, de arriba a abajo."],
  ["shotHint_closeup", "Fill the frame. Tape readable.", "Preencha o quadro. Trena legível.", "Llene el cuadro. Cinta legible."],
  ["shotHint_rail", "The whole rail, posts and ends.", "O corrimão inteiro, postes e pontas.", "Toda la baranda, postes y extremos."],
  ["shotHint_opening", "Square on, all four edges in frame.", "De frente, as quatro bordas no quadro.", "De frente, los cuatro bordes en el cuadro."],
  ["shotHint_jamb", "Top to bottom, tape along it.", "De cima a baixo, trena ao lado.", "De arriba a abajo, cinta al lado."],
  ["shotHint_sill", "Level with it, tape across.", "Na altura dela, trena atravessada.", "A su altura, cinta de lado a lado."],
  ["shotHint_beam", "Look up. Flange and connection in frame.", "Olhe para cima. Aba e ligação no quadro.", "Mire hacia arriba. Ala y conexión en el cuadro."],
  ["shotHint_bearing", "Where it sits. Tape on the bearing.", "Onde apoia. Trena no apoio.", "Donde apoya. Cinta en el apoyo."],
  ["shotHint_slab", "Edge on. Show the thickness.", "De lado. Mostre a espessura.", "De canto. Muestre el espesor."],
  ["shotHint_gate", "Both posts and the ground between.", "Os dois postes e o chão entre eles.", "Ambos postes y el suelo entre ellos."],
  ["shotHint_post", "Post and footing, top to ground.", "Poste e sapata, do topo ao chão.", "Poste y zapata, de arriba al suelo."],
  ["shotHint_grade", "Low and level. Show the slope.", "Baixo e nivelado. Mostre a inclinação.", "Bajo y nivelado. Muestre la pendiente."],
  ["shotHint_wide", "Step back. Get everything in.", "Afaste-se. Pegue tudo.", "Aléjese. Capture todo."],
  ["shotHint_overhead", "From above, looking straight down.", "De cima, olhando direto para baixo.", "Desde arriba, mirando directo hacia abajo."],
  ["shotHint_ladder", "From the ground, the whole structure.", "Do chão, a estrutura inteira.", "Desde el suelo, toda la estructura."],

  // Screen
  ["shotsTitle", "Shot list", "Lista de fotos", "Lista de fotos"],
  ["shotsOf", "{n} of {t} shots", "{n} de {t} fotos", "{n} de {t} fotos"],
  ["shotsReqLeft", "{n} required left", "Faltam {n} obrigatórias", "Faltan {n} obligatorias"],
  ["shotsAllReq", "Required shots done", "Fotos obrigatórias prontas", "Fotos obligatorias listas"],
  ["shotRequired", "Required", "Obrigatória", "Obligatoria"],
  ["shotRecommended", "Recommended", "Recomendada", "Recomendada"],
  ["shotTape", "Tape in frame", "Trena no quadro", "Cinta en el cuadro"],
  ["shotStart", "Take next shot", "Tirar a próxima foto", "Tomar la siguiente foto"],
  ["shotShutter", "Take photo", "Tirar foto", "Tomar foto"],
  ["shotLibrary", "Library", "Galeria", "Galería"],
  ["shotOpenCamera", "Open camera", "Abrir câmera", "Abrir cámara"],
  ["shotOfShots", "Shot {i} of {t}", "Foto {i} de {t}", "Foto {i} de {t}"],
  ["shotSave", "Save", "Salvar", "Guardar"],
  ["shotSaveNext", "Save · Next", "Salvar · Próxima", "Guardar · Siguiente"],
  ["shotClose", "Close", "Fechar", "Cerrar"],
  ["shotNext", "Next shot", "Próxima foto", "Siguiente foto"],
  ["shotMarkUp", "Mark up", "Marcar", "Marcar"],
  ["dimTool", "Dimension", "Cota", "Cota"],
  ["dimPrompt", "Type the measurement", "Digite a medida", "Escriba la medida"],
  ["dimAdd", "Add", "Adicionar", "Agregar"],
  ["shotLogTitle", "Photo log", "Registro de fotos", "Registro de fotos"],
  ["shotMissing", "Missing", "Faltando", "Falta"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

export const SHOTS_STR = { en: build(1), pt: build(2), es: build(3) };
export const SHOTS_KEYS = ROWS.map((r) => r[0]);
