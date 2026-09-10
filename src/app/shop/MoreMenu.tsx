"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu } from "lucide-react";

// Radix handles focus trapping, Escape, scroll locking and focus restoration.
export default function MoreMenu({ label, closeLabel, children, align = "right" }: {
  label: string; closeLabel: string;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><button type="button" className={`flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-neutral-200 ${align === "left" ? "mr-auto" : ""}`}><Menu aria-hidden className="h-6 w-6" /><span className="sr-only">{label}</span></button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75" />
      <Dialog.Content aria-describedby={undefined} className="fixed bottom-4 left-1/2 z-[51] max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-y-auto rounded-2xl border border-neutral-700 bg-neutral-900 p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-neutral-100 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div className="mb-3 flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-bold">{label}</Dialog.Title><Dialog.Close className="min-h-12 rounded-xl border border-neutral-700 px-3 font-semibold">{closeLabel}</Dialog.Close></div>
        <div className="space-y-4">{children(() => setOpen(false))}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;

}

// One row inside a MoreMenu. Sized for a gloved thumb, separated from its
// neighbours, and tinted red when it destroys something.
export function MoreItem({
  onClick,
  href,
  children,
  danger = false,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const cls = `flex min-h-[56px] w-full items-center rounded-xl border px-4 text-left font-bold ${
    danger
      ? "mt-4 border-red-800 bg-red-950/40 text-red-300 active:bg-red-950/70"
      : "border-neutral-700 bg-neutral-800 text-neutral-200 active:bg-neutral-700"
  }`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
