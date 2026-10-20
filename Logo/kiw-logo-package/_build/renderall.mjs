import {Resvg} from '@resvg/resvg-js'; import fs from 'fs'; import path from 'path';
const files=JSON.parse(fs.readFileSync('files.json','utf8'));
const r=(svg,w)=>new Resvg(svg,{fitTo:{mode:'width',value:w},background:'rgba(0,0,0,0)'}).render().asPng();
for(const [p,widths] of files){
  const svg=fs.readFileSync(p,'utf8'); const dir=path.dirname(p); const base=path.basename(p,'.svg');
  if(base==='favicon'){ for(const w of widths) fs.writeFileSync(`${dir}/favicon-${w}x${w}.png`,r(svg,w)); continue;}
  if(base==='apple-touch-icon'){ fs.writeFileSync(`${dir}/apple-touch-icon.png`,r(svg,180));
     fs.writeFileSync(`${dir}/android-chrome-192x192.png`,r(svg,192)); fs.writeFileSync(`${dir}/android-chrome-512x512.png`,r(svg,512)); continue;}
  if(widths.length===1){ fs.writeFileSync(`${dir}/${base}-${widths[0]}.png`,r(svg,widths[0])); continue;}
  ['','@2x','@4x'].forEach((s,i)=>fs.writeFileSync(`${dir}/${base}${s}.png`,r(svg,widths[i])));
}
console.log('done');
