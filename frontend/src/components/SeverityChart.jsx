export default function SeverityChart({ stats, loading }) {
  if (loading) return (
    <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: 13 }}>
      Loading...
    </div>
  );

  const max = stats.total || 1;
  const bars = [
    { label: "Critical", value: stats.critical ?? 0, color: "#ef4444" },
    { label: "High",     value: stats.high     ?? 0, color: "#f59e0b" },
    { label: "Medium",   value: stats.medium   ?? 0, color: "#3b82f6" },
    { label: "Low",      value: stats.low      ?? 0, color: "#22c55e" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {bars.map(({ label, value, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 52, fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: 8, background: "#1a1a24", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.round((value / max) * 100)}%`,
              background: color,
              borderRadius: 4,
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
          <span style={{ width: 24, fontSize: 12, fontWeight: 600, color: "#e2e8f0", textAlign: "right" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}