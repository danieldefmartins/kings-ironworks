// Shop-floor localization. Each worker has a lang (en | pt | es).
export type Lang = "en" | "pt" | "es";

export function asLang(l: string | undefined | null): Lang {
  return l === "pt" || l === "es" ? l : "en";
}

type Dict = Record<string, string>;

const STR: Record<Lang, Dict> = {
  en: {
    shopFloor: "Shop Floor",
    whoWorking: "Who's working?",
    selectName: "Select your name…",
    enterPin: "Enter PIN",
    clear: "Clear",
    wrongPin: "Wrong PIN",
    signOut: "Sign out",
    jobs: "Jobs",
    activeJobs: "Active Jobs",
    noJobs: "No active jobs. Closed deals will appear here.",
    finish: "Finish",
    due: "Due",
    overdue: "overdue",
    noDue: "No due date",
    cutProgress: "Cut",
    stage: "Stage",
    cutList: "Cut List",
    materialPull: "Material Pull",
    qcTitle: "QC / Precision Sign-off",
    photos: "Photos",
    stageNote: "Tap a stage to move the job. Every move is logged with your name.",
    cutNote: "Tap status to cycle: Pending → Cut → Welded.",
    done: "done",
    pulled: "pulled",
    checked: "checked",
    qty: "Qty",
    length: "Length",
    tag: "Tag",
    noCutList: "No cut list yet.",
    noMaterials: "No material list.",
    noQc: "No QC checklist.",
    measured: "Measured…",
    pass: "Pass",
    fail: "Fail",
    target: "Target",
    qcNote:
      "Enter the measured value, then Pass or Fail. Sign-off records your name and time.",
    stPending: "Pending",
    stCut: "Cut ✓",
    stWelded: "Welded ✓",
    photoIntro: "Pin a photo to a category, then take or choose a picture.",
    photoCustom: "…or type a custom location (e.g. Location 6, Front porch)",
    addPhoto: "Add Photo",
    uploading: "Uploading…",
    noPhotos: "No photos yet. Add the first one above.",
    tapClose: "Tap to close",
    todayFloor: "Today on the floor",
    jobLabel: "Job",
    estLabel: "Est",
  },
  pt: {
    shopFloor: "Oficina",
    whoWorking: "Quem está trabalhando?",
    selectName: "Selecione seu nome…",
    enterPin: "Digite o PIN",
    clear: "Limpar",
    wrongPin: "PIN incorreto",
    signOut: "Sair",
    jobs: "Obras",
    activeJobs: "Obras Ativas",
    noJobs: "Nenhuma obra ativa. Negócios fechados aparecerão aqui.",
    finish: "Acabamento",
    due: "Prazo",
    overdue: "atrasado",
    noDue: "Sem prazo",
    cutProgress: "Corte",
    stage: "Etapa",
    cutList: "Lista de Corte",
    materialPull: "Separação de Material",
    qcTitle: "QC / Aprovação de Precisão",
    photos: "Fotos",
    stageNote:
      "Toque em uma etapa para mover a obra. Cada mudança é registrada com seu nome.",
    cutNote: "Toque no status: Pendente → Cortado → Soldado.",
    done: "feitos",
    pulled: "separados",
    checked: "verificados",
    qty: "Qtd",
    length: "Comprimento",
    tag: "Etiq.",
    noCutList: "Nenhuma lista de corte ainda.",
    noMaterials: "Sem lista de material.",
    noQc: "Sem checklist de QC.",
    measured: "Medido…",
    pass: "Aprovar",
    fail: "Reprovar",
    target: "Alvo",
    qcNote:
      "Insira o valor medido, depois Aprovar ou Reprovar. A aprovação registra seu nome e horário.",
    stPending: "Pendente",
    stCut: "Cortado ✓",
    stWelded: "Soldado ✓",
    photoIntro: "Marque uma foto com uma categoria, depois tire ou escolha uma imagem.",
    photoCustom: "…ou digite um local personalizado (ex.: Local 6, Varanda)",
    addPhoto: "Adicionar Foto",
    uploading: "Enviando…",
    noPhotos: "Nenhuma foto ainda. Adicione a primeira acima.",
    tapClose: "Toque para fechar",
    todayFloor: "Hoje na oficina",
    jobLabel: "Obra",
    estLabel: "Orç.",
  },
  es: {
    shopFloor: "Taller",
    whoWorking: "¿Quién está trabajando?",
    selectName: "Seleccione su nombre…",
    enterPin: "Ingrese el PIN",
    clear: "Borrar",
    wrongPin: "PIN incorrecto",
    signOut: "Salir",
    jobs: "Trabajos",
    activeJobs: "Trabajos Activos",
    noJobs: "No hay trabajos activos. Los cerrados aparecerán aquí.",
    finish: "Acabado",
    due: "Entrega",
    overdue: "atrasado",
    noDue: "Sin fecha",
    cutProgress: "Corte",
    stage: "Etapa",
    cutList: "Lista de Corte",
    materialPull: "Preparación de Material",
    qcTitle: "QC / Aprobación de Precisión",
    photos: "Fotos",
    stageNote:
      "Toque una etapa para mover el trabajo. Cada cambio se registra con su nombre.",
    cutNote: "Toque el estado: Pendiente → Cortado → Soldado.",
    done: "hechos",
    pulled: "preparados",
    checked: "verificados",
    qty: "Cant.",
    length: "Largo",
    tag: "Etiq.",
    noCutList: "Aún no hay lista de corte.",
    noMaterials: "Sin lista de material.",
    noQc: "Sin lista de QC.",
    measured: "Medido…",
    pass: "Aprobar",
    fail: "Rechazar",
    target: "Objetivo",
    qcNote:
      "Ingrese el valor medido, luego Aprobar o Rechazar. La aprobación registra su nombre y hora.",
    stPending: "Pendiente",
    stCut: "Cortado ✓",
    stWelded: "Soldado ✓",
    photoIntro: "Asigne una categoría a la foto, luego tome o elija una imagen.",
    photoCustom: "…o escriba una ubicación (ej.: Ubicación 6, Porche)",
    addPhoto: "Agregar Foto",
    uploading: "Subiendo…",
    noPhotos: "Aún no hay fotos. Agregue la primera arriba.",
    tapClose: "Toque para cerrar",
    todayFloor: "Hoy en el taller",
    jobLabel: "Trabajo",
    estLabel: "Pres.",
  },
};

export function t(
  lang: string | undefined | null,
  key: string,
  vars?: Record<string, string | number>
): string {
  const l = asLang(lang);
  let s = STR[l][key] ?? STR.en[key] ?? key;
  if (vars) {
    for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
  }
  return s;
}

const STAGE_MAP: Record<Lang, Record<string, string>> = {
  en: {},
  pt: {
    Awarded: "Fechado",
    "Shop Drawings": "Desenhos",
    Material: "Material",
    Cut: "Corte",
    "Fit/Weld": "Montagem/Solda",
    Finish: "Acabamento",
    QC: "QC",
    Install: "Instalação",
    Done: "Concluído",
  },
  es: {
    Awarded: "Adjudicado",
    "Shop Drawings": "Planos",
    Material: "Material",
    Cut: "Corte",
    "Fit/Weld": "Montaje/Soldadura",
    Finish: "Acabado",
    QC: "QC",
    Install: "Instalación",
    Done: "Terminado",
  },
};
export function stageLabel(lang: string | undefined, stage: string): string {
  const l = asLang(lang);
  return STAGE_MAP[l][stage] || stage;
}

const CAT_MAP: Record<Lang, Record<string, string>> = {
  en: {},
  pt: {
    Design: "Projeto",
    Measurements: "Medidas",
    Existing: "Existente",
    Inspiration: "Inspiração",
    "Approved Estimate": "Orçamento Aprovado",
    Installation: "Instalação",
    Location: "Local",
    Other: "Outro",
  },
  es: {
    Design: "Diseño",
    Measurements: "Medidas",
    Existing: "Existente",
    Inspiration: "Inspiración",
    "Approved Estimate": "Presupuesto Aprobado",
    Installation: "Instalación",
    Location: "Ubicación",
    Other: "Otro",
  },
};
export function categoryLabel(lang: string | undefined, cat: string): string {
  const l = asLang(lang);
  if (l === "en") return cat;
  const m = CAT_MAP[l];
  if (m[cat]) return m[cat];
  // "Installation — Location N"
  const match = cat.match(/^Installation\s*—\s*Location\s*(\d+)$/i);
  if (match) return `${m.Installation} — ${m.Location} ${match[1]}`;
  return cat; // custom free-text stays as typed
}

export const QUOTES: Record<Lang, string[]> = {
  en: [
    "Build it like your name is on it — because it is.",
    "We don't outsource quality. Every piece leaves by our hands.",
    "Measure twice, cut once. Pride shows in every weld.",
    "Strong steel, stronger team. Let's build something that lasts.",
    "Precision today saves rework tomorrow.",
    "Tight welds, clean cuts, no shortcuts.",
    "The best ironwork in New England starts on this floor.",
    "Sparks fly, standards don't drop.",
    "Good enough isn't. Make it King quality.",
    "Every job is a King job. Make it count.",
    "Respect the steel, respect the crew, respect the craft.",
    "Heavy lifts, higher standards. We finish strong.",
  ],
  pt: [
    "Construa como se seu nome estivesse nela — porque está.",
    "Não terceirizamos qualidade. Cada peça sai pelas nossas mãos.",
    "Meça duas vezes, corte uma. O orgulho aparece em cada solda.",
    "Aço forte, equipe mais forte. Vamos construir algo que dure.",
    "Precisão hoje evita retrabalho amanhã.",
    "Soldas firmes, cortes limpos, sem atalhos.",
    "O melhor trabalho em ferro da Nova Inglaterra começa neste chão.",
    "As faíscas voam, os padrões não caem.",
    "‘Mais ou menos’ não serve. Faça com qualidade King.",
    "Toda obra é uma obra King. Faça valer.",
    "Respeite o aço, respeite a equipe, respeite o ofício.",
    "Cargas pesadas, padrões altos. Terminamos forte.",
  ],
  es: [
    "Constrúyelo como si llevara tu nombre — porque lo lleva.",
    "No subcontratamos la calidad. Cada pieza sale de nuestras manos.",
    "Mide dos veces, corta una. El orgullo se ve en cada soldadura.",
    "Acero fuerte, equipo más fuerte. Construyamos algo que dure.",
    "La precisión de hoy evita el retrabajo de mañana.",
    "Soldaduras firmes, cortes limpios, sin atajos.",
    "El mejor trabajo en hierro de Nueva Inglaterra empieza en este taller.",
    "Vuelan las chispas, no bajan los estándares.",
    "‘Más o menos’ no basta. Hazlo con calidad King.",
    "Cada trabajo es un trabajo King. Que valga la pena.",
    "Respeta el acero, respeta al equipo, respeta el oficio.",
    "Cargas pesadas, estándares altos. Terminamos fuerte.",
  ],
};
