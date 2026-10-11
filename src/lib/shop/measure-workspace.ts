/** Contextual categories over existing fields; no data migration or duplicated models. */
export type LegacyMeasureStage='setup'|'posts'|'level'|'steps'|'locations'|'specs'|'photos'|'review';
export type ProDetailsTopic='project'|'structure'|'survey'|'connections'|'specifications'|'photos'|'review';
export const DETAIL_TOPICS:readonly ProDetailsTopic[]=['project','structure','survey','connections','specifications','photos','review'];
const stages:Record<ProDetailsTopic,readonly LegacyMeasureStage[]>={project:['setup'],structure:['steps'],survey:['level'],connections:['posts','locations'],specifications:['specs'],photos:['photos'],review:['review']};
export function detailStagesForTopic(topic:ProDetailsTopic):readonly LegacyMeasureStage[]{return stages[topic];}
export function detailTopicForStage(stage:LegacyMeasureStage):ProDetailsTopic{return DETAIL_TOPICS.find(topic=>stages[topic].includes(stage))!;}
export function detailTopicLabel(topic:ProDetailsTopic,lang:string):string{
 const labels:Record<ProDetailsTopic,readonly [string,string,string]>={project:['Project settings','Configurações do projeto','Ajustes del proyecto'],structure:['Structure details','Detalhes da estrutura','Detalles de estructura'],survey:['Landings & level checks','Patamares e nivelamento','Descansos y nivelación'],connections:['Railing & connections','Corrimãos e ligações','Barandillas y conexiones'],specifications:['Build specification','Especificação de fabricação','Especificación de fabricación'],photos:['Photos','Fotos','Fotos'],review:['Shop review','Revisão da oficina','Revisión del taller']};
 return labels[topic][lang==='pt'?1:lang==='es'?2:0];
}
export function legacyStageForGap(key:string):LegacyMeasureStage {
    if (key.startsWith("sub_")) {
      const g = key.slice(4);
      if (g === "term" || g === "bracket") return "posts";
      if (g === "gate") return "specs";
      if (g === "fence" || g === "well") return "setup";
      if (g === "fire") return "steps";
      return "locations";
    }
    if (key === "orientation" || key === "floor_change" || key.endsWith("_adjustment")) return "setup";
    if (key.startsWith("gate_")) return key === "gate_opener" || key === "gate_power" || key === "gate_safety" ? "specs" : "setup";
    if (key.startsWith("fence_")) return key.startsWith("fence_seg") ? "steps" : "setup";
    if (key.startsWith("bal_")) return key.includes("anchor") || key.includes("embed") || key.includes("edge_distance") || key.includes("slab") ? "locations" : "setup";
    if (key.startsWith("fire_")) {
      if (key.startsWith("fire_stair") || key === "fire_floor_to_floor") return "steps";
      if (key.startsWith("fire_ladder")) return "specs";
      if (key.includes("rating") || key.includes("condition") || key === "fire_load_test" || key === "fire_repair_scope") return "review";
      return "setup";
    }
    if (key.startsWith("well_")) {
      if (key.startsWith("well_grate") || key.startsWith("well_ladder") || key.startsWith("well_gate")) return "specs";
      if (key.startsWith("well_wall") || key === "well_post_to_wall" || key === "well_band_fields") return "locations";
      return "setup";
    }
    if (key === "photo" || key === "post_photo" || key === "term_photo") return "photos";
    // A gap has to name the step that can actually answer it. Joints are only
    // editable on the joints step, and a flight's rake sits on its step card —
    // sending either to a step that shows neither is a dead end.
    if (key.startsWith("joint_") || key === "landing_transition") return "locations";
    if (key === "flight_width" || key === "flight_rake") return "steps";
    if (key === "flight_angle") return "locations";
    if (key.startsWith("post")) return "locations";
    if (key.startsWith("span") || key.startsWith("term") ||
        ["rail_height", "returns", "extensions", "brackets"].includes(key)) return "posts";
    if (key.startsWith("mat_") || key === "splices" || key === "max_piece") return "specs";
    if (key === "steps" || key === "winder") return "steps";
    if (key.includes("angle") || key.includes("rake")) return "locations";
    if (key.startsWith("landing_")) return "level";
    return "steps";
  }
export function gapDetailTarget(gap:{key:string;flight?:number},options?:{drawnPosts?:boolean}){
 // Posts attached to drawn runs are edited in the structure card, unlike native flight posts.
 const stage:LegacyMeasureStage=options?.drawnPosts&&gap.key.startsWith('post')&&gap.key!=='post_photo'?'steps':legacyStageForGap(gap.key);
 return {topic:detailTopicForStage(stage),stage,...(gap.flight===undefined?{}:{flight:gap.flight})};
}
