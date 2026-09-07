import type { MeasureData } from './measure';
import { parseMeas } from './measure-parse';

export type Point3 = { x: number; y: number; z: number };
export interface MeasuredTread {
  segIdx: number; stepIdx: number | null; number: number | null;
  x: number; z: number; rise: number; run: number; width: number;
  riseLabel: string; runLabel: string; widthLabel: string; provisional: boolean;
  /** Near left, far left, far right, near right, looking along travel. */
  corners: [Point3, Point3, Point3, Point3];
}
const value = (s: string | undefined, zero = false) => {
  const n = parseMeas(s);
  return n !== null && Number.isFinite(n) && (zero ? n >= 0 : n > 0) ? n : null;
};
const rad = (n: number) => n * Math.PI / 180;
type Pose = Point3 & { heading: number };
const point = (p: Pose, x: number, y: number, z = 0): Point3 => ({
  x: p.x + x * Math.cos(p.heading) - y * Math.sin(p.heading),
  y: p.y + x * Math.sin(p.heading) + y * Math.cos(p.heading), z: p.z + z,
});
const poseAt = (p: Pose, x: number, y: number, z = 0, turn = 0): Pose => ({ ...point(p,x,y,z), heading: p.heading + turn });

/** Slope is degrees or inches per foot; free-text that cannot be resolved stays provisional. */
export function landingGrade(s: string): number | null {
  if (!s.trim()) return 0;
  const perFoot = s.match(/^(.*?)\s*\/\s*(?:ft|foot|12\s*["″]?)$/i);
  const n = value(perFoot ? perFoot[1] : s, true);
  if (n === null || (!perFoot && n >= 90)) return null;
  return perFoot ? n / 12 : Math.tan(rad(n));
}

/** Inch-based assembly coordinates. All defaults are display-only. */
export function stairGeometry(data: MeasureData, focusSeg?: number) {
  const treads: MeasuredTread[] = [];
  let pose: Pose = { x: 0, y: 0, z: 0, heading: 0 };
  let landing: { pose: Pose; run: number; width: number; gradeX: number; gradeY: number } | null = null;
  let number = 0, runTotal = 0;
  const widthOf = (index: number) => {
    const s = data.segments[index];
    return s && 'width' in s ? value(s.width) ?? 36 : 36;
  };
  data.segments.forEach((segment, segIdx) => {
    if (focusSeg !== undefined && segIdx !== focusSeg) {
      if (segment.kind === 'flight') number += segment.steps.length;
      return;
    }
    if (segment.kind === 'flight') {
      const width = value(segment.width);
      let branchProvisional = false;
      if (segment.branch && focusSeg === undefined) {
        if (landing) {
          const left = segment.branch === 'left';
          const across = left ? 0 : landing.width;
          const offset=value(segment.branchOffset,true);
          branchProvisional=offset===null || (offset+(width??36)>landing.run);
          const along = offset===null ? (landing.run + (left ? -1 : 1) * (width ?? 36)) / 2 : left?offset:landing.run-offset;
          pose = poseAt(landing.pose, along, across, landing.gradeX * along + landing.gradeY * across, left ? -Math.PI / 2 : Math.PI / 2);
        } else branchProvisional = true;
      }
      segment.steps.forEach((step, stepIdx) => {
        const rise = value(step.rise), run = value(step.run), w = width ?? 36, r = rise ?? 7, d = run ?? 11;
        let provisional = rise === null || run === null || width === null || branchProvisional;
        let corners: MeasuredTread['corners'];
        if (step.winder) {
          const angle = value(step.turnDeg), inside = value(step.runIn, true), outside = value(step.runOut);
          const validAngle = angle !== null && angle < 180;
          const turn = rad(validAngle ? angle : 30);
          const radius = (inside ?? 0) / (2 * Math.sin(turn / 2));
          const left = step.turnDirection !== 'right';
          const pivotY = left ? -radius : w + radius;
          const signed = left ? -turn : turn;
          const end = (y: number) => point(pose, -(y-pivotY)*Math.sin(signed), pivotY+(y-pivotY)*Math.cos(signed), r);
          corners = [point(pose,0,0,r), end(0), end(w), point(pose,0,w,r)];
          const walk = value(data.datums.walkline, true);
          const predictedOutside = 2 * (radius+w) * Math.sin(turn/2);
          const predictedRun = 2 * (radius+(walk ?? w/2)) * Math.sin(turn/2);
          provisional ||= !validAngle || inside === null || outside === null || !step.turnDirection || walk === null || walk > w
            || Math.abs(predictedOutside-(outside ?? 0)) > 0.125 || Math.abs(predictedRun-d) > 0.125;
          pose = { ...corners[1], heading: pose.heading + signed };
        } else {
          corners = [point(pose,0,0,r),point(pose,d,0,r),point(pose,d,w,r),point(pose,0,w,r)];
          pose = poseAt(pose,d,0,r);
        }
        treads.push({segIdx,stepIdx,number:++number,x:corners[0].x,z:corners[0].z,rise:r,run:d,width:w,corners,
          riseLabel:rise===null?'?':step.rise,runLabel:run===null?'?':step.run,widthLabel:width===null?'?':segment.width,provisional});
        runTotal += d;
      });
    } else if (segment.kind === 'platform') {
      const run=value(segment.length), width=value(segment.depth), d=run??36, w=width??36;
      const grade=landingGrade(segment.slope);
      const direction=segment.slopeDir;
      const knownDirection=['Left','Right','Toward stairs','Away from stairs'].includes(direction);
      const gx=direction==='Toward stairs' ? grade??0 : direction==='Away from stairs' ? -(grade??0) : 0;
      const gy=direction==='Left' ? grade??0 : direction==='Right' ? -(grade??0) : 0;
      const corners: MeasuredTread['corners']=[point(pose,0,0),point(pose,d,0,gx*d),point(pose,d,w,gx*d+gy*w),point(pose,0,w,gy*w)];
      treads.push({segIdx,stepIdx:null,number:null,x:pose.x,z:pose.z,rise:0,run:d,width:w,corners,
        riseLabel:'',runLabel:run===null?'?':segment.length,widthLabel:width===null?'?':segment.depth,
        provisional:run===null||width===null||!segment.slope.trim()||grade===null||(grade!==0&&!knownDirection)});
      landing={pose:{...pose},run:d,width:w,gradeX:gx,gradeY:gy};
      const nextWidth=widthOf(segIdx+1);
      const offset=value(segment.exitOffset,true);
      const x=segment.turn==='left' ? (d-nextWidth)/2 : segment.turn==='right' ? (d+nextWidth)/2 : segment.turn==='u' ? 0 : d;
      const y=segment.turn==='left' ? 0 : segment.turn==='right'||segment.turn==='u' ? w : (w-nextWidth)/2;
      const turn=segment.turn==='left' ? -Math.PI/2 : segment.turn==='right' ? Math.PI/2 : segment.turn==='u' ? Math.PI : 0;
      const ox=offset===null?x:segment.turn==='left'?offset:segment.turn==='right'?d-offset:x;
      const oy=offset===null?y:segment.turn==='u'?w-offset:segment.turn==='none'?offset:y;
      const next=data.segments[segIdx+1];
      if(next && !(next.kind==='flight'&&next.branch) && (offset===null || offset+nextWidth>(segment.turn==='left'||segment.turn==='right'?d:w)))treads[treads.length-1].provisional=true;
      pose=poseAt(pose,ox,oy,gx*ox+gy*oy,turn);runTotal+=d;
    } else if (segment.kind === 'ramp') {
      const run=value(segment.runH), rise=value(segment.rise,true), width=value(segment.width), d=run??48, r=rise??0,w=width??36;
      const corners: MeasuredTread['corners']=[point(pose,0,0),point(pose,d,0,r),point(pose,d,w,r),point(pose,0,w)];
      treads.push({segIdx,stepIdx:null,number:null,x:pose.x,z:pose.z,rise:r,run:d,width:w,corners,riseLabel:rise===null?'?':segment.rise,runLabel:run===null?'?':segment.runH,widthLabel:width===null?'?':segment.width,provisional:run===null||rise===null||width===null});
      pose=poseAt(pose,d,0,r);runTotal+=d;
    } else if (segment.kind === 'curve') {
      const radius=value(segment.radius), width=value(segment.width), angle=value(segment.sweepDeg), rise=value(segment.rise,true);
      const R=radius??48,w=width??36, a=rad(angle!==null&&angle<=360?angle:90), count=Math.max(4,Math.ceil(a/(Math.PI/18)));
      const left=segment.direction==='left', pivotY=left?w/2-R:w/2+R, sign=left?-1:1;
      const at=(t:number,y:number)=>point(pose,-(y-pivotY)*Math.sin(sign*t),pivotY+(y-pivotY)*Math.cos(sign*t),(rise??0)*t/a);
      for(let i=0;i<count;i++) {
        const t=i*a/count,u=(i+1)*a/count,corners:MeasuredTread['corners']=[at(t,0),at(u,0),at(u,w),at(t,w)];
        treads.push({segIdx,stepIdx:null,number:null,x:corners[0].x,z:corners[0].z,rise:0,run:R*a/count,width:w,corners,riseLabel:'',runLabel:i===0?segment.arc:'',widthLabel:i===0?segment.width:'',provisional:radius===null||width===null||R<=w/2||angle===null||angle>360||(!!segment.rise.trim()&&rise===null)});
      }
      pose={...at(a,0),heading:pose.heading+sign*a};runTotal+=R*a;
    }
  });
  if(!treads.length)return null;
  return {treads,run:runTotal,rise:Math.max(...treads.flatMap(t=>t.corners.map(p=>p.z))),provisional:treads.some(t=>t.provisional)};
}

/** Bilinear position on the measured surface, including crossfall and winders. */
export function surfacePoint(t: MeasuredTread, along: number, across: number): Point3 {
  const [a,b,c,d]=t.corners, u=along/t.run,v=across/t.width;
  const coord=(k:keyof Point3)=>(1-v)*((1-u)*a[k]+u*b[k])+v*((1-u)*d[k]+u*c[k]);
  return {x:coord('x'),y:coord('y'),z:coord('z')};
}
