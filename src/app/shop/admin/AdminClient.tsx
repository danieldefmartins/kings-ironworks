"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  hourly_rate: number | null;
}
interface JobRow {
  jobId: string;
  label: string;
  totalHours: number;
  totalCost: number;
  missingRate: boolean;
  byWorker: Record<string, { hours: number; cost: number | null }>;
}
interface EntryRow {
  id: string;
  worker: string;
  job: string;
  started_at: string;
  ended_at: string | null;
  hours: number;
  start_lat?: number | null;
  start_lng?: number | null;
  end_lat?: number | null;
  end_lng?: number | null;
}

interface DepositRow {
  id: string;
  jobNumber: string;
  customer: string;
  projectType: string | null;
  amount: number;
  note: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  followUp: string | null;
  laborCost: number;
}

function mapLink(lat?: number | null, lng?: number | null) {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function money(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminClient({
  workers,
  jobs,
  entries,
  deposits,
  depositTotal,
}: {
  workers: WorkerRow[];
  jobs: JobRow[];
  entries: EntryRow[];
  deposits: DepositRow[];
  depositTotal: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(workers.map((w) => [w.id, w.hourly_rate?.toString() ?? ""]))
  );
  const [open, setOpen] = useState<string | null>(null);
  const [openDep, setOpenDep] = useState<string | null>(null);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/shop/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const running = entries.filter((e) => !e.ended_at);

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24 space-y-8">
      {/* Live now */}
      {running.length > 0 && (
        <section>
          <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm mb-2">
            ● On the clock right now
          </h2>
          <div className="space-y-2">
            {running.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 bg-green-950/30 border border-green-700 rounded-lg p-3"
              >
                <div className="min-w-0 text-sm">
                  <span className="font-semibold text-green-200">{e.worker}</span>
                  <span className="text-neutral-400"> · {e.job}</span>
                  <span className="block text-xs text-neutral-500">
                    since {fmtDT(e.started_at)} · {e.hours.toFixed(1)} h
                    {mapLink(e.start_lat, e.start_lng) && (
                      <a
                        href={mapLink(e.start_lat, e.start_lng)!}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-amber-400 underline"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        📍 map
                      </a>
                    )}
                  </span>
                </div>
                <button
                  disabled={busy}
                  onClick={() => act({ type: "entry_stop", id: e.id })}
                  className="shrink-0 rounded-lg border border-red-600 text-red-300 px-3 py-2 text-sm font-semibold"
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Customer deposits */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-2">
          <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm">
            Customer Deposits Received
          </h2>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-emerald-300">{money(depositTotal)}</div>
            <div className="text-[10px] text-neutral-500 uppercase">
              {deposits.length} customers
            </div>
          </div>
        </div>
        {deposits.length === 0 && (
          <p className="text-sm text-neutral-600 italic">No deposits recorded yet.</p>
        )}
        <div className="space-y-2">
          {deposits.map((d) => (
            <div
              key={d.id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg"
            >
              <button
                onClick={() => setOpenDep(openDep === d.id ? null : d.id)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.customer}</div>
                  <div className="text-xs text-neutral-500 truncate">
                    {d.jobNumber}
                    {d.projectType ? ` · ${d.projectType}` : ""}
                    {d.note ? ` · ${d.note}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-emerald-300">{money(d.amount)}</div>
                  <div className="text-[10px] text-neutral-500 uppercase">deposit</div>
                </div>
              </button>
              {openDep === d.id && (
                <div className="border-t border-neutral-800 px-3 py-2 space-y-1 text-sm">
                  {d.address && <div className="text-neutral-400">{d.address}</div>}
                  {d.phone && (
                    <div>
                      <a href={`tel:${d.phone}`} className="text-amber-400 underline">
                        {d.phone}
                      </a>
                    </div>
                  )}
                  {d.email && (
                    <div>
                      <a href={`mailto:${d.email}`} className="text-amber-400 underline">
                        {d.email}
                      </a>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-400 pt-1">
                    <span>Labor logged against this job</span>
                    <span>{money(d.laborCost)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-300 font-medium">
                    <span>Deposit remaining after labor</span>
                    <span
                      className={
                        d.amount - d.laborCost < 0 ? "text-red-400" : "text-emerald-300"
                      }
                    >
                      {money(d.amount - d.laborCost)}
                    </span>
                  </div>
                  {d.followUp && (
                    <div className="mt-2 rounded-md border border-amber-800 bg-amber-950/30 px-2.5 py-2 text-xs text-amber-200 whitespace-pre-line">
                      {d.followUp}
                    </div>
                  )}
                  <Link
                    href={`/shop/job/${d.id}`}
                    className="inline-block mt-2 text-xs text-amber-400 underline"
                  >
                    Open job traveler →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Pay rates */}
      <section>
        <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm mb-2">
          Worker Pay Rates <span className="text-neutral-500 normal-case font-normal">(only you see this)</span>
        </h2>
        <div className="space-y-2">
          {workers.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-neutral-500">{w.role}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">$</span>
                <input
                  value={rates[w.id] ?? ""}
                  onChange={(ev) => setRates({ ...rates, [w.id]: ev.target.value })}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-24 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-right focus:border-amber-500 outline-none"
                />
                <span className="text-neutral-500 text-xs">/hr</span>
              </div>
              <button
                disabled={busy}
                onClick={() => act({ type: "rate_set", workerId: w.id, rate: rates[w.id] })}
                className="rounded-lg bg-amber-500 text-black font-semibold px-4 py-2 text-sm active:scale-95 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Labor cost per project */}
      <section>
        <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm mb-2">
          Labor Cost by Project
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-neutral-600 italic">
            No time logged yet. Costs appear as the crew presses START/DONE on jobs.
          </p>
        )}
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.jobId} className="bg-neutral-900 border border-neutral-800 rounded-lg">
              <button
                onClick={() => setOpen(open === j.jobId ? null : j.jobId)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{j.label}</div>
                  <div className="text-xs text-neutral-500">
                    {j.totalHours.toFixed(1)} h total
                    {j.missingRate && (
                      <span className="text-amber-400"> · some workers have no rate set</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-amber-400">
                    {money(j.totalCost)}
                    {j.missingRate ? "+" : ""}
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">labor cost</div>
                </div>
              </button>
              {open === j.jobId && (
                <div className="border-t border-neutral-800 px-3 py-2 space-y-1">
                  {Object.entries(j.byWorker).map(([name, v]) => (
                    <div key={name} className="flex justify-between text-sm">
                      <span className="text-neutral-300">{name}</span>
                      <span className="text-neutral-400">
                        {v.hours.toFixed(1)} h ·{" "}
                        {v.cost === null ? (
                          <span className="text-amber-400">no rate</span>
                        ) : (
                          money(v.cost)
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recent sessions */}
      <section>
        <h2 className="text-amber-500 font-display font-bold uppercase tracking-wide text-sm mb-2">
          Recent Sessions
        </h2>
        <div className="space-y-1.5">
          {entries.slice(0, 40).map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <span className="font-medium">{e.worker}</span>
                <span className="text-neutral-500"> · {e.job}</span>
                <span className="block text-xs text-neutral-500">
                  {fmtDT(e.started_at)}
                  {e.ended_at ? ` → ${fmtDT(e.ended_at)}` : " → running"} ·{" "}
                  {e.hours.toFixed(2)} h
                  {mapLink(e.start_lat, e.start_lng) && (
                    <a
                      href={mapLink(e.start_lat, e.start_lng)!}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-amber-400 underline"
                    >
                      📍 start
                    </a>
                  )}
                  {mapLink(e.end_lat, e.end_lng) && (
                    <a
                      href={mapLink(e.end_lat, e.end_lng)!}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1.5 text-amber-400 underline"
                    >
                      📍 end
                    </a>
                  )}
                </span>
              </div>
              <button
                disabled={busy}
                onClick={() => act({ type: "entry_delete", id: e.id })}
                className="shrink-0 w-8 h-8 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-neutral-800"
                aria-label="delete entry"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
