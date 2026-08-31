"use client";

import { useRouter } from "next/navigation";
import { allEdits, clearAllEdits } from "@/lib/shop/outbox";
import Link from "next/link";
import { t } from "@/lib/shop/i18n";
import MoreMenu, { MoreItem } from "./MoreMenu";

export default function ShopTopBar({
  workerName,
  title,
  back,
  lang = "en",
  adminLink = false,
}: {
  workerName: string;
  title: string;
  back?: string;
  lang?: string;
  adminLink?: boolean;
}) {
  const router = useRouter();
  async function logout() {
    // Anything still queued belongs to the worker signing out. A shop tablet
    // is shared, so it must not follow them into the next worker's session.
    const stuck = await allEdits();
    if (stuck.length > 0) {
      const ok = window.confirm(t(lang, "signOutPending"));
      if (!ok) return;
    }
    await clearAllEdits();
    await fetch("/shop/api/logout", { method: "POST" });
    router.replace("/shop/login");
    router.refresh();
  }
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {back ? (
          <Link
            href={back}
            className="flex min-h-[48px] shrink-0 items-center rounded-lg border border-neutral-700 px-3 text-sm hover:bg-neutral-800"
          >
            ← {t(lang, "jobs")}
          </Link>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/logo-white-transparent.png"
            alt="King Iron Works"
            className="h-9 w-auto shrink-0"
          />
        )}
        <div className="truncate">
          <div className="text-amber-500 font-display font-bold leading-tight truncate">
            {title}
          </div>
          <div className="text-[11px] text-neutral-500 uppercase tracking-widest">
            King Iron Works · {t(lang, "shopFloor")}
          </div>
        </div>
      </div>
      {/* Language, admin and sign-out are housekeeping. They live behind one
          button so the bar can be the job the worker is standing in front of. */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden text-sm text-neutral-300 sm:inline">{workerName}</span>
        <MoreMenu label={t(lang, "more")} closeLabel={t(lang, "close")}>
          {(close) => (
            <>
              <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                {t(lang, "language")}
              </div>
              <div className="flex gap-2">
                {(["en", "pt", "es"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={async () => {
                      close();
                      await fetch("/shop/api/action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "lang_set", lang: l }),
                      });
                      router.refresh();
                    }}
                    className={`min-h-[48px] flex-1 rounded-xl border font-bold ${
                      lang === l
                        ? "border-amber-500 bg-amber-500/10 text-amber-300"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              {adminLink && <MoreItem href="/shop/admin">⚙ Admin</MoreItem>}
              <MoreItem
                onClick={() => {
                  close();
                  logout();
                }}
              >
                ⇥ {t(lang, "signOut")}
              </MoreItem>
            </>
          )}
        </MoreMenu>
      </div>
    </div>
  );
}
