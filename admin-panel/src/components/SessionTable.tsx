"use client";

import { formatUGX } from "@/lib/currency";

interface Session {
  id: string;
  plateNumber: string;
  photoBase64: string | null;
  rateLabel: string;
  ratePrice: number;
  durationHours: number;
  entryTime: { _seconds: number } | string;
  expectedExitTime: { _seconds: number } | string;
  exitTime: { _seconds: number } | string | null;
  status: "active" | "completed";
  finalCost: number | null;
  overageCost: number | null;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === "string") return new Date(value);
  if (value._seconds) return new Date(value._seconds * 1000);
  return null;
}

function fmt(value: any) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(hours: number) {
  if (hours == null) return "—";
  return Number.isInteger(hours) ? `${hours}h` : `${hours}h`;
}

export default function SessionTable({
  sessions,
  onExit,
}: {
  sessions: Session[];
  onExit?: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-hairline bg-white/50 py-16 text-center text-sm text-ink/50">
        No sessions to show yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card border border-hairline bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-slab/60 text-xs uppercase tracking-wide text-ink/50">
            <th className="px-4 py-3">Photo</th>
            <th className="px-4 py-3">Plate</th>
            <th className="px-4 py-3">Duration</th>
            <th className="px-4 py-3">Rate</th>
            <th className="px-4 py-3">Entered</th>
            <th className="px-4 py-3">Expected exit</th>
            <th className="px-4 py-3">Exited</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Status</th>
            {onExit && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-b border-hairline last:border-0 hover:bg-slab/40">
              <td className="px-4 py-3">
                {s.photoBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.photoBase64}
                    alt={s.plateNumber}
                    className="h-10 w-10 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slab text-[9px] text-ink/30">
                    No photo
                  </div>
                )}
              </td>
              <td className="plate px-4 py-3 font-semibold">{s.plateNumber}</td>
              <td className="px-4 py-3 text-ink/70">
                <span className="inline-flex items-center gap-1 rounded-full bg-slab px-2 py-0.5 font-medium text-ink">
                  {fmtDuration(s.durationHours)}
                </span>
              </td>
              <td className="stat-figure px-4 py-3 text-ink/80">{formatUGX(s.ratePrice)}</td>
              <td className="px-4 py-3 text-ink/70">{fmt(s.entryTime)}</td>
              <td className="px-4 py-3 text-ink/70">{fmt(s.expectedExitTime)}</td>
              <td className="px-4 py-3 text-ink/70">{s.exitTime ? fmt(s.exitTime) : "—"}</td>
              <td className="stat-figure px-4 py-3 font-medium">
                {s.finalCost != null ? formatUGX(s.finalCost) : "—"}
                {s.overageCost ? (
                  <span className="ml-1 text-xs text-alert">(+{formatUGX(s.overageCost)} overage)</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    s.status === "active" ? "bg-signal/15 text-signal" : "bg-clear/15 text-clear"
                  }`}
                >
                  {s.status === "active" ? "Parked" : "Completed"}
                </span>
              </td>
              {onExit && (
                <td className="px-4 py-3">
                  {s.status === "active" && (
                    <button
                      onClick={() => onExit(s.id)}
                      className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink/80"
                    >
                      Log out
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}