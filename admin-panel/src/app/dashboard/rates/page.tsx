"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Rate {
  id: string;
  label: string;
  durationHours: number;
  price: number;
}

export default function RatesPage() {
  const { profile } = useAuth();
  const [rates, setRates] = useState<Rate[]>([]);
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.get("/api/rates");
    setRates(data.rates);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post("/api/rates", {
        label,
        durationHours: Number(hours),
        price: Number(price),
      });
      setLabel("");
      setHours("");
      setPrice("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this rate plan? Managers will no longer be able to select it.")) return;
    await api.del(`/api/rates/${id}`);
    await load();
  }

  const isOwner = profile?.role === "owner";

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Rate plans</h1>
        <p className="mt-1 text-sm text-ink/50">
          Duration presets managers choose from at car entry, e.g. 5 hours, 12 hours, 24 hours.
        </p>
      </header>

      {isOwner && (
        <form onSubmit={handleCreate} className="mb-8 grid grid-cols-1 gap-4 rounded-card border border-hairline bg-white p-5 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Label</label>
            <input
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="12 hours"
              className="w-full rounded-md border border-hairline px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Duration (hrs)</label>
            <input
              required
              type="number"
              min={0.5}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="12"
              className="w-full rounded-md border border-hairline px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Price ($)</label>
            <input
              required
              type="number"
              min={0}
              step={0.5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10"
              className="w-full rounded-md border border-hairline px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={busy}
              className="w-full rounded-md bg-ink py-2 text-sm font-medium text-white hover:bg-ink/80 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add rate plan"}
            </button>
          </div>
          {error && <p className="col-span-full text-sm text-alert">{error}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-card border border-hairline bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hairline bg-slab/60 text-xs uppercase tracking-wide text-ink/50">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Price</th>
              {isOwner && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3 font-medium">{r.label}</td>
                <td className="px-4 py-3 text-ink/70">{r.durationHours}h</td>
                <td className="stat-figure px-4 py-3">${r.price.toFixed(2)}</td>
                {isOwner && (
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} className="text-xs font-medium text-alert">
                      Deactivate
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {rates.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink/50">
                  No rate plans yet{isOwner ? " — add one above." : "."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
