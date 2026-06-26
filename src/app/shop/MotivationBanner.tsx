import { QUOTES } from "@/lib/shop/i18n";

function dayIndex(mod: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return ((day % mod) + mod) % mod;
}

// `seed` is generated fresh on the server each request, so the quote changes
// every login / page load. Shows English (top) and Portuguese (bottom).
export default function MotivationBanner({
  seed,
  compact = false,
}: {
  lang?: string; // kept for compatibility; quote always shows EN + PT
  seed?: number;
  compact?: boolean;
}) {
  const len = QUOTES.en.length;
  const i = typeof seed === "number" ? ((seed % len) + len) % len : dayIndex(len);

  return (
    <div
      className={`rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-500/10 to-transparent ${
        compact ? "px-4 py-2.5" : "px-5 py-4"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 mb-1.5 flex items-center gap-1.5">
        <span aria-hidden>🔥</span>
        Today on the floor · Hoje na oficina
      </div>
      <div
        className={`font-display font-semibold text-amber-50 leading-snug ${
          compact ? "text-sm" : "text-[15px]"
        }`}
      >
        “{QUOTES.en[i]}”
      </div>
      <div
        className={`font-display text-amber-200/80 italic leading-snug mt-1 ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        “{QUOTES.pt[i]}”
      </div>
    </div>
  );
}
