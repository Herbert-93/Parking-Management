"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import SessionTable from "@/components/SessionTable";

export default function ActivePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.get("/api/sessions/active");
      setSessions(data.sessions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleExit(id: string) {
    if (!confirm("Log this car out now and calculate its final cost?")) return;
    try {
      await api.post(`/api/sessions/${id}/exit`);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Currently parked</h1>
        <p className="mt-1 text-sm text-ink/50">{sessions.length} car(s) in the lot right now.</p>
      </header>

      {error && <div className="mb-6 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">{error}</div>}
      {!loading && <SessionTable sessions={sessions} onExit={handleExit} />}
    </div>
  );
}
