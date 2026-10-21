// First- and last-touch ad attribution, stored for 90 days and sent with every CRM submit/activity.
// The 360 API accepts only these keys (strict schema in pro.ts `attributionSchema`); everything else
// (gbraid, wbraid, msclkid, landing page, first-touch channel) is packed into `source`.

export type Attribution = Partial<
  Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term" | "gclid" | "fbclid" | "source" | "referrer", string>
>;

type Touch = Record<string, string> & { at: string; landing: string };
const KEY = "kiw-attribution-v1";
const DAYS_90 = 90 * 24 * 60 * 60 * 1000;
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "gbraid", "wbraid", "fbclid", "msclkid"];

function read(): { first?: Touch; last?: Touch } {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    const fresh = (t?: Touch) => (t && Date.now() - Date.parse(t.at) < DAYS_90 ? t : undefined);
    return { first: fresh(data.first), last: fresh(data.last) };
  } catch {
    return {};
  }
}

/** Call once per page load. Records a touch when the URL carries campaign data or an external referrer. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const touch: Touch = { at: new Date().toISOString(), landing: url.pathname };
  for (const p of PARAMS) {
    const v = url.searchParams.get(p);
    if (v) touch[p] = v.slice(0, p.endsWith("clid") || p.endsWith("braid") ? 500 : 300);
  }
  let ref = "";
  try {
    if (document.referrer && new URL(document.referrer).host !== url.host) ref = new URL(document.referrer).origin;
  } catch {
    /* malformed referrer: ignore */
  }
  if (ref) touch.referrer = ref;
  const hasCampaign = PARAMS.some((p) => touch[p]);
  const stored = read();
  if (!hasCampaign && !ref && stored.first) return; // internal navigation: keep existing touches
  const next = { first: stored.first ?? touch, last: hasCampaign || ref || !stored.last ? touch : stored.last };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: attribution simply isn't stored */
  }
}

export function channelOf(t?: Record<string, string>) {
  if (!t) return "direct";
  if (t.gclid || t.gbraid || t.wbraid) return "google-ads";
  if (t.fbclid && (t.utm_medium || "").match(/cpc|paid|ads/)) return "meta-ads";
  if (t.msclkid) return "microsoft-ads";
  if (t.utm_source) return `${t.utm_source}${t.utm_medium ? "/" + t.utm_medium : ""}`;
  if (t.fbclid) return "facebook";
  if (t.referrer) {
    const host = t.referrer.replace(/^https?:\/\//, "");
    return /google\.|bing\.|duckduckgo\.|yahoo\./.test(host) ? `organic/${host}` : `referral/${host}`;
  }
  return "direct";
}

/** Payload for the CRM: last-touch campaign fields, with first touch + extra click ids summarized in `source`. */
export function attributionPayload(): Attribution {
  if (typeof window === "undefined") return {};
  const { first, last } = read();
  const t = last ?? first;
  const out: Attribution = {};
  if (t) {
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "referrer"] as const)
      if (t[k]) out[k] = t[k];
  }
  const extra = [
    `last:${channelOf(last)}`,
    `first:${channelOf(first)}`,
    `lp:${(t?.landing || window.location.pathname).slice(0, 80)}`,
    `page:${window.location.pathname.slice(0, 80)}`,
    t?.gbraid ? `gbraid:${t.gbraid}` : "",
    t?.wbraid ? `wbraid:${t.wbraid}` : "",
    t?.msclkid ? `msclkid:${t.msclkid}` : "",
  ].filter(Boolean);
  out.source = extra.join(" | ").slice(0, 300);
  return out;
}
