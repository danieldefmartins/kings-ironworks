// Materialize Next's prerendered public website for the house static-build audit.
// Operational /shop and /api routes are authenticated application surfaces, not marketing pages.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('out-audit');
fs.rmSync(root,{recursive:true,force:true});fs.mkdirSync(root,{recursive:true});
fs.cpSync('public',root,{recursive:true});
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
for(const f of walk('.next/server/app')){
 const rel=path.relative('.next/server/app',f);
 if(!f.endsWith('.html')||/^(shop|api|_global-error)(\/|\.)/.test(rel))continue;
 const dest=path.join(root,rel==='_not-found.html'?'404.html':rel==='index.html'?'index.html':rel);
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(f,dest);
}
console.log('Public build snapshot:',root);
