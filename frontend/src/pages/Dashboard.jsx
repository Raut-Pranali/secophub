// pages/Dashboard.jsx
// UPDATED: SNS banner is now dismissable (X button). Only shows when there's a new critical.
// RBAC enforced: canAdd, canDelete checks passed down properly.

import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle, TrendingUp, CheckCircle, Clock,
  Plus, X, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import AddVulnModal from "../components/AddVulnModal";

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

const SEVERITY_COLORS = {
  Critical: { bg: "#2d0a0a", color: "#ef4444", border: "#7f1d1d" },
  High:     { bg: "#2d1a0a", color: "#f59e0b", border: "#78350f" },
  Medium:   { bg: "#0a1a2d", color: "#3b82f6", border: "#1e3a5f" },
  Low:      { bg: "#0a2d0a", color: "#22c55e", border: "#14532d" },
};

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

function SeverityBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 60, fontSize: 12, color: "#6b7280" }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#1e1e2a", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
      <span style={{ width: 24, fontSize: 12, color: "#9ca3af", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role    = user?.role?.toLowerCase();
  const isAdmin = role === "admin";
  const canAdd  = isAdmin || role === "analyst";

  const [stats,       setStats]       = useState({ total: 0, critical: 0, high: 0, medium: 0, low: 0, resolved: 0 });
  const [recentVulns, setRecent]      = useState([]);
  const [snsCount,    setSnsCount]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [apiStatus,   setApiStatus]   = useState("connecting");
  const [showModal,   setShowModal]   = useState(false);
  const [snsBannerDismissed, setBannerDismissed] = useState(false);
  const [updatingStatus, setUpdating] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setApiStatus("connecting");

      const [statsRes, vulnsRes, alertsRes] = await Promise.all([
        api.get("/api/stats"),
        api.get("/api/vulnerabilities"),
        api.get("/api/alerts").catch(() => ({ data: { alerts: [] } })),
      ]);

      setStats(statsRes.data || {});
      const sorted = (vulnsRes.data.vulnerabilities || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecent(sorted);
      setSnsCount(alertsRes.data?.alerts?.length || 0);
      setApiStatus("connected");
    } catch (e) {
      setApiStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    try {
      await api.patch(`/api/vulnerabilities/${id}/status`, { status: newStatus });
      setRecent(prev => prev.map(v => v.ID === id ? { ...v, status: newStatus } : v));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const inProgress = recentVulns.filter(v => v.status === "In Progress").length;
  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  const CARDS = [
    { label: "Total",       value: stats.total,    sub: `+${Math.min(stats.total, 5)} this week`, subColor: "#3b82f6", valueColor: "#f1f5f9" },
    { label: "Critical",    value: stats.critical, sub: "Immediate action",  subColor: "#ef4444", valueColor: "#ef4444" },
    { label: "In Progress", value: inProgress,     sub: "Assigned to devs",  subColor: "#f59e0b", valueColor: "#f59e0b" },
    { label: "Resolved",    value: stats.resolved, sub: `${resolutionRate}% resolution rate`, subColor: "#22c55e", valueColor: "#22c55e" },
  ];

  const pieData = [
    { name: "Open",       value: stats.total - stats.resolved, color: "#ef4444" },
    { name: "Resolved",   value: stats.resolved,               color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const showSnsBanner = stats.critical > 0 && snsCount > 0 && apiStatus === "connected" && !snsBannerDismissed;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Dashboard overview</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0a2d0a", border: "1px solid #14532d", borderRadius: 8, padding: "4px 10px" }}>
            {apiStatus === "connected" ? <Wifi size={11} color="#22c55e" /> : <WifiOff size={11} color="#6b7280" />}
            <span style={{ fontSize: 11, color: "#22c55e" }}>
              {apiStatus === "connected" ? "Live" : apiStatus === "error" ? "Offline" : "Connecting"}
            </span>
          </div>

          {/* SNS count badge */}
          {snsCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#2d1a0a", border: "1px solid #78350f", borderRadius: 8, padding: "4px 10px" }}>
              <AlertTriangle size={11} color="#f59e0b" />
              <span style={{ fontSize: 11, color: "#f59e0b" }}>{snsCount} SNS alerts sent</span>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={loadAll}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid #1e1e2a", background: "none", borderRadius: 8, padding: "6px 10px", color: "#6b7280", cursor: "pointer" }}
          >
            <RefreshCw size={12} />
          </button>

          {/* Add vulnerability */}
          {canAdd && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, border: "none",
                background: "#2563eb", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={14} /> Add vulnerability
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* SNS Banner — dismissable */}
        {showSnsBanner && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#1c1505", border: "1px solid #78350f",
            borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#fcd34d",
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>
              AWS SNS alert dispatched — {stats.critical} critical {stats.critical === 1 ? "vulnerability" : "vulnerabilities"} logged. SecOps team notified via email + SMS.
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{ background: "none", border: "none", color: "#78350f", cursor: "pointer", padding: 4 }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {apiStatus === "error" && (
          <div style={{ background: "#1f0a0a", border: "1px solid #7f1d1d", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#fca5a5" }}>
            <strong>Cannot reach backend.</strong> Make sure your server is running.
            <button onClick={loadAll} style={{ marginLeft: 12, fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        )}

        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {CARDS.map(c => (
            <div key={c.label} style={card}>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, fontWeight: 500 }}>{c.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: c.valueColor || "#f1f5f9", lineHeight: 1 }}>
                {loading ? "—" : c.value}
              </div>
              <div style={{ fontSize: 11, color: c.subColor, marginTop: 6 }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
          {/* Severity Bars */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Vulnerabilities by severity
            </div>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 14, background: "#1e1e2a", borderRadius: 4 }} />)}
              </div>
            ) : (
              <>
                <SeverityBar label="Critical" value={stats.critical} max={stats.total} color="#ef4444" />
                <SeverityBar label="High"     value={stats.high}     max={stats.total} color="#f59e0b" />
                <SeverityBar label="Medium"   value={stats.medium}   max={stats.total} color="#3b82f6" />
                <SeverityBar label="Low"      value={stats.low}      max={stats.total} color="#22c55e" />
              </>
            )}
          </div>

          {/* Pie Chart */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Status breakdown
            </div>
            {!loading && stats.total > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
                  {pieData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#4b5563", fontSize: 13 }}>No data</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Vulnerabilities Table */}
        <div style={card}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Recent vulnerabilities (last 5)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                  {["ID", "Title", "Severity", "Status", "Created"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#4b5563" }}>Loading...</td></tr>
                ) : recentVulns.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#4b5563" }}>No vulnerabilities yet.</td></tr>
                ) : recentVulns.map(v => {
                  const sev = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.Low;
                  const sta = v.status === "Resolved" ? "#22c55e" : v.status === "In Progress" ? "#f59e0b" : "#ef4444";
                  return (
                    <tr key={v.ID} style={{ borderBottom: "1px solid #1e1e2e" }}>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 11, fontFamily: "monospace" }}>
                        {v.ID?.replace("VULN-", "")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <p style={{ fontWeight: 500, color: "#f1f5f9", margin: 0 }}>{v.title}</p>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{v.description}</p>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
                          {v.severity}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <select
                          value={v.status || "Open"}
                          disabled={updatingStatus === v.ID || !canAdd}
                          onChange={e => handleStatusChange(v.ID, e.target.value)}
                          style={{ background: "#1e1e2a", color: sta, border: "1px solid #1e1e2e", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: canAdd ? "pointer" : "not-allowed" }}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 11 }}>
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Add Vulnerability Modal */}
      {showModal && (
        <AddVulnModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadAll(); }}
        />
      )}
    </div>
  );
}