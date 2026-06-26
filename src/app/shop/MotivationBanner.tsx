import { QUOTES, t, asLang } from "@/lib/shop/i18n";

function dayIndex(mod: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return ((day % mod) + mod) % mod;
}

// Rotates daily so the crew sees a fresh line each morning.
export default function MotivationBanner({
  lang = "en",
  compact = false,
}: {
  lang?: string;
  compact?: boolean;
}) {
  const quotes = QUOTES[asLang(lang)];
  const quote = quotes[dayIndex(quotes.length)];

  return (
    <div
      className={`rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-500/10 to-transparent ${
        compact ? "px-4 py-2.5" : "px-5 py-4"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 mb-0.5">
        {t(lang, "todayFloor")}
      </div>
      <div
        suppressHydrationWarning
        className={`font-display font-semibold text-amber-100 ${
          compact ? "text-sm" : "text-base"
        }`}
      >
        “{quote}”
      </div>
    </div>
  );
}
