"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ShopTopBar({
  workerName,
  title,
  back,
}: {
  workerName: string;
  title: string;
  back?: string;
}) {
  const router = useRouter();
  async function logout() {
    await fetch("/shop/api/logout", { method: "POST" });
    router.replace("/shop/login");
    router.refresh();
  }
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-neutral-900/95 backdrop-blur border-b border-neutral-800 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {back && (
          <Link
            href={back}
            className="shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            ← Jobs
          </Link>
        )}
        <div className="truncate">
          <div className="text-amber-500 font-display font-bold leading-tight truncate">
            {title}
          </div>
          <div className="text-[11px] text-neutral-500 uppercase tracking-widest">
            King Iron Works · Shop Floor
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm text-neutral-300 hidden sm:inline">
          {workerName}
        </span>
        <button
          onClick={logout}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
