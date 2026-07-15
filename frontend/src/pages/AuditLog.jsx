// pages/AuditLog.jsx
// Audit log page — shows who did what and when (admin only)
// Added: SCAN_IMPORTED, VULN_ASSIGNED, WEEKLY_REPORT action types + safe fallback

import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardList, RefreshCw, Search,
  Clock, Shield, Trash2, Plus,
  LogIn, UserPlus, UserMinus, Edit,
  UploadCloud, UserCheck, HelpCircle, BarChart2
} from "lucide-react";

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const ACTION_CONFIG = {
  LOGIN:          { color: "#22c55e", bg: "#0a2d0a", border: "#14532d", icon: LogIn,       label: "Login" },
  VULN_CREATED:   { color: "#3b82f6", bg: "#0a1a2d", border: "#1e3a5f", icon: Plus,        label: "Vuln Added" },
  VULN_DELETED:   { color: "#ef4444", bg: "#2d0a0a", border: "#7f1d1d", icon: Trash2,      label: "Vuln Deleted" },
  STATUS_CHANGED: { color: "#f59e0b", bg: "#2d1a0a", border: "#78350f", icon: Edit,        label: "Status Changed" },
  MEMBER_ADDED:   { color: "#a855f7", bg: "#1a0a2d", border: "#581c87", icon: UserPlus,    label: "Member Added" },
  MEMBER_REMOVED: { color: "#ef4444", bg: "#2d0a0a", border: "#7f1d1d", icon: UserMinus,   label: "Member Removed" },
  SCAN_IMPORTED:  { color: "#06b6d4", bg: "#082225", border: "#155e63", icon: UploadCloud, label: "Scan Imported" },
  VULN_ASSIGNED:  { color: "#8b5cf6", bg: "#1a0a2d", border: "#5b21b6", icon: UserCheck,   label: "Vuln Assigned" },
  WEEKLY_REPORT:  { color: "#a855f7", bg: "#1a0a2d", border: "#581c87", icon: BarChart2,   label: "Weekly Report" },
};

const UNKNOWN_ACTION_CONFIG = {
  color: "#9ca3af", bg: "#1a1a1a", border: "#374151", icon: HelpCircle, label: "Other"
};

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

const FILTER_OPTIONS = ["All", ...Object.keys(ACTION_CONFIG)];

export default function AuditLog() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => { if (isAdmin) loadLogs(); }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/audit-logs");
      setLogs(res.data.logs || []);
    } catch (e) {
      setError("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(log => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || log.performedBy?.toLowerCase().includes(q)
      || log.details?.toLowerCase().includes(q)
      || log.targetId?.toLowerCase().includes(q)
      || log.action?.toLowerCase().includes(q);
    const matchFilter = filter === "All" || log.action === filter;
    return matchSearch && matchFilter;
  });

  const todayLogs = logs.filter(l => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0d0d12" }}>
        <div style={{ textAlign: "center" }}>
          <Shield size={48} color="#ef4444" style={{ marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 15, color: "#6b7280" }}>Access Denied. Admin clearance required.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardList size={16} color="#3b82f6" /> Audit Log
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Complete history of all actions performed in SecOpHub
          </p>
        </div>
        <button
          onClick={loadLogs}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid #1e1e2a", background: "none", borderRadius: 8, padding: "6px 12px", color: "#6b7280", cursor: "pointer" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total events",    value: logs.length,                                                                              color: "#3b82f6" },
            { label: "Today",           value: todayLogs.length,                                                                         color: "#22c55e" },
            { label: "Vulnerabilities", value: logs.filter(l => l.action?.includes("VULN") || l.action === "SCAN_IMPORTED").length,      color: "#f59e0b" },
            { label: "Team changes",    value: logs.filter(l => l.action?.includes("MEMBER")).length,                                    color: "#a855f7" },
          ].map(s => (
            <div key={s.label} style={card}>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0 }}>{loading ? "—" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={13} color="#4b5563" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user, action, or vulnerability ID..."
              style={{
                width: "100%", boxSizing: "border-box",
                background: "#111118", border: "1px solid #1e1e2a",
                borderRadius: 8, padding: "9px 12px 9px 32px",
                fontSize: 13, color: "#f1f5f9", outline: "none",
              }}
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#9ca3af", outline: "none" }}
          >
            {FILTER_OPTIONS.map(a => (
              <option key={a} value={a}>{a === "All" ? "All Actions" : ACTION_CONFIG[a]?.label || a}</option>
            ))}
          </select>
        </div>

        {/* Logs list */}
        <div style={card}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 14px" }}>
            Activity history · {filtered.length} events
          </p>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, background: "#0d0d12", borderRadius: 8 }} />)}
            </div>
          )}

          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <ClipboardList size={32} color="#4b5563" style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13, color: "#4b5563" }}>No audit events found.</p>
            </div>
          )}

          {!loading && filtered.map((log, i) => {
            const cfg  = ACTION_CONFIG[log.action] || UNKNOWN_ACTION_CONFIG;
            const Icon = cfg.icon;
            return (
              <div
                key={log.auditId || i}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0", borderBottom: "1px solid #1e1e2a",
                }}
              >
                {/* Action icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={15} color={cfg.color} />
                </div>

                {/* Action badge */}
                <span style={{
                  background: cfg.bg, color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 6, padding: "3px 10px",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {cfg.label}
                </span>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#f1f5f9", margin: 0, fontWeight: 500 }}>
                    {log.details || log.action}
                  </p>
                  {log.targetId && (
                    <p style={{ fontSize: 11, color: "#4b5563", margin: "2px 0 0", fontFamily: "monospace" }}>
                      {log.targetId}
                    </p>
                  )}
                </div>

                {/* Performed by */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: "#1e3a5f", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#3b82f6",
                  }}>
                    {log.performedBy?.[0]?.toUpperCase() || "?"}
                  </div>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{log.performedBy}</span>
                </div>

                {/* Timestamp */}
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <Clock size={10} color="#4b5563" />
                  <span style={{ fontSize: 11, color: "#4b5563" }}>
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}