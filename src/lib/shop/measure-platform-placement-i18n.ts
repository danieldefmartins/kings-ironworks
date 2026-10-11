type Lang = 'en' | 'pt' | 'es';
const T = {
  en: {
    title: 'Stairs on the platform',
    stairsIn: 'Stairs in', stairsOut: 'Stairs out',
    left: 'Left', center: 'Center', right: 'Right', custom: 'Measured',
    from: 'Measured from', leftEdge: 'Left edge', rightEdge: 'Right edge',
    offset: 'Edge to stairs',
    flushLeft: 'Flush left', flushRight: 'Flush right', centered: 'Centered',
    fromLeft: (v: string) => `${v} from left edge`, fromRight: (v: string) => `${v} from right edge`,
    notSet: 'not measured',
    overhang: (by: string, off: string, w: string, edge: string) => `Hangs off ${by}: ${off} + ${w} stairs > ${edge} platform`,
    overlap: 'The two flights overlap on this platform',
    up: 'UP', platform: 'Platform', drag: 'Drag stairs along the edge',
    diagram: 'Platform top view',
  },
  pt: {
    title: 'Escada no patamar',
    stairsIn: 'Chegada da escada', stairsOut: 'Saída da escada',
    left: 'Esquerda', center: 'Centro', right: 'Direita', custom: 'Medido',
    from: 'Medido a partir da', leftEdge: 'Borda esquerda', rightEdge: 'Borda direita',
    offset: 'Borda até a escada',
    flushLeft: 'Rente à esquerda', flushRight: 'Rente à direita', centered: 'Centralizada',
    fromLeft: (v: string) => `${v} da borda esquerda`, fromRight: (v: string) => `${v} da borda direita`,
    notSet: 'sem medida',
    overhang: (by: string, off: string, w: string, edge: string) => `Sai para fora ${by}: ${off} + ${w} de escada > ${edge} de patamar`,
    overlap: 'Os dois lances se sobrepõem neste patamar',
    up: 'SOBE', platform: 'Patamar', drag: 'Arraste a escada ao longo da borda',
    diagram: 'Vista de cima do patamar',
  },
  es: {
    title: 'Escalera en el descanso',
    stairsIn: 'Llegada de la escalera', stairsOut: 'Salida de la escalera',
    left: 'Izquierda', center: 'Centro', right: 'Derecha', custom: 'Medido',
    from: 'Medido desde el', leftEdge: 'Borde izquierdo', rightEdge: 'Borde derecho',
    offset: 'Borde a escalera',
    flushLeft: 'Al ras a la izquierda', flushRight: 'Al ras a la derecha', centered: 'Centrada',
    fromLeft: (v: string) => `${v} del borde izquierdo`, fromRight: (v: string) => `${v} del borde derecho`,
    notSet: 'sin medir',
    overhang: (by: string, off: string, w: string, edge: string) => `Sobresale ${by}: ${off} + ${w} de escalera > ${edge} de descanso`,
    overlap: 'Los dos tramos se superponen en este descanso',
    up: 'SUBE', platform: 'Descanso', drag: 'Arrastre la escalera a lo largo del borde',
    diagram: 'Vista superior del descanso',
  },
} as const;
export type PlacementText = (typeof T)['en'];
export function placementText(lang: string | null | undefined): PlacementText {
  return T[(lang === 'pt' || lang === 'es' ? lang : 'en') as Lang] as PlacementText;
}
