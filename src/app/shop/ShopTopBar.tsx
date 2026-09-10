"use client";

import { useRouter } from "next/navigation";
import { allEdits, clearAllEdits } from "@/lib/shop/outbox";
import Link from "next/link";
import Image from "next/image";
import { t } from "@/lib/shop/i18n";
import AdminMenu from "./AdminMenu";
import MenuDirectory from "./MenuDirectory";
import MoreMenu, { MoreItem } from "./MoreMenu";
import { ChevronLeft, UserRound } from "lucide-react";

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
    <div className="sticky top-0 z-10 grid min-h-[64px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 bg-neutral-950/85 px-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        {back ? (
          <Link
            href={back}
            aria-label={t(lang, "back")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-neutral-300 active:bg-neutral-800"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
        ) : null}
        <Link
          href="/shop"
          aria-label="King Iron Works"
          className="flex h-10 w-[66px] shrink-0 items-center justify-center"
        >
          <Image src="/images/logo-white-transparent.png" alt="King Iron Works" width={1536} height={1024} className="h-auto w-full" priority />
        </Link>
      </div>
      <h1 className="min-w-0 truncate text-center text-base font-semibold tracking-tight text-neutral-100 sm:text-xl">{title}</h1>
      <div className="col-start-3 flex items-center justify-end gap-2">
        {adminLink && <AdminMenu lang={lang} />}
        <span className="hidden max-w-24 truncate text-sm text-neutral-300 lg:inline">{workerName}</span>
        <MoreMenu label={t(lang, "menuCrew")} closeLabel={t(lang, "close")}>
          {(close) => (
            <>
              <MenuDirectory scope="crew" lang={lang} compact onNavigate={close} />
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
              <MoreItem href="/shop/more"><UserRound className="mr-3 h-5 w-5" /> {t(lang, "menuCrew")}</MoreItem>
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
