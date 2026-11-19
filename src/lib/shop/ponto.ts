// "Ponto" — the simple clock. Pure and client-safe (no env, no Supabase).
//
// Owner, 11/19: "make it easier for us and employees to work on… simple
// without losing anything — simple and powerful." The crew are mostly
// Portuguese speakers on phones, in the shop, with dirty gloves:
//   • the employee home is one huge state button (Marcar entrada / Marcar
//     saída), a plain status line, today's and the week's hours;
//   • "Pedir correção" is three steps: the day → what's wrong → the time;
//   • the office has one "Ponto" screen: missed clock-outs first, who is
//     working now, today's hours, the waiting requests, and the week to approve.
//
// Two clocks: everything here is the PAYROLL clock (kiw_shop_shifts). Job time
// is never read or written by these rules.

import { SHOP_TZ, fmtTime, fromShopInput, shopDateKey } from "./shared";
import { addPayrollDays } from "./payroll";
import { atDay, hhmm, longDay, firstName } from "./time-fix";
import { MAX_SHIFT_HOURS } from "./clock-rules";

const L = (lang?: string | null): "en" | "pt" | "es" => (lang === "pt" || lang === "es" ? lang : "en");

// ---- Request a fix: the three steps ------------------------------------------

export type FixKind = "in" | "out" | "wrong";

/** The last `n` shop days, newest first (today included). */
export function lastDays(now: number, n = 7, tz: string = SHOP_TZ): string[] {
  const today = shopDateKey(now, tz);
  return Array.from({ length: n }, (_, i) => addPayrollDays(today, -i));
}

/** "hoje" / "ontem" / "seg 16/11" — a day chip label. */
export function dayChip(day: string, now: number, lang?: string | null, tz: string = SHOP_TZ): { top: string; bottom: string } {
  const l = L(lang);
  const today = shopDateKey(now, tz);
  const noon = Date.parse(fromShopInput(`${day}T12:00`, tz));
  const wd = new Intl.DateTimeFormat(l === "pt" ? "pt-BR" : l === "es" ? "es-US" : "en-US", { timeZone: tz, weekday: "short" })
    .format(noon).replace(/\.$/, "").replace(/-feira$/, "");
  const [, m, d] = day.split("-").map(Number);
  const date = l === "en" ? `${m}/${d}` : `${d}/${m}`;
  const top = day === today ? pf(l, "today") : day === addPayrollDays(today, -1) ? pf(l, "yesterday") : wd.charAt(0).toUpperCase() + wd.slice(1);
  return { top, bottom: date };
}

export interface DayShift { id: string; startedAt: string; endedAt: string | null; status: string }

/**
 * What the request asks for. `time` / `endTime` are "HH:MM" shop time on `day`.
 *  • in:    the clock-in is wrong or missing → new clock-in
 *  • out:   the clock-out is missing / wrong → new clock-out
 *  • wrong: both times, as the worker remembers them
 * A clock-out earlier than the clock-in moves to the next day only when the
 * shift itself crossed midnight; otherwise it is an error (caught by the caller).
 */
export function requestTimes(kind: FixKind, day: string, time: string, endTime?: string, tz: string = SHOP_TZ): { startedAt: string | null; endedAt: string | null } {
  if (kind === "in") return { startedAt: atDay(day, time, tz), endedAt: null };
  if (kind === "out") return { startedAt: null, endedAt: atDay(day, time, tz) };
  return { startedAt: atDay(day, time, tz), endedAt: endTime ? atDay(day, endTime, tz) : null };
}

/** The picker's starting value(s) for a kind, from the day's shift if any. */
export function defaultTimes(kind: FixKind, shift: DayShift | null, work: { start: string; end: string } = { start: "07:30", end: "17:00" }, tz: string = SHOP_TZ): { time: string; endTime: string } {
  const start = shift ? hhmm(shift.startedAt, tz) : work.start;
  const end = shift?.endedAt && shopDateKey(shift.endedAt, tz) === shopDateKey(shift.startedAt, tz) ? hhmm(shift.endedAt, tz) : work.end;
  if (kind === "in") return { time: shift ? start : work.start, endTime: end };
  if (kind === "out") return { time: end, endTime: end };
  return { time: start, endTime: end };
}

/** The reason saved with the request — the chip the worker tapped, in their words. */
export function kindReason(kind: FixKind, lang?: string | null): string {
  return pf(L(lang), kind === "in" ? "kindIn" : kind === "out" ? "kindOut" : "kindWrong");
}

/** Why the chosen times cannot be sent, or null. */
export function requestError(kind: FixKind, t: { startedAt: string | null; endedAt: string | null }, shift: DayShift | null, now: number): "future" | "order" | "noShift" | null {
  const s = t.startedAt ?? shift?.startedAt ?? null;
  const e = t.endedAt ?? shift?.endedAt ?? null;
  if ((t.startedAt && Date.parse(t.startedAt) > now) || (t.endedAt && Date.parse(t.endedAt) > now)) return "future";
  if (!shift && kind === "out") return "noShift";
  if (!shift && kind !== "out" && !t.endedAt) return "noShift";
  if (s && e && Date.parse(e) <= Date.parse(s)) return "order";
  return null;
}

// ---- Requests on the home screen ------------------------------------------------

/** Days an answered request stays on the home screen. */
export const SHOW_ANSWER_DAYS = 3;

/** Waiting requests, and answers from the last SHOW_ANSWER_DAYS (max 4). */
export function homeRequests<T extends { status: string; reviewedAt?: string | null }>(fixes: T[], now: number): T[] {
  return fixes.filter((f) => f.status === "pending" || (!!f.reviewedAt && now - Date.parse(f.reviewedAt) < SHOW_ANSWER_DAYS * 86400_000)).slice(0, 4);
}

// ---- The week, as a list of days ---------------------------------------------

export interface WeekDay { day: string; hours: number; open: boolean; held: boolean; count: number }

// ---- Office: approve a week -------------------------------------------------------

export type HoldReason = "open" | "missed" | "request" | "window";

/**
 * Which of one worker's shifts "Aprovar semana" approves. Payroll clock only.
 * Approved: closed, submitted shifts that payroll would pay as they stand.
 * Held back (listed for the office to fix first, never approved in bulk):
 *  • open      — no clock-out yet
 *  • missed    — longer than MAX_SHIFT_HOURS (a forgotten clock-out)
 *  • request   — the worker asked to correct it
 *  • window    — a 7:30–17:00 extra-time question not answered or not checked
 * Rejected shifts are skipped (they are never paid); approved ones are done.
 * The times themselves are never touched: the window rounding already applied
 * at the punch is what gets approved.
 */
export function weekApproval(
  shifts: ReadonlyArray<{ id: string; started_at: string; ended_at: string | null; status: string }>,
  opts: { pendingRequests: ReadonlySet<string>; windowOpen: ReadonlySet<string>; now: number; maxHours?: number },
): { approve: string[]; held: { id: string; reason: HoldReason }[]; approved: number } {
  const max = (opts.maxHours ?? MAX_SHIFT_HOURS) * 3600_000;
  const approve: string[] = [];
  const held: { id: string; reason: HoldReason }[] = [];
  let approved = 0;
  for (const s of shifts) {
    if (s.status === "rejected") continue;
    if (s.status === "approved") { approved++; continue; }
    if (!s.ended_at) { held.push({ id: s.id, reason: "open" }); continue; }
    if (Date.parse(s.ended_at) - Date.parse(s.started_at) > max) { held.push({ id: s.id, reason: "missed" }); continue; }
    if (opts.pendingRequests.has(s.id)) { held.push({ id: s.id, reason: "request" }); continue; }
    if (opts.windowOpen.has(s.id)) { held.push({ id: s.id, reason: "window" }); continue; }
    approve.push(s.id);
  }
  return { approve, held, approved };
}

// ---- Office: missed clock-outs ---------------------------------------------------

/** Minutes after the work-hours end before an open shift counts as missed. */
export const MISSED_GRACE_MIN = 30;

/**
 * An open shift the office should look at now: it started on an earlier shop
 * day, or it is still open more than MISSED_GRACE_MIN after the work-hours end
 * of its own day. Evening work that STARTED after the end is not flagged.
 */
export function isMissedOpen(startedAt: string, now: number, workEnd = "17:00", tz: string = SHOP_TZ): boolean {
  const day = shopDateKey(startedAt, tz);
  if (shopDateKey(now, tz) > day) return true;
  const end = Date.parse(fromShopInput(`${day}T${workEnd}`, tz));
  if (Date.parse(startedAt) >= end) return false;
  return now >= end + MISSED_GRACE_MIN * 60_000;
}

// ---- Texts -------------------------------------------------------------------------

/** The office asks one worker: "did you forget to clock out?" One link, their language. */
export function askWorkerText(lang: string, input: { org: string; name: string; startedAt: string; now: number; link: string }): string {
  const first = firstName(input.name) || input.name;
  const sameDay = shopDateKey(input.startedAt) === shopDateKey(input.now);
  const day = longDay(input.startedAt, lang);
  const since = fmtTime(input.startedAt, L(lang));
  if (lang === "pt") return sameDay
    ? `${input.org}: Oi ${first}, seu ponto está aberto desde as ${since}. Se já saiu, toque para marcar a saída: ${input.link}`
    : `${input.org}: Oi ${first}, você não marcou a saída de ${day}. Abra o app e diga que horas saiu: ${input.link}`;
  if (lang === "es") return sameDay
    ? `${input.org}: Hola ${first}, tu turno está abierto desde las ${since}. Si ya saliste, toca para marcar la salida: ${input.link}`
    : `${input.org}: Hola ${first}, no marcaste la salida del ${day}. Abre la app y dinos a qué hora saliste: ${input.link}`;
  return sameDay
    ? `${input.org}: Hi ${first}, you're still clocked in since ${since}. If you've left, tap to clock out: ${input.link}`
    : `${input.org}: Hi ${first}, you didn't clock out on ${day}. Open the app and tell us what time you left: ${input.link}`;
}

/** The link in a clock-out text: opens the app on the "Marcar saída" button. */
export function clockOutLink(shopLink: string): string {
  return `${shopLink.replace(/\/+$/, "")}?saida=1`;
}

// ---- Screen strings (en / pt / es) ----------------------------------------------

const STR: Record<"en" | "pt" | "es", Record<string, string>> = {
  en: {
    clockIn: "Clock in", clockOut: "Clock out", sending: "Sending…",
    workingSince: "You're working since {time}", notWorking: "You're not working",
    onBreakSince: "You're on a break since {time}",
    workingFor: "Working for {hm}", onBreakFor: "On break · {hm} worked",
    today: "Today", yesterday: "Yesterday", thisWeek: "This week", lastWeek: "Last week",
    breakStart: "Start break", breakEnd: "End break",
    details: "Details", myWeek: "My week", askFix: "Fix my time", more: "More",
    weekTitle: "My week", weekTotal: "Week total", noHours: "—", running: "running", held: "needs review",
    allShifts: "All my clock records", weekOf: "Week of {date}",
    // request
    fixTitle: "Fix my time", step: "Step {n} of 3",
    pickDay: "Which day?", pickKind: "What's wrong?", pickTime: "What time?",
    kindIn: "I forgot to clock in", kindOut: "I forgot to clock out", kindWrong: "Wrong time",
    kindInShort: "Forgot clock-in", kindOutShort: "Forgot clock-out", kindWrongShort: "Wrong time",
    timeIn: "Clock-in", timeOut: "Clock-out",
    send: "Send", back: "Back", close: "Close",
    noShiftDay: "No clock record this day", hadShift: "{start} → {end}", openShift: "since {start}",
    errFuture: "That time hasn't happened yet.", errOrder: "Clock-out must be after clock-in.",
    errNoShift: "No clock record this day. Pick “I forgot to clock in” and enter both times.",
    errFailed: "Could not send. Check the connection and try again.",
    errOverlap: "There is already a clock record at that time. Pick that day's record and choose “Wrong time”.",
    newDayHint: "No record this day: enter when you arrived and when you left.",
    // home status
    myRequests: "My requests", reminderBanner: "It's almost {time}. Clock out before you leave.",
    // office
    ponto: "Clock", pontoHint: "Who's working, today's hours, requests and the week.",
    missedTitle: "Missed clock-outs", missedOpenSince: "Open since {when}", missedLong: "Closed after {hours} h",
    askWorker: "Ask the worker", fix: "Fix", asked: "Text sent", askedAt: "Asked {time}",
    workingNow: "Working now", nobodyWorking: "Nobody is clocked in.", since: "since {time}", onBreak: "on break",
    todayHours: "Today's hours", nobodyToday: "No hours yet today.",
    requestsTitle: "Requests waiting", noRequests: "No requests waiting.",
    weekSummary: "Week summary", approveWeek: "Approve week", weekApproved: "Week approved",
    approvedCount: "{n} approved", toApprove: "{n} to approve", toReview: "{n} need review first",
    reviewFirst: "Fix these first: {list}", approveConfirm: "Approve {n} records for {name}?",
    approveDone: "{name}: {n} records approved", nothingToApprove: "Nothing left to approve",
    ownWeek: "Your own week is approved by Kayky or Daniel",
    hoursTotal: "{hm} total", openNow: "clocked in now",
    fixTime: "Clock-out time", save: "Save", cancel: "Cancel",
    moreTools: "More", oldTimesheets: "Team timesheets (edit, export, map)", payroll: "Payroll ($, daily details)",
    allFixes: "All time fixes + history", locations: "Location history",
    holdOpen: "still open", holdMissed: "forgotten clock-out", holdRequest: "request waiting", holdWindow: "extra-time question",
    whyHeld: "Why: missing clock-out, a request waiting, or an extra-time question",
    errFailedOffice: "Could not save. Try again.",
  },
  pt: {
    clockIn: "Marcar entrada", clockOut: "Marcar saída", sending: "Enviando…",
    workingSince: "Você está trabalhando desde {time}", notWorking: "Você não está trabalhando",
    onBreakSince: "Você está no intervalo desde {time}",
    workingFor: "Trabalhando há {hm}", onBreakFor: "No intervalo · {hm} trabalhadas",
    today: "Hoje", yesterday: "Ontem", thisWeek: "Esta semana", lastWeek: "Semana passada",
    breakStart: "Começar intervalo", breakEnd: "Voltar do intervalo",
    details: "Detalhes", myWeek: "Minha semana", askFix: "Pedir correção", more: "Mais",
    weekTitle: "Minha semana", weekTotal: "Total da semana", noHours: "—", running: "em andamento", held: "em revisão",
    allShifts: "Todos os meus pontos", weekOf: "Semana de {date}",
    fixTitle: "Pedir correção", step: "Passo {n} de 3",
    pickDay: "Qual dia?", pickKind: "O que aconteceu?", pickTime: "Que horas?",
    kindIn: "Esqueci a entrada", kindOut: "Esqueci a saída", kindWrong: "Horário errado",
    kindInShort: "Esqueci a entrada", kindOutShort: "Esqueci a saída", kindWrongShort: "Horário errado",
    timeIn: "Entrada", timeOut: "Saída",
    send: "Enviar", back: "Voltar", close: "Fechar",
    noShiftDay: "Sem ponto neste dia", hadShift: "{start} → {end}", openShift: "desde {start}",
    errFuture: "Esse horário ainda não chegou.", errOrder: "A saída precisa ser depois da entrada.",
    errNoShift: "Sem ponto neste dia. Escolha “Esqueci a entrada” e coloque os dois horários.",
    errFailed: "Não foi possível enviar. Confira a internet e tente de novo.",
    errOverlap: "Já existe um ponto nesse horário. Escolha “Horário errado”.",
    newDayHint: "Sem ponto neste dia: coloque a hora que chegou e a hora que saiu.",
    myRequests: "Meus pedidos", reminderBanner: "Já são quase {time}. Marque a saída antes de ir embora.",
    ponto: "Ponto", pontoHint: "Quem está trabalhando, as horas de hoje, os pedidos e a semana.",
    missedTitle: "Saídas não marcadas", missedOpenSince: "Aberto desde {when}", missedLong: "Fechado depois de {hours} h",
    askWorker: "Perguntar ao funcionário", fix: "Corrigir", asked: "Mensagem enviada", askedAt: "Perguntado às {time}",
    workingNow: "Trabalhando agora", nobodyWorking: "Ninguém marcou entrada.", since: "desde {time}", onBreak: "no intervalo",
    todayHours: "Horas de hoje", nobodyToday: "Nenhuma hora hoje ainda.",
    requestsTitle: "Pedidos esperando", noRequests: "Nenhum pedido esperando.",
    weekSummary: "Resumo da semana", approveWeek: "Aprovar semana", weekApproved: "Semana aprovada",
    approvedCount: "{n} aprovados", toApprove: "{n} para aprovar", toReview: "{n} para revisar antes",
    reviewFirst: "Corrija antes: {list}", approveConfirm: "Aprovar {n} pontos de {name}?",
    approveDone: "{name}: {n} pontos aprovados", nothingToApprove: "Nada para aprovar",
    ownWeek: "Sua própria semana é aprovada pelo Kayky ou o Daniel",
    hoursTotal: "{hm} no total", openNow: "trabalhando agora",
    fixTime: "Hora da saída", save: "Salvar", cancel: "Cancelar",
    moreTools: "Mais", oldTimesheets: "Ponto da equipe (editar, exportar, mapa)", payroll: "Folha de pagamento ($, detalhes por dia)",
    allFixes: "Todas as correções + histórico", locations: "Histórico de localização",
    holdOpen: "ainda aberto", holdMissed: "saída esquecida", holdRequest: "pedido esperando", holdWindow: "pergunta de hora extra",
    whyHeld: "Motivo: saída faltando, pedido esperando ou pergunta de hora extra",
    errFailedOffice: "Não foi possível salvar. Tente de novo.",
  },
  es: {
    clockIn: "Marcar entrada", clockOut: "Marcar salida", sending: "Enviando…",
    workingSince: "Estás trabajando desde las {time}", notWorking: "No estás trabajando",
    onBreakSince: "Estás en descanso desde las {time}",
    workingFor: "Trabajando hace {hm}", onBreakFor: "En descanso · {hm} trabajadas",
    today: "Hoy", yesterday: "Ayer", thisWeek: "Esta semana", lastWeek: "Semana pasada",
    breakStart: "Empezar descanso", breakEnd: "Volver del descanso",
    details: "Detalles", myWeek: "Mi semana", askFix: "Pedir corrección", more: "Más",
    weekTitle: "Mi semana", weekTotal: "Total de la semana", noHours: "—", running: "en curso", held: "en revisión",
    allShifts: "Todos mis registros", weekOf: "Semana del {date}",
    fixTitle: "Pedir corrección", step: "Paso {n} de 3",
    pickDay: "¿Qué día?", pickKind: "¿Qué pasó?", pickTime: "¿A qué hora?",
    kindIn: "Olvidé la entrada", kindOut: "Olvidé la salida", kindWrong: "Hora equivocada",
    kindInShort: "Olvidé la entrada", kindOutShort: "Olvidé la salida", kindWrongShort: "Hora equivocada",
    timeIn: "Entrada", timeOut: "Salida",
    send: "Enviar", back: "Atrás", close: "Cerrar",
    noShiftDay: "Sin registro este día", hadShift: "{start} → {end}", openShift: "desde {start}",
    errFuture: "Esa hora todavía no llegó.", errOrder: "La salida debe ser después de la entrada.",
    errNoShift: "Sin registro este día. Elige “Olvidé la entrada” y pon las dos horas.",
    errFailed: "No se pudo enviar. Revisa la conexión e inténtalo de nuevo.",
    errOverlap: "Ya hay un registro a esa hora. Elige “Hora equivocada”.",
    newDayHint: "Sin registro este día: pon la hora en que llegaste y la hora en que saliste.",
    myRequests: "Mis solicitudes", reminderBanner: "Ya son casi las {time}. Marca la salida antes de irte.",
    ponto: "Reloj", pontoHint: "Quién está trabajando, las horas de hoy, las solicitudes y la semana.",
    missedTitle: "Salidas sin marcar", missedOpenSince: "Abierto desde {when}", missedLong: "Cerrado después de {hours} h",
    askWorker: "Preguntar al empleado", fix: "Corregir", asked: "Mensaje enviado", askedAt: "Preguntado a las {time}",
    workingNow: "Trabajando ahora", nobodyWorking: "Nadie marcó entrada.", since: "desde las {time}", onBreak: "en descanso",
    todayHours: "Horas de hoy", nobodyToday: "Todavía no hay horas hoy.",
    requestsTitle: "Solicitudes esperando", noRequests: "No hay solicitudes esperando.",
    weekSummary: "Resumen de la semana", approveWeek: "Aprobar semana", weekApproved: "Semana aprobada",
    approvedCount: "{n} aprobados", toApprove: "{n} para aprobar", toReview: "{n} para revisar antes",
    reviewFirst: "Corrige antes: {list}", approveConfirm: "¿Aprobar {n} registros de {name}?",
    approveDone: "{name}: {n} registros aprobados", nothingToApprove: "Nada para aprobar",
    ownWeek: "Tu propia semana la aprueban Kayky o Daniel",
    hoursTotal: "{hm} en total", openNow: "trabajando ahora",
    fixTime: "Hora de salida", save: "Guardar", cancel: "Cancelar",
    moreTools: "Más", oldTimesheets: "Horarios del equipo (editar, exportar, mapa)", payroll: "Nómina ($, detalle por día)",
    allFixes: "Todas las correcciones + historial", locations: "Historial de ubicación",
    holdOpen: "aún abierto", holdMissed: "salida olvidada", holdRequest: "solicitud esperando", holdWindow: "pregunta de hora extra",
    whyHeld: "Motivo: falta la salida, una solicitud esperando o una pregunta de hora extra",
    errFailedOffice: "No se pudo guardar. Inténtalo de nuevo.",
  },
};

export function pf(lang: string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  let s = STR[L(lang)][key] ?? STR.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
  return s;
}

export const PONTO_STRINGS = STR;

/** "3h12" — the running time on the big button. */
export function hm(hours: number): string {
  const total = Math.max(0, Math.floor(hours * 60 + 1e-6));
  const h = Math.floor(total / 60), m = total % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}
