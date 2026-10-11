import {describe,it,expect} from 'vitest';
import {DETAIL_TOPICS,detailStagesForTopic,detailTopicForStage,detailTopicLabel,gapDetailTarget} from './measure-workspace';
describe('contextual measurement details',()=>{
 it('retains every field stage exactly once without a sequential wizard',()=>{
 const all=DETAIL_TOPICS.flatMap(detailStagesForTopic);
 expect([...all].sort()).toEqual(['setup','posts','level','steps','locations','specs','photos','review'].sort());
 for(const topic of DETAIL_TOPICS)for(const stage of detailStagesForTopic(topic))expect(detailTopicForStage(stage)).toBe(topic);
 });
 it.each([
 ['joint_method','connections','locations'],['landing_transition','connections','locations'],['flight_rake','structure','steps'],['flight_width','structure','steps'],['flight_angle','connections','locations'],['landing_depth','survey','level'],['mat_toprail','specifications','specs'],['post_photo','photos','photos'],['term_photo','photos','photos'],['gate_power','specifications','specs'],['fence_seg_length','structure','steps'],['bal_anchor','connections','locations'],['fire_condition','review','review'],['well_wall_height','connections','locations'],['floor_change','project','setup'],['rail_height','connections','posts'],
 ])('routes %s to its editable card', (key,topic,stage)=>expect(gapDetailTarget({key,flight:3})).toEqual({topic,stage,flight:3}));
 it('retains drawn post routing and leaves documentation in Photos',()=>{
 expect(gapDetailTarget({key:'post_mount'},{drawnPosts:true})).toEqual({topic:'structure',stage:'steps'});
 expect(gapDetailTarget({key:'post_photo'},{drawnPosts:true}).topic).toBe('photos');
 });
 it('localizes every category',()=>{for(const topic of DETAIL_TOPICS)for(const lang of ['en','pt','es'])expect(detailTopicLabel(topic,lang)).toBeTruthy();});
});
