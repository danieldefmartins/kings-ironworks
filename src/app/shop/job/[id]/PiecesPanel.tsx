"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Hammer, Plus, Trash2, Wrench } from "lucide-react";
import { pieceProgress, type JobPiece } from "@/lib/shop/shared";
import { t } from "@/lib/shop/i18n";

// How much of this job is actually done, in the unit the customer counts.
//
// The cut list answers "what steel do we need"; this answers "how many of the
// fourteen railing sections are up". They are different numbers and the crew
// was tracking the second one in their heads.
export default function PiecesPanel({
  jobId,
  pieces,
  lang = "en",
  canEdit = true,
}: {
  jobId: string;
  pieces: JobPiece[];
  lang?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const { total, fabricated, installed, pct } = pieceProgress(pieces);

  function act(payload: Record<string, unknown>) {
    start(async () => {
      await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      router.refresh();
    });
  }

  return (
    <section className="rounded-[22px] border border-white/10 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t(lang, "piecesTitle")}</h2>
        {total > 0 && (
          <span className="text-2xl font-bold tabular-nums text-amber-400">{pct}%</span>
        )}
      </div>

      {total > 0 && (
        <>
          {/* Two stacked fills rather than one: "10 built, 3 hung" is the
              status, and a single bar cannot say it. */}
          <div className="mt-3 space-y-1.5">
            <Bar
              label={t(lang, "fabricated")}
              done={fabricated}
              total={total}
              color="bg-sky-400"
              icon={<Hammer aria-hidden className="h-3.5 w-3.5" />}
            />
            <Bar
              label={t(lang, "installed")}
              done={installed}
              total={total}
              color="bg-emerald-400"
              icon={<Wrench aria-hidden className="h-3.5 w-3.5" />}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {t(lang, "piecesSummary", {
              fab: String(fabricated),
              inst: String(installed),
              total: String(total),
            })}
          </p>
        </>
      )}

      <div className="mt-4 space-y-3">
        {pieces.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-neutral-950/40 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="text-xs text-neutral-500">
                  {p.qty_total} {t(lang, "piecesUnit")}
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act({ type: "piece_delete", id: p.id })}
                  aria-label={t(lang, "delete")}
                  className="shrink-0 rounded-lg p-2 text-neutral-600 active:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Stepper
                label={t(lang, "fabricated")}
                value={p.qty_fabricated}
                max={p.qty_total}
                disabled={!canEdit || busy}
                onChange={(v) =>
                  act({ type: "piece_count", id: p.id, field: "qty_fabricated", value: v })
                }
              />
              <Stepper
                label={t(lang, "installed")}
                value={p.qty_installed}
                max={p.qty_total}
                disabled={!canEdit || busy}
                onChange={(v) =>
                  act({ type: "piece_count", id: p.id, field: "qty_installed", value: v })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {canEdit &&
        (adding ? (
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(lang, "piecesNamePlaceholder")}
              className="min-h-12 w-full rounded-xl bg-neutral-800 px-3 text-[16px]"
            />
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="min-h-12 w-24 rounded-xl bg-neutral-800 px-3 text-center text-[16px] tabular-nums"
              />
              <button
                type="button"
                disabled={busy || !name.trim()}
                onClick={() => {
                  act({ type: "piece_add", jobId, name, qty: Number(qty) || 1 });
                  setName("");
                  setQty("1");
                  setAdding(false);
                }}
                className="min-h-12 flex-1 rounded-xl bg-amber-500 font-bold text-black disabled:opacity-40"
              >
                {t(lang, "add")}
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="min-h-12 rounded-xl border border-neutral-700 px-4 font-bold text-neutral-300"
              >
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-700 font-bold text-neutral-400"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {pieces.length === 0 ? t(lang, "piecesAddFirst") : t(lang, "piecesAdd")}
          </button>
        ))}
    </section>
  );
}

function Bar({
  label,
  done,
  total,
  color,
  icon,
}: {
  label: string;
  done: number;
  total: number;
  color: string;
  icon: React.ReactNode;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs text-neutral-400">
        {icon}
        {label}
      </span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-800">
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-400">
        {done}/{total}
      </span>
    </div>
  );
}

// Big targets: this is tapped with work gloves on a tablet, so the buttons are
// 52px and the number between them is not itself a control.
function Stepper({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl bg-neutral-900 p-2">
      <div className="mb-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={disabled || value <= 0}
          onClick={() => onChange(value - 1)}
          aria-label={`${label} −`}
          className="h-[52px] flex-1 rounded-lg bg-neutral-800 text-xl font-bold text-neutral-300 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-12 text-center text-xl font-bold tabular-nums">{value}</span>
        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`${label} +`}
          className="h-[52px] flex-1 rounded-lg bg-neutral-800 text-xl font-bold text-neutral-300 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
