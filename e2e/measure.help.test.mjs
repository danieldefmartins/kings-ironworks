// Fields were extracted from MeasureEditor. Walk every production component,
// using the TS parser so multiline props, arrows and single quotes are valid.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const ts = createRequire(import.meta.url)('typescript');
const root = fileURLToPath(new URL('..', import.meta.url));
const help = ts.createSourceFile('help.ts', readFileSync(join(root,'src/lib/shop/measure-help.ts'),'utf8'), ts.ScriptTarget.Latest, true);
const dicts = {};
function visit(node, fn) { fn(node); ts.forEachChild(node, n => visit(n,fn)); }
visit(help, n => { if (ts.isVariableDeclaration(n) && ['en','pt','es'].includes(n.name.getText(help)) && n.initializer && ts.isObjectLiteralExpression(n.initializer)) dicts[n.name.getText(help)] = Object.fromEntries(n.initializer.properties.map(p => [p.name.text, p.initializer.text])); });
for (const lang of ['pt','es']) assert.deepEqual(Object.keys(dicts[lang]).sort(), Object.keys(dicts.en).sort(), `${lang} help keys`);
for (const [lang,dict] of Object.entries(dicts)) for (const [key,text] of Object.entries(dict)) assert.ok(text.length >= 15, `${lang}.${key} is a stub`);
const dir = join(root,'src/app/shop/job/[id]/measure');
const files = readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.tsx') && !f.includes('.test.'));
let fields=0, wired=0;
for (const file of files) {
 const source=ts.createSourceFile(file,readFileSync(join(dir,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 visit(source,n=>{
  if (!ts.isJsxSelfClosingElement(n) && !ts.isJsxOpeningElement(n)) return;
  if (!['MInput','MSelect','ChipRow'].includes(n.tagName.getText(source))) return;
  fields++;
  const props=n.attributes.properties;
  const h=props.find(p=>p.name?.getText(source)==='help');
  if (h?.initializer && ts.isStringLiteral(h.initializer)) { assert.ok(dicts.en[h.initializer.text], `${file}: unknown help ${h.initializer.text}`); wired++; }
  const label=props.find(p=>p.name?.getText(source)==='label')?.initializer;
  const e=label && ts.isJsxExpression(label) ? label.expression : null;
  if (e && ts.isCallExpression(e) && e.expression.getText(source)==='mt' && ts.isStringLiteral(e.arguments[1])) {
   const key=e.arguments[1].text;
   if (dicts.en[key]) assert.ok(h,`${file}: ${key} has an explanation but no help prop`);
  }
 });
}
assert.ok(fields > 100, `Extraction failed: found only ${fields} fields`);
assert.ok(wired > 100, `Found only ${wired} help bindings`);
console.log(`ok  ${fields} fields inspected across ${files.length} components; ${wired} help bindings; all help keys translated`);
