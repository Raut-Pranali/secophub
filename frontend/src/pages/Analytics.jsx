import { useEffect, useState } from "react";
import api from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from "recharts";

const SEVERITY_COLORS = {
  Critical: "#ef4444",
  High:     "#f59e0b",
  Medium:   "#3b82f6",
  Low:      "#22c55e",
};

const STATUS_COLORS = {
  "Open":        "#ef4444",
  "In Progress": "#f59e0b",
  "Resolved":    "#22c55e",
  "Closed":      "#6b7280",
};

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

const tooltipStyle = {
  contentStyle: {
    background: "#111118",
    border: "1px solid #2a2a38",
    borderRadius: 8,
    fontSize: 12,
  },
  itemStyle: { color: "#cbd5e1" },
  labelStyle: { color: "#9ca3af" },
};

export default function Analytics() {
  const [vulns,   setVulns]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/api/vulnerabilities");
      setVulns(res.data.vulnerabilities || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Chart 1: Vulnerabilities over time — sorted by real date
  const timelineData = (() => {
    const counts = {};
    vulns.forEach(v => {
      if (!v.createdAt) return;
      const d = new Date(v.createdAt);
      const key = d.toISOString().split("T")[0]; // "2026-06-13"
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-10)
      .map(([key, count]) => ({
        date: new Date(key).toLocaleDateString("en-IN", {
          month: "short", day: "numeric"
        }),
        count,
      }));
  })();

  // Chart 2: Severity distribution
  const severityData = (() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    vulns.forEach(v => {
      if (counts[v.severity] !== undefined) counts[v.severity]++;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  })();

  // Chart 3: Status distribution
  const statusData = (() => {
    const counts = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
    vulns.forEach(v => {
      const s = v.status || "Open";
      if (counts[s] !== undefined) counts[s]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Stats
  const total      = vulns.length;
  const resolved   = vulns.filter(v => v.status === "Resolved").length;
  const critical   = vulns.filter(v => v.severity === "Critical").length;
  const resolvePct = total ? Math.round((resolved / total) * 100) : 0;
  const avgPerDay  = (() => {
    if (!vulns.length) return 0;
    const dates    = vulns.filter(v => v.createdAt).map(v => new Date(v.createdAt).toDateString());
    const uniqueDays = new Set(dates).size;
    return uniqueDays ? (vulns.length / uniqueDays).toFixed(1) : 0;
  })();

  const STAT_CARDS = [
    { label: "Total vulnerabilities", value: total,            color: "#3b82f6" },
    { label: "Critical severity",     value: critical,         color: "#ef4444" },
    { label: "Resolution rate",       value: `${resolvePct}%`, color: "#22c55e" },
    { label: "Avg per day",           value: avgPerDay,        color: "#f59e0b" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0d12", color: "#6b7280" }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
      }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>Analytics</h1>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          Based on {total} vulnerabilities
        </p>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {STAT_CARDS.map(c => (
            <div key={c.label} style={card}>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>{c.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Line Chart */}
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Vulnerabilities over time
          </p>
          {timelineData.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: 13 }}>Not enough data yet.</p>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Two charts side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Severity Donut */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Severity distribution
            </p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={3} cx="50%" cy="50%">
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => (
                    <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Bar Chart */}
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Status breakdown
            </p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}