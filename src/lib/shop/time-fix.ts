// Time fixes — the forgotten clock-out question and the correction requests,
// in plain words. Pure and client-safe (no env, no Supabase): the server
// decides, the phone renders, the tests pin the arithmetic and the wording.
//
// Owner, 11/19, after Kaio forgot to clock out Thu 11/5 (25.7 h shift, his
// correction requests sat unanswered, 9 more pending since Sep 29): "Fix what
// needs to be fixed… leave a popup on the app to fix the clock requests, it's
// a bit confusing to see the edits… make it simpler."
//
// Who approves (owner update 11/19 7:40): Giulia — the office admin — approves
// time fixes; Kayky and Daniel supervise (they can act, but are not
// interrupted). The rule is a ROLE, not a name: anyone whose kiw_shop_workers
// role is "Office / admin" approves time fixes. That role carries no money
// access (is_admin / can_see_prices stay false) — approving a time fix is not
// owner access.

import { SHOP_TZ, fmtTime, fromShopInput, shopDateKey } from "./shared";

export const TIME_APPROVER_ROLE = "Office / admin";

type Who = { id?: string; role?: string | null; is_admin?: boolean | null; can_see_prices?: boolean | null };

const isOwner = (w: Who) => !!w.is_admin && !!w.can_see_prices;

/** Office admin (Giulia): approves time fixes; gets the popup and the text. */
export function isTimeApprover(w: Who | null | undefined): boolean {
  return !!w && !isOwner(w) && (w.role || "").trim().toLowerCase() === TIME_APPROVER_ROLE.toLowerCase();
}

/** Can open the list and approve / change / refuse: the approver and the owners. */
export function canApproveTime(w: Who | null | undefined): boolean {
  return !!w && (isOwner(w) || isTimeApprover(w));
}

/** Nobody approves their own time. */
export function canReviewRequest(reviewer: Who, requestWorkerId: string): boolean {
  return canApproveTime(reviewer) && reviewer.id !== requestWorkerId;
}

// ---- Forgotten clock-out ----------------------------------------------------

/** Opened again this long after a clock-in on an earlier day = forgotten.
 *  (A 6 PM → 1 AM night is not asked about; a 7:30 → next morning is.) */
export const FORGOTTEN_MIN_HOURS = 8;
/** Default answer: the work-day end ("5:00 PM window end"). */
export const DEFAULT_END_HHMM = "17:00";

export interface MissedOut {
  shiftId: string;
  /** Payroll clock-in time of that shift. */
  startedAt: string;
  /** The shift's shop day, YYYY-MM-DD. */
  day: string;
  /** Earliest / latest allowed answer (ISO): after the clock-in, same day. */
  minEnd: string;
  maxEnd: string;
  /** The picker's starting value (ISO). */
  defaultEnd: string;
  /** "open": still running; "closed": a morning tap closed it at the wrong time. */
  mode: "open" | "closed";
}

const MIN = 60_000;

/** Last minute of a shop day, as an instant. */
function dayEndIso(day: string, tz: string): string {
  return fromShopInput(`${day}T23:59`, tz);
}

/** The forgotten-clock-out question for a shift, or null when there is none. */
export function missedOutFor(
  shift: { id: string; started_at: string; ended_at: string | null; status?: string | null },
  now: number,
  opts: { endHhmm?: string; tz?: string; maxHours?: number } = {},
): MissedOut | null {
  const tz = opts.tz || SHOP_TZ;
  const start = Date.parse(shift.started_at);
  if (!Number.isFinite(start)) return null;
  const day = shopDateKey(start, tz);
  let mode: MissedOut["mode"];
  if (!shift.ended_at) {
    if (shopDateKey(now, tz) <= day || now - start < FORGOTTEN_MIN_HOURS * 3600_000) return null;
    mode = "open";
  } else {
    // Closed by a tap on a later day, too long to be a real shift, and not
    // already confirmed by the office as a real long day.
    const end = Date.parse(shift.ended_at);
    if (shift.status === "approved" || shopDateKey(end, tz) <= day) return null;
    if (end - start <= (opts.maxHours ?? 16) * 3600_000) return null;
    mode = "closed";
  }
  const minEnd = new Date(Math.floor(start / MIN) * MIN + MIN).toISOString();
  const maxEnd = new Date(Math.min(Date.parse(dayEndIso(day, tz)), now)).toISOString();
  const workEnd = Date.parse(fromShopInput(`${day}T${opts.endHhmm || DEFAULT_END_HHMM}`, tz));
  const fallback = Math.min(start + 3600_000, Date.parse(maxEnd));
  const defaultEnd = new Date(workEnd > start ? Math.min(workEnd, Date.parse(maxEnd)) : fallback).toISOString();
  return { shiftId: shift.id, startedAt: shift.started_at, day, minEnd, maxEnd, defaultEnd, mode };
}

/** Why an answered clock-out time cannot be saved, or null. */
export function missedOutError(q: Pick<MissedOut, "minEnd" | "maxEnd">, endIso: string): "bad" | "before" | "after" | null {
  const end = Date.parse(endIso);
  if (!Number.isFinite(end)) return "bad";
  if (end < Date.parse(q.minEnd)) return "before";
  if (end > Date.parse(q.maxEnd)) return "after";
  return null;
}

/** "HH:MM" (24 h, shop time) of an instant — the time picker's value. */
export function hhmm(iso: string, tz: string = SHOP_TZ): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

/** The instant for "HH:MM" on a shop day. */
export function atDay(day: string, time: string, tz: string = SHOP_TZ): string {
  return fromShopInput(`${day}T${time}`, tz);
}

// ---- Dates in plain words ---------------------------------------------------

const LOCALE: Record<string, string> = { pt: "pt-BR", es: "es-US", en: "en-US" };
const L = (lang?: string | null) => (lang === "pt" || lang === "es" ? lang : "en");

function parts(iso: string | number, lang: string, weekday: "short" | "long", tz: string) {
  const p = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: tz, weekday, day: "numeric", month: "numeric" }).formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { wd: get("weekday").replace(/\.$/, "").replace(/-feira$/, "").toLowerCase(), d: get("day"), m: get("month") };
}

/** "qui 5/11" · "jue 5/11" · "Thu 11/5" */
export function shortDay(iso: string | number, lang?: string | null, tz: string = SHOP_TZ): string {
  const l = L(lang);
  const { wd, d, m } = parts(iso, l, "short", tz);
  return l === "en" ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${m}/${d}` : `${wd} ${d}/${m}`;
}

/** "quinta, 5/11" · "jueves, 5/11" · "Thursday, 11/5" */
export function longDay(iso: string | number, lang?: string | null, tz: string = SHOP_TZ): string {
  const l = L(lang);
  const { wd, d, m } = parts(iso, l, "long", tz);
  return l === "en" ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${m}/${d}` : `${wd}, ${d}/${m}`;
}

/** Weekday only ("ter" / "Tue"), or the date when it is more than 6 days back. */
export function sinceLabel(iso: string | number, now: number, lang?: string | null, tz: string = SHOP_TZ): string {
  const l = L(lang);
  const { wd, d, m } = parts(iso, l, "short", tz);
  if (now - Date.parse(new Date(iso).toISOString()) > 6 * 86400_000) return l === "en" ? `${m}/${d}` : `${d}/${m}`;
  return l === "en" ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)}` : wd;
}

/** Clock time; prefixed with the weekday when it falls on another day. */
export function timeOn(iso: string, dayOf: string, lang?: string | null, tz: string = SHOP_TZ): string {
  const time = fmtTime(iso, L(lang));
  if (shopDateKey(iso, tz) === shopDateKey(dayOf, tz)) return time;
  return `${parts(iso, L(lang), "short", tz).wd} ${time}`;
}

export const firstName = (name: string | null | undefined) => (name || "").trim().split(/\s+/)[0] || "";

// ---- A request in plain words ----------------------------------------------

export interface FixCard {
  id: string;
  shiftId: string;
  workerId: string;
  workerName: string;
  createdAt: string;
  /** Shift as it stands now (payroll times). */
  shiftStart: string;
  shiftEnd: string | null;
  /** What the worker asked for (null = unchanged). */
  askStart: string | null;
  askEnd: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface FixLine { edge: "in" | "out"; before: string | null; after: string }

const sameMinute = (a: string | null, b: string | null) =>
  !!a && !!b && Math.floor(Date.parse(a) / MIN) === Math.floor(Date.parse(b) / MIN);

/** The lines that actually change: "Entrada: 9:15 → 7:34", "Saída: sem saída → 19:14". */
export function fixLines(c: Pick<FixCard, "shiftStart" | "shiftEnd" | "askStart" | "askEnd">): FixLine[] {
  const out: FixLine[] = [];
  if (c.askStart && !sameMinute(c.askStart, c.shiftStart)) out.push({ edge: "in", before: c.shiftStart, after: c.askStart });
  if (c.askEnd && !sameMinute(c.askEnd, c.shiftEnd)) out.push({ edge: "out", before: c.shiftEnd, after: c.askEnd });
  return out;
}

export function lineText(line: FixLine, dayOf: string, lang?: string | null): string {
  const l = L(lang);
  const label = tf(l, line.edge === "in" ? "edgeIn" : "edgeOut");
  const before = line.before ? timeOn(line.before, dayOf, l) : tf(l, line.edge === "in" ? "noIn" : "noOut");
  return `${label}: ${before} → ${timeOn(line.after, dayOf, l)}`;
}

/** Validate the times a reviewer is about to apply. */
export function reviewTimesError(start: string | null, end: string | null): "bad" | "order" | null {
  if (start && !Number.isFinite(Date.parse(start))) return "bad";
  if (end && !Number.isFinite(Date.parse(end))) return "bad";
  if (start && end && Date.parse(end) <= Date.parse(start)) return "order";
  return null;
}

// ---- Texts ------------------------------------------------------------------

/** Text to the approver when a worker sends a request. One per request. */
export function requestText(lang: string, input: { org: string; worker: string; shiftStart: string; lines: string[]; reason: string; link: string }): string {
  const day = shortDay(input.shiftStart, lang);
  const what = input.lines.length ? ` — ${input.lines.join("; ")}` : "";
  const reason = input.reason ? ` "${input.reason.slice(0, 120)}"` : "";
  if (lang === "pt") return `${input.org}: ${firstName(input.worker)} pediu para corrigir o ponto de ${day}${what}.${reason} Abra o app para aprovar: ${input.link}`;
  if (lang === "es") return `${input.org}: ${firstName(input.worker)} pidió corregir su horario del ${day}${what}.${reason} Abre la app para aprobar: ${input.link}`;
  return `${input.org}: ${firstName(input.worker)} asked to fix their time for ${day}${what}.${reason} Open the app to approve: ${input.link}`;
}

/** Daily note to the supervisors when something has waited more than 24 h. */
export function waitingText(lang: string, input: { org: string; count: number; approver: string; oldest: string; now: number; link: string }): string {
  const since = sinceLabel(input.oldest, input.now, lang);
  const who = input.approver || (lang === "pt" ? "o escritório" : lang === "es" ? "la oficina" : "the office");
  const n = input.count;
  if (lang === "pt") return `${input.org}: ${n} ${n === 1 ? "correção de ponto esperando" : "correções de ponto esperando"} ${input.approver ? "a " : ""}${who} desde ${since}. ${input.link}`;
  if (lang === "es") return `${input.org}: ${n} ${n === 1 ? "corrección de horario esperando" : "correcciones de horario esperando"} a ${who} desde el ${since}. ${input.link}`;
  return `${input.org}: ${n} time ${n === 1 ? "fix" : "fixes"} waiting for ${who} since ${since}. ${input.link}`;
}

// ---- Screen strings (en / pt / es) -------------------------------------------

const STR: Record<"en" | "pt" | "es", Record<string, string>> = {
  en: {
    missedTitle: "You didn't clock out on {day}. What time did you leave?",
    missedSub: "You clocked in at {time}. Pick the time you went home that day.",
    missedTime: "Time you left",
    missedSaveIn: "Save and clock in now",
    missedSave: "Save",
    missedSaving: "Saving…",
    missedBefore: "That is before you clocked in ({time}).",
    missedAfter: "Pick a time on {day}, up to {time}.",
    missedFailed: "Could not save. Check the connection and try again.",
    missedDone: "Clock-out saved: {day} at {time}",
    missedBlocked: "You didn't clock out on {day}. Open the app again and tell us what time you left.",
    fixesTitle: "Time fixes",
    fixesHint: "Each card is one request. Approve, change the times, or refuse.",
    fixesCount: "{n} waiting",
    fixesCountOne: "1 waiting",
    edgeIn: "Clock-in", edgeOut: "Clock-out", noIn: "no clock-in", noOut: "no clock-out",
    noTimeChange: "No time change — note only",
    approve: "Approve", change: "Change", refuse: "Refuse", later: "Later", save: "Save", cancel: "Cancel",
    changeIn: "Clock-in", changeOut: "Clock-out",
    allDone: "All caught up — no time fixes waiting.",
    history: "See history", hideHistory: "Hide history", historyEmpty: "No reviewed requests yet.",
    approvedBy: "Approved by {name}", refusedBy: "Refused by {name}", approved: "Approved", refused: "Refused", pending: "Pending",
    errOrder: "Clock-out must be after clock-in.", errFailed: "Could not save. Try again.",
    confirmLong: "This makes a very long shift. Save anyway?",
    sentTo: "Sent to {name} to approve",
    sentToOffice: "Sent to the office to approve",
    myRequests: "My time fix requests",
    statusPending: "Pending — waiting for {name}",
    statusApproved: "Approved — your hours are fixed",
    statusRefused: "Refused — talk to {name}",
    see: "See",
    ok: "OK",
    requestedOn: "Sent {day}",
    yourReason: "Your note",
    navBadge: "Time fixes",
    navBadgeHint: "Approve, change or refuse the crew's clock fixes",
    ownTimeNote: "Your own requests go to Kayky or Daniel.",
  },
  pt: {
    missedTitle: "Você não marcou a saída de {day}. Que horas você saiu?",
    missedSub: "Você entrou às {time}. Escolha a hora que foi embora nesse dia.",
    missedTime: "Hora que saiu",
    missedSaveIn: "Salvar e marcar entrada agora",
    missedSave: "Salvar",
    missedSaving: "Salvando…",
    missedBefore: "Esse horário é antes da sua entrada ({time}).",
    missedAfter: "Escolha um horário de {day}, até {time}.",
    missedFailed: "Não foi possível salvar. Confira a internet e tente de novo.",
    missedDone: "Saída salva: {day} às {time}",
    missedBlocked: "Você não marcou a saída de {day}. Abra o app de novo e diga que horas saiu.",
    fixesTitle: "Correções de ponto",
    fixesHint: "Cada cartão é um pedido. Aprove, mude os horários ou recuse.",
    fixesCount: "{n} esperando",
    fixesCountOne: "1 esperando",
    edgeIn: "Entrada", edgeOut: "Saída", noIn: "sem entrada", noOut: "sem saída",
    noTimeChange: "Sem mudança de horário — só observação",
    approve: "Aprovar", change: "Mudar", refuse: "Recusar", later: "Depois", save: "Salvar", cancel: "Cancelar",
    changeIn: "Entrada", changeOut: "Saída",
    allDone: "Tudo em dia — nenhuma correção esperando.",
    history: "Ver histórico", hideHistory: "Esconder histórico", historyEmpty: "Nenhum pedido revisado ainda.",
    approvedBy: "Aprovado por {name}", refusedBy: "Recusado por {name}", approved: "Aprovado", refused: "Recusado", pending: "Pendente",
    errOrder: "A saída precisa ser depois da entrada.", errFailed: "Não foi possível salvar. Tente de novo.",
    confirmLong: "Isso dá um turno muito longo. Salvar mesmo assim?",
    sentTo: "Enviado para a {name} aprovar",
    sentToOffice: "Enviado para o escritório aprovar",
    myRequests: "Meus pedidos de correção",
    statusPending: "Pendente — esperando a {name}",
    statusApproved: "Aprovado — suas horas foram corrigidas",
    statusRefused: "Recusado — fale com a {name}",
    see: "Ver",
    ok: "OK",
    requestedOn: "Enviado {day}",
    yourReason: "Sua observação",
    navBadge: "Correções de ponto",
    navBadgeHint: "Aprovar, mudar ou recusar as correções do pessoal",
    ownTimeNote: "Seus próprios pedidos vão para o Kayky ou o Daniel.",
  },
  es: {
    missedTitle: "No marcaste la salida del {day}. ¿A qué hora saliste?",
    missedSub: "Entraste a las {time}. Elige la hora en que te fuiste ese día.",
    missedTime: "Hora de salida",
    missedSaveIn: "Guardar y marcar entrada ahora",
    missedSave: "Guardar",
    missedSaving: "Guardando…",
    missedBefore: "Esa hora es antes de tu entrada ({time}).",
    missedAfter: "Elige una hora del {day}, hasta las {time}.",
    missedFailed: "No se pudo guardar. Revisa la conexión e inténtalo de nuevo.",
    missedDone: "Salida guardada: {day} a las {time}",
    missedBlocked: "No marcaste la salida del {day}. Abre la app de nuevo y dinos a qué hora saliste.",
    fixesTitle: "Correcciones de horario",
    fixesHint: "Cada tarjeta es una solicitud. Aprueba, cambia las horas o rechaza.",
    fixesCount: "{n} esperando",
    fixesCountOne: "1 esperando",
    edgeIn: "Entrada", edgeOut: "Salida", noIn: "sin entrada", noOut: "sin salida",
    noTimeChange: "Sin cambio de horario — solo nota",
    approve: "Aprobar", change: "Cambiar", refuse: "Rechazar", later: "Después", save: "Guardar", cancel: "Cancelar",
    changeIn: "Entrada", changeOut: "Salida",
    allDone: "Todo al día — ninguna corrección esperando.",
    history: "Ver historial", hideHistory: "Ocultar historial", historyEmpty: "Aún no hay solicitudes revisadas.",
    approvedBy: "Aprobado por {name}", refusedBy: "Rechazado por {name}", approved: "Aprobado", refused: "Rechazado", pending: "Pendiente",
    errOrder: "La salida debe ser después de la entrada.", errFailed: "No se pudo guardar. Inténtalo de nuevo.",
    confirmLong: "Esto da un turno muy largo. ¿Guardar de todos modos?",
    sentTo: "Enviado a {name} para aprobar",
    sentToOffice: "Enviado a la oficina para aprobar",
    myRequests: "Mis solicitudes de corrección",
    statusPending: "Pendiente — esperando a {name}",
    statusApproved: "Aprobado — tus horas fueron corregidas",
    statusRefused: "Rechazado — habla con {name}",
    see: "Ver",
    ok: "OK",
    requestedOn: "Enviado {day}",
    yourReason: "Tu nota",
    navBadge: "Correcciones de horario",
    navBadgeHint: "Aprobar, cambiar o rechazar las correcciones del equipo",
    ownTimeNote: "Tus propias solicitudes van a Kayky o Daniel.",
  },
};

export function tf(lang: string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  let s = STR[L(lang)][key] ?? STR.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
  return s;
}

export const TIME_FIX_KEYS = Object.keys(STR.en);
export const TIME_FIX_STRINGS = STR;
