// Time fixes at 390 px, Portuguese: the office admin's popup and the
// forgotten clock-out question. TEST tenant only, against a local server:
//   SHOP_ORG_ID=b0000000-0000-4000-8000-000000000002 SMS_DRY_RUN=1 GHL_PIT_TOKEN= TELEGRAM_BOT_TOKEN= npx next start -p 3471
// Fixtures (see HANDOFF-kiw-clock-fixes.md): an "Office / admin" worker
// (SHOP_APPROVER_ID / SHOP_APPROVER_PIN, lang pt), the TEST measurer in pt with
// a shift left open since yesterday, and pending requests.
import assert from 'node:assert/strict';
import { chromium } from './playwright.mjs';

const BASE = process.env.SHOP_BASE_URL || 'http://localhost:3471';
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) throw new Error('Local TEST server only');
const OUT = process.env.SHOTS_DIR || 'docs/screens/kiw-clock-fixes';
const APPROVER = { id: process.env.SHOP_APPROVER_ID || 'b1000000-0000-4000-8000-0000000000a1', pin: process.env.SHOP_APPROVER_PIN || '9011' };
const WORKER = { id: process.env.SHOP_WORKER2_ID || 'b1000000-0000-4000-8000-000000000002', pin: process.env.SHOP_PIN2 || '9002' };
const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark', locale: 'pt-BR', timezoneId: 'America/New_York' };

const browser = await chromium.launch();
try {
  // 1. Giulia opens the app: the time-fix popup, one card per request, newest first.
  const a = await browser.newContext(view);
  assert.ok((await a.request.post(`${BASE}/shop/api/login`, { data: { workerId: APPROVER.id, pin: APPROVER.pin } })).ok(), 'approver login');
  const pa = await a.newPage();
  await pa.goto(`${BASE}/shop`);
  const pop = pa.getByRole('dialog', { name: 'Correções de ponto' });
  await pop.waitFor();
  const cards = pop.getByTestId('fix-card');
  assert.ok(await cards.count() >= 2, 'cards shown');
  await assert.doesNotReject(pop.getByText('Saída: sem saída → 19:14').first().waitFor());
  await assert.doesNotReject(pop.getByText('Entrada: 9:15 → 7:34').waitFor());
  for (const b of ['Aprovar', 'Mudar', 'Recusar']) assert.ok(await cards.first().getByRole('button', { name: b }).isVisible(), b);
  await pa.screenshot({ path: `${OUT}/01-approver-popup-pt-390.png` });

  // "Mudar" = two time fields prefilled with the request.
  const entrada = cards.filter({ hasText: 'Entrada: 9:15 → 7:34' });
  await entrada.getByRole('button', { name: 'Mudar' }).click();
  assert.equal(await entrada.getByLabel('Entrada').inputValue(), '07:34');
  assert.equal(await entrada.getByLabel('Saída').inputValue(), '17:39');
  await entrada.getByLabel('Entrada').fill('07:40');
  await pa.screenshot({ path: `${OUT}/02-approver-change-pt-390.png` });
  const before = await cards.count();
  await entrada.getByRole('button', { name: 'Salvar' }).click();
  await pa.waitForFunction((n) => document.querySelectorAll('[data-testid="fix-card"]').length === n - 1, before);

  // "Depois" closes it; it does not come back within the hour. The badge stays.
  await pop.getByRole('button', { name: 'Depois' }).click();
  await pop.waitFor({ state: 'detached' });
  await pa.reload();
  await pa.waitForTimeout(1500);
  assert.equal(await pa.getByRole('dialog', { name: 'Correções de ponto' }).count(), 0, 'snoozed');
  const badge = pa.getByTestId('time-fix-badge');
  await badge.waitFor();
  assert.equal(await badge.textContent(), String(before - 1));
  await pa.screenshot({ path: `${OUT}/03-approver-badge-pt-390.png` });
  await pa.goto(`${BASE}/shop/time-fixes`);
  await pa.getByRole('button', { name: 'Ver histórico' }).click();
  await pa.getByText('Aprovado por Giulia').first().waitFor();
  await pa.screenshot({ path: `${OUT}/04-approver-list-history-pt-390.png`, fullPage: true });
  await a.close();

  // 2. The worker opens the app with yesterday's shift still open.
  const w = await browser.newContext({ ...view, geolocation: { latitude: 42.4085, longitude: -71.0537, accuracy: 10 }, permissions: ['geolocation'] });
  assert.ok((await w.request.post(`${BASE}/shop/api/login`, { data: { workerId: WORKER.id, pin: WORKER.pin } })).ok(), 'worker login');
  const pw = await w.newPage();
  await pw.goto(`${BASE}/shop`);
  const q = pw.getByRole('dialog', { name: /Você não marcou a saída de .+\. Que horas você saiu\?/ });
  await q.waitFor();
  assert.equal(await q.getByLabel('Hora que saiu').inputValue(), '17:00');
  await pw.screenshot({ path: `${OUT}/05-worker-missed-clock-out-pt-390.png` });
  await q.getByLabel('Hora que saiu').fill('06:00');
  await q.getByText(/Esse horário é antes da sua entrada/).waitFor();
  await pw.screenshot({ path: `${OUT}/06-worker-missed-clock-out-invalid-pt-390.png` });
  await q.getByLabel('Hora que saiu').fill('17:00');
  await q.getByRole('button', { name: 'Salvar e marcar entrada agora' }).click();
  await q.waitFor({ state: 'detached' });
  await pw.getByRole('status').filter({ hasText: /Saída salva|Entrada/ }).first().waitFor();
  await pw.screenshot({ path: `${OUT}/07-worker-saved-and-clocked-in-pt-390.png` });
  await pw.waitForFunction(() => document.querySelector('[data-clock-state]')?.getAttribute('data-clock-state') === 'working', null, { timeout: 20000 });

  // 3. The worker sends a request and sees who approves it.
  await pw.goto(`${BASE}/shop/time`);
  await pw.getByRole('button', { name: 'Pedir correção' }).first().click();
  await pw.locator('textarea').fill('Cheguei 7:30');
  await pw.getByRole('button', { name: /Enviar/ }).click();
  const sent = pw.getByRole('dialog', { name: 'Enviado para a Giulia aprovar' });
  await sent.waitFor();
  await pw.screenshot({ path: `${OUT}/08-worker-sent-pt-390.png` });
  await sent.getByRole('button', { name: 'OK' }).click();
  await pw.getByText(/Pendente — esperando a Giulia/).first().waitFor();
  await pw.screenshot({ path: `${OUT}/09-worker-status-pt-390.png`, fullPage: true });
  await w.close();
  console.log('clock-fixes UI: OK');
} finally {
  await browser.close();
}
