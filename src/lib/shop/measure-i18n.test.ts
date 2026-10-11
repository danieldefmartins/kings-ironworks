// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import { materialLabel } from './measure-i18n';

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
  // New dictionaries use either [key, EN, PT, ES] rows or keyed tuples.
  let entries = 0;
  const seen = new Set<string>();
  function tuples(n: ts.Node) {
   if (ts.isVariableDeclaration(n) && n.name.getText(source) === 'ROWS' && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
    for (const row of n.initializer.elements) {
     expect(ts.isArrayLiteralExpression(row), file).toBe(true);
     if (!ts.isArrayLiteralExpression(row)) continue;
     expect(row.elements.length, file).toBe(4);
     for (const e of row.elements) expect(ts.isStringLiteral(e) && e.text.trim().length > 0, file).toBe(true);
     const key = row.elements[0].getText(source);
     expect(seen.has(key), `${file}: duplicate ${key}`).toBe(false);
     seen.add(key); entries++;
    }
   }
   if (ts.isPropertyAssignment(n) && ts.isArrayLiteralExpression(n.initializer)) {
    entries++;
    expect(n.initializer.elements.length, file).toBe(file === 'measure-visual-i18n.ts' ? 2 : 3);
    for (const e of n.initializer.elements) expect(ts.isStringLiteral(e) && e.text.trim().length > 0, file).toBe(true);
   }
   ts.forEachChild(n, tuples);
  }
  if (tables === 0) tuples(source);
  expect(tables + entries, `${file}: no translation tables inspected`).toBeGreaterThan(0);
 });
});

it('localizes canonical material descriptions without changing custom specifications',()=>{
 expect(materialLabel('pt','1-1/2" sq tube')).toBe('1-1/2" tubo quadrado');
 expect(materialLabel('es','Flat bar 2x3/8')).toBe('Solera 2x3/8');
 expect(materialLabel('pt','None (into treads)')).toBe('Sem travessa (fixação nos degraus)');
 expect(materialLabel('es','Custom specified profile')).toBe('Custom specified profile');
 expect(materialLabel('pt','1 1/2" sq tube 11ga')).toBe('1 1/2" tubo quadrado 11ga');
 expect(materialLabel('es','1 1/2" angle 3/16')).toBe('1 1/2" ángulo 3/16');
});
