// Short names the sketch writes on its dimension lines, and the words of the
// stair-angle approve / modify row. EN / PT (Brazil) / ES.
import type { DimKind } from './measure-dims';
import { OPEN_DIM_NAMES } from './measure-open-i18n';
import { STRUCT_DIM_NAMES } from './measure-dims-struct-i18n';
import { RUN_DIM_NAMES } from './measure-dims-runs-i18n';

type Row = [en: string, pt: string, es: string];
const pick = (lang: string, r: Row) => (lang === 'pt' ? r[1] : lang === 'es' ? r[2] : r[0]);

const NAMES: Record<DimKind, Row> = {
  f2f: ['Floor to floor', 'Piso a piso', 'Piso a piso'],
  totalRun: ['Total run', 'Avanço total', 'Avance total'],
  rake: ['Rake', 'Inclinado', 'Inclinado'],
  flightRise: ['Rise', 'Altura', 'Altura'],
  flightRun: ['Run', 'Avanço', 'Avance'],
  flightRake: ['Rake', 'Inclinado', 'Inclinado'],
  width: ['Width', 'Largura', 'Ancho'],
  angle: ['Angle', 'Ângulo', 'Ángulo'],
  platLength: ['Length', 'Comprimento', 'Largo'],
  platDepth: ['Depth', 'Profundidade', 'Fondo'],
  platDiag: ['Diagonal', 'Diagonal', 'Diagonal'],
  entryRise: ['Step up', 'Degrau', 'Escalón'],
  jointGap: ['Gap', 'Folga', 'Holgura'],
  jointAngle: ['Angle change', 'Mudança de ângulo', 'Cambio de ángulo'],
  railHeight: ['Rail height', 'Altura do corrimão', 'Altura del pasamanos'],
  span: ['Span', 'Vão', 'Vano'],
};

/** Short name for a dimension kind; '' for a kind with no name here (the descriptor's own label is used). */
export function dimName(lang: string, kind: DimKind | (string & {})): string {
  const r = (NAMES as Record<string, Row>)[kind] ?? OPEN_DIM_NAMES[kind] ?? STRUCT_DIM_NAMES[kind] ?? RUN_DIM_NAMES[kind];
  return r ? pick(lang, r) : '';
}

const WORDS: Record<string, Row> = {
  dims: ['Dimensions', 'Cotas', 'Cotas'],
  calculated: ['Calculated', 'Calculado', 'Calculado'],
  approve: ['Approve', 'Aprovar', 'Aprobar'],
  modify: ['Modify', 'Alterar', 'Modificar'],
  approved: ['Approved', 'Aprovado', 'Aprobado'],
  measured: ['Measured', 'Medido', 'Medido'],
  useCalc: ['Use calculated', 'Usar calculado', 'Usar calculado'],
  vsCalc: ['vs calculated', 'vs calculado', 'vs calculado'],
  waiting: ['Fill in the steps to calculate the angle', 'Preencha os degraus para calcular o ângulo', 'Complete los escalones para calcular el ángulo'],
  approvedA11y: ['Calculated angle approved', 'Ângulo calculado aprovado', 'Ángulo calculado aprobado'],
};

export function dimWord(lang: string, key: keyof typeof WORDS | string): string {
  const r = WORDS[key];
  return r ? pick(lang, r) : key;
}
