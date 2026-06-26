"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface W {
  id: string;
  name: string;
  role: string;
}

export default function LoginClient({
  workers,
  loadError,
}: {
  workers: W[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [workerId, setWorkerId] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const worker = workers.find((w) => w.id === workerId) || null;

  async function submit(finalPin: string) {
    if (!worker) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/shop/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: worker.id, pin: finalPin }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Login failed");
        setPin("");
        setBusy(false);
        return;
      }
      router.replace("/shop");
      router.refresh();
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy || !worker) return;
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <div className="text-3xl font-display font-bold tracking-tight text-amber-500">
          KING IRON WORKS
        </div>
        <div className="text-neutral-400 text-sm uppercase tracking-[0.2em] mt-1">
          Shop Floor
        </div>
      </div>

      {loadError && (
        <div className="max-w-md text-center text-red-400 bg-red-950/40 border border-red-800 rounded-lg p-4 text-sm mb-6">
          {loadError}
        </div>
      )}

      <div className="w-full max-w-xs text-center">
        <label className="block text-sm text-neutral-400 mb-2 text-left">
          Who&apos;s working?
        </label>
        <select
          value={workerId}
          onChange={(e) => {
            setWorkerId(e.target.value);
            setPin("");
            setErr(null);
          }}
          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-4 text-lg focus:border-amber-500 outline-none appearance-none mb-6"
        >
          <option value="">Select your name…</option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {worker && (
          <>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mb-4">
              Enter PIN
            </div>
            <div className="flex justify-center gap-3 mb-5 h-6">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    pin.length > i ? "bg-amber-500" : "bg-neutral-700"
                  }`}
                />
              ))}
            </div>
            {err && <div className="text-red-400 text-sm mb-3">{err}</div>}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => press(d)}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl py-5 text-2xl font-semibold active:scale-95 transition"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  setWorkerId("");
                  setPin("");
                  setErr(null);
                }}
                className="rounded-xl py-5 text-sm text-neutral-400"
              >
                Clear
              </button>
              <button
                onClick={() => press("0")}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl py-5 text-2xl font-semibold active:scale-95 transition"
              >
                0
              </button>
              <button
                onClick={() => setPin(pin.slice(0, -1))}
                className="rounded-xl py-5 text-sm text-neutral-400"
              >
                ⌫
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
