"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatCard from "@/components/StatCard";
import SessionTable from "@/components/SessionTable";

interface Summary {
  currentlyParked: number;
  todayEntries: number;
  todayCompleted: number;
  todayRevenue: number;
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [s, active] = await Promise.all([
        api.get("/api/stats/summary"),
        api.get("/api/sessions/active"),
      ]);
      setSummary(s);
      setRecent(active.sessions.slice(0, 6));
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink/50">Live snapshot of your parking lot, refreshed every 30s.</p>
      </header>

      {error && <div className="mb-6 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">{error}</div>}

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Currently parked" value={summary ? String(summary.currentlyParked) : "—"} accent="signal" />
        <StatCard label="Entries today" value={summary ? String(summary.todayEntries) : "—"} />
        <StatCard label="Completed today" value={summary ? String(summary.todayCompleted) : "—"} accent="clear" />
        <StatCard label="Revenue today" value={summary ? `$${summary.todayRevenue.toFixed(2)}` : "—"} accent="clear" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Recently parked</h2>
        <a href="/dashboard/active" className="text-sm font-medium text-signal">
          View all →
        </a>
      </div>
      <SessionTable sessions={recent} />
    </div>
  );
}
