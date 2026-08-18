"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import SessionTable from "@/components/SessionTable";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [status, setStatus] = useState<"all" | "active" | "completed">("all");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const query = status === "all" ? "" : `?status=${status}`;
      const data = await api.get(`/api/sessions${query}`);
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">History</h1>
          <p className="mt-1 text-sm text-ink/50">All logged parking sessions for your lot.</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-md border border-hairline bg-white px-3 py-2 text-sm"
        >
          <option value="all">All sessions</option>
          <option value="active">Parked</option>
          <option value="completed">Completed</option>
        </select>
      </header>

      {error && <div className="mb-6 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">{error}</div>}
      <SessionTable sessions={sessions} />
    </div>
  );
}
