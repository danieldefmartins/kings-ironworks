// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { materialLabel } from './measure-i18n';
import { STRUCTURAL_STR } from './measure-structural-i18n';

// Inspect raw dictionaries: calling mt() would conceal omissions behind EN fallback.
const files = readdirSync(new URL('.', import.meta.url)).filter(f => /^measure.*-i18n\.ts$/.test(f));
describe('measure translations', () => {
 for (const file of files) it(`${file}: every table key exists in EN, PT-BR and ES`, () => {
  const source = ts.createSourceFile(file, readFileSync(new URL(file, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  let tables = 0;
  function visit(n: ts.Node) {
   if (ts.isObjectLiteralExpression(n)) {
    const languages = new Map(n.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(source).replace(/['"]/g,''), p.initializer]));
    if (['en','pt','es'].every(l => languages.has(l))) {
     const en = languages.get('en')!;
     if (ts.isObjectLiteralExpression(en)) {
      tables++;
      const keys = (o: ts.Node) => ts.isObjectLiteralExpression(o) ? o.properties.map(p=>p.name?.getText(source).replace(/['"]/g,'')).sort() : [];
      for (const lang of ['pt','es']) expect(keys(languages.get(lang)!), `${file}: ${lang}`).toEqual(keys(en));
      for (const [lang,dict] of languages) if (ts.isObjectLiteralExpression(dict)) for (const p of dict.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer)) expect(p.initializer.text.trim(),`${file}: ${lang}.${p.name.getText(source)}`).not.toBe('');
     }
    }
   }
   ts.forEachChild(n, visit);
  }
  visit(source);
  // Tuple-based dictionaries generate the three languages instead.
  if (file === 'measure-structural-i18n.ts') for (const lang of ['pt','es'] as const) expect(Object.keys(STRUCTURAL_STR[lang])).toEqual(Object.keys(STRUCTURAL_STR.en));
  else if (file === 'measure-visual-i18n.ts') {
   let entries = 0;
   function tuples(n:ts.Node) { if(ts.isPropertyAssignment(n)&&ts.isArrayLiteralExpression(n.initializer)){entries++;expect(n.initializer.elements.length).toBe(2);for(const e of n.initializer.elements)expect(ts.isStringLiteral(e)&&e.text.trim().length>0).toBe(true);}ts.forEachChild(n,tuples); }
   tuples(source);expect(entries).toBeGreaterThan(0);
  } else expect(tables).toBeGreaterThan(0);
 });
});

it('localizes canonical material descriptions without changing custom specifications',()=>{
 expect(materialLabel('pt','1-1/2" sq tube')).toBe('1-1/2" tubo quadrado');
 expect(materialLabel('es','Flat bar 2x3/8')).toBe('Solera 2x3/8');
 expect(materialLabel('pt','None (into treads)')).toBe('Sem travessa (fixação nos degraus)');
 expect(materialLabel('es','Custom specified profile')).toBe('Custom specified profile');
});
