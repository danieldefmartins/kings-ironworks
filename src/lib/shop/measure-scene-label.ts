import type {MeasureScene} from './measure-scene';
/** Translate generated scene labels only; site/rail names are user data. */
export function sceneLabel(item: MeasureScene['meshes'][number] | MeasureScene['lines'][number], lang: string): string {
 const words = lang==='pt'?{Step:'Degrau',Segment:'Trecho',Connection:'Ligação',Railing:'Guarda-corpo',left:'esquerda',right:'direita'}:lang==='es'?{Step:'Peldaño',Segment:'Tramo',Connection:'Conexión',Railing:'Baranda',left:'izquierda',right:'derecha'}:null;
 if(!words || item.entity.siteId || item.entity.railId) return item.label;
 return item.label.replace(/^(Step|Segment|Connection|Railing)(?= \d)/,word=>words[word as 'Step']).replace(/\b(left|right)\b/g,word=>words[word as 'left']).replace(' wall boundary',lang==='pt'?' · limite da parede':' · límite de pared').replace('support connection',lang==='pt'?'ligação ao apoio':'conexión al soporte');
}
