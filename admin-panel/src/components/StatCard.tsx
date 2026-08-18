export default function StatCard({
  label,
  value,
  accent = "ink",
}: {
  label: string;
  value: string;
  accent?: "ink" | "signal" | "clear" | "alert";
}) {
  const accentClass = {
    ink: "text-ink",
    signal: "text-signal",
    clear: "text-clear",
    alert: "text-alert",
  }[accent];

  return (
    <div className="rounded-card border border-hairline bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className={`stat-figure mt-2 text-3xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}
