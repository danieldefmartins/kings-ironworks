// Simplicity pass at 390 px, Portuguese: the employee home (one big button),
// "Pedir correção" in 3 steps, and the office "Ponto" screen. TEST tenant only:
//   SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 SMS_DRY_RUN=1 GHL_PIT_TOKEN= TELEGRAM_BOT_TOKEN= npx next start -p 3471
// Fixtures (HANDOFF-kiw-clock-fixes.md › Simplicity pass): the TEST measurer
// in pt with Mon + Tue closed and today open since 7:31, the TEST lockout
// worker with yesterday left open, and an "Office / admin" worker (pt).
import assert from 'node:assert/strict';
import { chromium } from './playwright.mjs';

const BASE = process.env.SHOP_BASE_URL || 'http://localhost:3471';
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) throw new Error('Local TEST server only');
const OUT = process.env.SHOTS_DIR || 'docs/screens/kiw-clock-fixes/simplicity';
const APPROVER = { id: process.env.SHOP_APPROVER_ID || 'b1000000-0000-4000-8000-0000000000a1', pin: process.env.SHOP_APPROVER_PIN || '9011' };
const WORKER = { id: process.env.SHOP_WORKER2_ID || 'b1000000-0000-4000-8000-000000000002', pin: process.env.SHOP_PIN2 || '9002' };
const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', locale: 'pt-BR', timezoneId: 'America/New_York', geolocation: { latitude: 42.4085, longitude: -71.0537, accuracy: 10 }, permissions: ['geolocation'] };
const login = async (ctx, who) => assert.ok((await ctx.request.post(`${BASE}/shop/api/login`, { data: { workerId: who.id, pin: who.pin } })).ok(), `login ${who.id}`);

const browser = await chromium.launch();
try {
  // 1. Employee home: working since 7:31 → one red "Marcar saída".
  const w = await browser.newContext(view);
  await login(w, WORKER);
  const p = await w.newPage();
  await p.goto(`${BASE}/shop`);
  const status = p.getByTestId('clock-status');
  await status.waitFor();
  assert.equal(await status.textContent(), 'Você está trabalhando desde 7:31');
  const main = p.getByTestId('clock-main');
  assert.match(await main.textContent(), /^Marcar saídaTrabalhando há \d+h\d\d$/);
  const box = await main.boundingBox();
  assert.ok(box.height >= 150 && box.width >= 340, `big button ${box.width}x${box.height}`);
  assert.ok(await p.getByRole('button', { name: 'Começar intervalo' }).isVisible());
  assert.match(await p.getByTestId('clock-week').textContent(), /^\d+h\d\d$/);
  await p.screenshot({ path: `${OUT}/after-01-employee-home-working-pt-390.png` });

  // The 4:55 PM text link lands on the button (focused, ringed).
  await p.goto(`${BASE}/shop?saida=1`);
  await p.waitForFunction(() => document.activeElement?.id === 'marcar-saida');
  await p.screenshot({ path: `${OUT}/after-02-reminder-link-lands-on-saida-pt-390.png` });

  // 2. "Pedir correção" in 3 steps: Ontem (no record) → Esqueci a entrada → both times → Enviar.
  await p.goto(`${BASE}/shop`);
  await p.getByRole('button', { name: 'Pedir correção' }).click();
  const sheet = p.getByRole('dialog', { name: 'Pedir correção' });
  await sheet.getByText('Passo 1 de 3').waitFor();
  assert.equal(await sheet.getByTestId('fix-day').count(), 7);
  await p.screenshot({ path: `${OUT}/after-03-request-step1-day-pt-390.png` });
  await sheet.getByRole('button', { name: /^Ontem/ }).click();
  await sheet.getByText('Passo 2 de 3').waitFor();
  await p.screenshot({ path: `${OUT}/after-04-request-step2-what-pt-390.png` });
  await sheet.getByRole('button', { name: 'Esqueci a entrada' }).click();
  await sheet.getByText('Passo 3 de 3').waitFor();
  assert.equal(await sheet.getByLabel('Entrada').inputValue(), '07:30');
  assert.equal(await sheet.getByLabel('Saída').inputValue(), '17:00');
  await p.screenshot({ path: `${OUT}/after-05-request-step3-time-pt-390.png` });
  await sheet.getByRole('button', { name: 'Enviar' }).click();
  const sent = p.getByRole('dialog', { name: 'Enviado para a Giulia aprovar' });
  await sent.waitFor();
  await p.screenshot({ path: `${OUT}/after-06-request-sent-pt-390.png` });
  await sent.getByRole('button', { name: 'OK' }).click();
  await p.reload();
  const reqs = p.getByTestId('home-requests');
  await reqs.getByText(/Pendente — esperando a Giulia/).waitFor();
  await p.screenshot({ path: `${OUT}/after-07-home-request-status-pt-390.png`, fullPage: true });

  // 3. Minha semana: a list of days and the total.
  await p.getByRole('link', { name: 'Minha semana' }).click();
  await p.getByTestId('week-days').waitFor();
  assert.match(await p.getByTestId('week-total').textContent(), /Total da semana\d+h\d\d/);
  await p.screenshot({ path: `${OUT}/after-08-my-week-pt-390.png`, fullPage: true });
  await p.getByText('Todos os meus pontos').click();
  await p.getByRole('button', { name: 'Pedir correção' }).nth(1).waitFor();
  await w.close();

  // 4. Office: Ponto — missed clock-out on top, working now, today, requests, week.
  const g = await browser.newContext(view);
  await login(g, APPROVER);
  const pg = await g.newPage();
  await pg.goto(`${BASE}/shop`);
  // The approver popup (previous pass) may open first; "Depois" closes it.
  const pop = pg.getByRole('dialog', { name: 'Correções de ponto' });
  if (await pop.isVisible().catch(() => false) || await pop.waitFor({ timeout: 3000 }).then(() => true).catch(() => false)) await pop.getByRole('button', { name: 'Depois' }).click();
  await pg.getByRole('navigation', { name: 'Acesso rápido' }).getByRole('link', { name: 'Ponto' }).click();
  await pg.getByRole('main').getByRole('heading', { name: 'Ponto' }).waitFor();
  const missed = pg.getByTestId('missed-card');
  await missed.first().waitFor();
  assert.match(await missed.first().textContent(), /Test Lockout/);
  const order = await pg.locator('[data-testid^="ponto-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  assert.deepEqual(order.slice(0, 4), ['ponto-missed', 'ponto-working', 'ponto-today', 'ponto-requests']);
  assert.match(await pg.getByTestId('ponto-working').textContent(), /Test Measurer.*desde 7:31/);
  assert.ok(await pg.getByTestId('ponto-requests').getByTestId('fix-card').count() >= 1);
  await pg.screenshot({ path: `${OUT}/after-09-office-ponto-top-pt-390.png` });
  await missed.first().getByRole('button', { name: 'Perguntar ao funcionário' }).click();
  await missed.first().getByText(/Perguntado às/).waitFor();
  await pg.screenshot({ path: `${OUT}/after-10-office-asked-pt-390.png` });
  // Corrigir opens the clock-out time.
  await missed.first().getByRole('button', { name: 'Corrigir' }).click();
  const fix = pg.getByRole('dialog', { name: 'Corrigir' });
  assert.equal(await fix.getByLabel('Hora da saída').inputValue(), '17:00');
  await pg.screenshot({ path: `${OUT}/after-11-office-fix-pt-390.png` });
  await fix.getByRole('button', { name: 'Cancelar' }).click();
  // The week: Aprovar semana approves Mon + Tue, holds today's open shift.
  const week = pg.getByTestId('week-card').filter({ hasText: 'Test Measurer' });
  await week.scrollIntoViewIfNeeded();
  assert.match(await week.textContent(), /2 para aprovar/);
  await pg.screenshot({ path: `${OUT}/after-12-office-week-pt-390.png` });
  pg.once('dialog', (d) => d.accept());
  await week.getByRole('button', { name: 'Aprovar semana' }).click();
  await pg.getByRole('status').filter({ hasText: 'Test: 2 pontos aprovados' }).waitFor();
  await week.getByText('2 aprovados').waitFor();
  await pg.screenshot({ path: `${OUT}/after-13-office-week-approved-pt-390.png` });
  await pg.getByTestId('ponto-more').scrollIntoViewIfNeeded();
  await pg.screenshot({ path: `${OUT}/after-14-office-ponto-full-pt-390.png`, fullPage: true });
  await g.close();
  console.log('clock-simple UI: OK');
} finally {
  await browser.close();
}
