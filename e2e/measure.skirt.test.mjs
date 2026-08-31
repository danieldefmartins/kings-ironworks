// The column-trim trap, with the numbers from the shop floor: a 3/4" trim at
// the base of an existing column, and a picket set 4" off the trim face.
const BASE=process.env.SHOP_BASE_URL||"http://localhost:3457", JOB=process.env.SHOP_JOB_ID;
const W=process.env.SHOP_WORKER_ID, PIN=process.env.SHOP_PIN;
if(!JOB||!W||!PIN){console.error("Set SHOP_WORKER_ID, SHOP_PIN, SHOP_JOB_ID");process.exit(2);}
let pass=0,fail=0;
const check=(ok,l,x)=>{console.log(`${ok?"  ok  ":"  FAIL"} ${l}${x?` — ${x}`:""}`);ok?pass++:fail++;};
let cookie="";
const api=async(d)=>{const r=await fetch(`${BASE}/shop/api/measure`,{method:"POST",headers:{"content-type":"application/json",cookie},body:JSON.stringify(d)});return{status:r.status,json:await r.json().catch(()=>null)};};
const lg=await fetch(`${BASE}/shop/api/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({workerId:W,pin:PIN})});
cookie=(lg.headers.getSetCookie?.()||[]).map(c=>c.split(";")[0]).join("; ");

const cr=await api({type:"create",jobId:JOB,shape:"straight",steps1:4,name:"SKIRT TEST"});
const id=cr.json.id, sheet=cr.json.sheet;
const mk=async(mutate)=>{const data=structuredClone(sheet.data);mutate(data);
  const r=await api({type:"update",id,jobId:JOB,data});
  const sub=await api({type:"submit",id,jobId:JOB});
  return {reds:sub.json?.redChecks||[],gaps:(sub.json?.gaps||[]).map(g=>g.key)};};

const withPost=(d,skirt,gap)=>{
  d.posts=[{id:"c1",pointType:"existing_post",side:"right",segIdx:0,stepIdx:0,pos:"",
    distanceFromFirst:"0",fromNosing:"2",fromEdge:"2",mount:"",anchor:"Wood",
    plate:"",anchors:"",substrate:"",edgeDist:"",obstruction:"",
    existingW:"5 1/2",existingD:"5 1/2",skirtProjection:skirt,skirtHeight:"6",
    columnToWall:"3",columnToPlatformEdge:"2",clipDetail:"",infillGap:gap}];
};

console.log("\n3/4\" trim, picket set 4\" off the trim face");
let r = await mk((d)=>withPost(d,"3/4","4"));
check(r.reds.includes("skirt_clearance"), "caught — the gap above the trim is 4 3/4\"", r.reds.join(",")||"none");

console.log("\nsame column, picket moved to 3 1/4\"");
r = await mk((d)=>withPost(d,"3/4","3 1/4"));
check(!r.reds.includes("skirt_clearance"), "passes — exactly 4\" above the trim", r.reds.join(",")||"none");

console.log("\none more sixteenth out");
r = await mk((d)=>withPost(d,"3/4","3 5/16"));
check(r.reds.includes("skirt_clearance"), "caught at 4 1/16\"");

console.log("\ncolumn with no trim at all");
r = await mk((d)=>withPost(d,"0","4"));
check(!r.reds.includes("skirt_clearance"), "no trim, nothing to solve");
check(!r.gaps.includes("post_infill_gap"), "and the gap is not demanded");

console.log("\na trim that sticks out further than the sphere");
r = await mk((d)=>withPost(d,"4 1/2",""));
check(r.reds.includes("skirt_clearance"), "flagged as unsolvable by any picket position");

console.log("\ntrim recorded but the gap left blank");
r = await mk((d)=>withPost(d,"3/4",""));
check(r.gaps.includes("post_infill_gap"), "the gap is required once a trim projects");

await api({type:"delete",id,jobId:JOB});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
