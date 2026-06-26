import { QUOTES, t, asLang } from "@/lib/shop/i18n";

// `seed` is generated fresh on the server each request, so the quote changes
// every login / page load. Passing it as a prop avoids hydration mismatches.
export default function MotivationBanner({
  lang = "en",
  seed = 0,
  compact = false,
}: {
  lang?: string;
  seed?: number;
  compact?: boolean;
}) {
  const quotes = QUOTES[asLang(lang)];
  const quote = quotes[((seed % quotes.length) + quotes.length) % quotes.length];

  return (
    <div
      className={`rounded-xl border border-amber-600/30 bg-gradient-to-r from-amber-500/10 to-transparent ${
        compact ? "px-4 py-2.5" : "px-5 py-4"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500/80 mb-1 flex items-center gap-1.5">
        <span aria-hidden>🔥</span>
        {t(lang, "todayFloor")}
      </div>
      <div
        className={`font-display font-semibold text-amber-50 leading-snug ${
          compact ? "text-sm" : "text-[15px]"
        }`}
      >
        “{quote}”
      </div>
    </div>
  );
}
