"use client";

import { useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, ShieldCheck, X } from "lucide-react";
import { t } from "@/lib/shop/i18n";
import MenuDirectory from "./MenuDirectory";

export default function AdminMenu({ lang = "en" }: { lang?: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" aria-label={t(lang, "admHubTitle")} className="flex min-h-12 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-semibold text-amber-400">
      <ShieldCheck aria-hidden className="h-4 w-4" /><span className="hidden sm:inline">{t(lang, "admNavShort")}</span><ChevronDown aria-hidden className="h-3.5 w-3.5" />
    </button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/75" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900 p-4 text-neutral-100 shadow-2xl">
        <div className="mb-1 flex items-center justify-between gap-3"><Dialog.Title className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck aria-hidden className="h-5 w-5 text-amber-400" />{t(lang, "admHubTitle")}</Dialog.Title><Dialog.Close aria-label={t(lang, "close")} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10"><X aria-hidden className="h-5 w-5" /></Dialog.Close></div>
        <Dialog.Description className="mb-4 text-sm text-neutral-400">{t(lang, "admHubHint")}</Dialog.Description>
        <MenuDirectory scope="admin" lang={lang} compact onNavigate={() => setOpen(false)} />
        <Link href="/shop/admin" onClick={() => setOpen(false)} className="mt-4 flex min-h-12 items-center justify-center rounded-xl border border-amber-500/30 font-semibold text-amber-400">{t(lang, "admOpenHub")}</Link>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
