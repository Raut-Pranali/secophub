// pages/Alerts.jsx
// UPDATED: Delete button on each alert row (admin only)

import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Bell, AlertTriangle, RefreshCw, Trash2, Mail, User, Clock } from "lucide-react";

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SEVERITY_CONFIG = {
  Critical: { color: "#ef4444", bg: "#2d0a0a", border: "#7f1d1d" },
  High:     { color: "#f59e0b", bg: "#2d1a0a", border: "#78350f" },
};

export default function Alerts() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState("All");
  const [deleting,   setDeleting]   = useState(null);
  const [confirmId,  setConfirmId]  = useState(null);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/alerts");
      setAlerts(res.data.alerts || []);
    } catch (e) {
      setError("Failed to load alerts.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (alertId) => {
    if (!isAdmin) return;
    setDeleting(alertId);
    try {
      await api.delete(`/api/alerts/${alertId}`);
      setAlerts(prev => prev.filter(a => a.alertId !== alertId));
      setConfirmId(null);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to delete alert.");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = alerts.filter(a =>
    filter === "All" ? true : a.severity === filter
  );

  const criticalCount = alerts.filter(a => a.severity === "Critical").length;
  const highCount     = alerts.filter(a => a.severity === "High").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Alerts</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            AWS SNS alert log · {alerts.length} total sent
          </p>
        </div>
        <button
          onClick={loadAlerts}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid #1e1e2a", background: "none", borderRadius: 8, padding: "6px 12px", color: "#6b7280", cursor: "pointer" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Total alerts sent", value: alerts.length, icon: Bell,          color: "#3b82f6" },
            { label: "Critical alerts",   value: criticalCount, icon: AlertTriangle,  color: "#ef4444" },
            { label: "High alerts",       value: highCount,     icon: AlertTriangle,  color: "#f59e0b" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <span style={{ fontSize: 11, color: "#6b7280" }}>{label}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "Critical", "High"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                border: filter === f ? "1px solid #3b82f6" : "1px solid #1e1e2a",
                background: filter === f ? "#0f1f3d" : "none",
                color: filter === f ? "#3b82f6" : "#6b7280",
                fontWeight: filter === f ? 600 : 400,
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Delete confirm dialog */}
        {confirmId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{
              background: "#111118", border: "1px solid #1e1e2a",
              borderRadius: 14, padding: 24, maxWidth: 360, width: "100%",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Trash2 size={16} color="#ef4444" />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Delete this alert?</p>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
                This will remove the alert record from DynamoDB. The original vulnerability will not be affected.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmId(null)}
                  style={{ flex: 1, padding: "8px", background: "none", border: "1px solid #1e1e2e", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmId)}
                  disabled={deleting === confirmId}
                  style={{
                    flex: 1, padding: "8px", background: "#7f1d1d", border: "none",
                    borderRadius: 8, color: "#fca5a5", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", opacity: deleting === confirmId ? 0.7 : 1,
                  }}
                >
                  {deleting === confirmId ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts list */}
        <div style={card}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Alert History · SNS Dispatched Notifications
          </p>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 68, background: "#0d0d12", borderRadius: 10 }} />)}
            </div>
          )}

          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No alerts found.</p>
          )}

          {!loading && !error && filtered.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.High;
            return (
              <div
                key={alert.alertId}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  borderBottom: "1px solid #1e1e2a", padding: "14px 0",
                }}
              >
                {/* Severity badge */}
                <span style={{
                  background: cfg.bg, color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: 20, padding: "3px 10px",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {alert.severity}
                </span>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                      {alert.vulnerabilityTitle || alert.vulnTitle || "Alert"}
                    </span>
                    <span style={{ fontSize: 10, color: "#4b5563" }}>
                      VULN-{alert.vulnerabilityId || alert.vulnId}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Mail size={10} color="#4b5563" />
                      <span style={{ fontSize: 11, color: "#4b5563" }}>
                        Sent to: {alert.sentTo || "admin@secophub.com"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <User size={10} color="#4b5563" />
                      <span style={{ fontSize: 11, color: "#4b5563" }}>
                        Triggered by: {alert.triggeredBy || "System"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={10} color="#4b5563" />
                      <span style={{ fontSize: 11, color: "#4b5563" }}>
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sent badge */}
                <span style={{
                  background: "#0a2d0a", color: "#22c55e",
                  border: "1px solid #14532d", borderRadius: 6,
                  padding: "3px 10px", fontSize: 11, fontWeight: 500, flexShrink: 0,
                }}>
                  ✓ Sent
                </span>

                {/* Delete button (admin only) */}
                {isAdmin && (
                  <button
                    onClick={() => setConfirmId(alert.alertId)}
                    style={{
                      background: "none", border: "1px solid #7f1d1d",
                      borderRadius: 6, padding: "4px 8px",
                      color: "#ef4444", fontSize: 11, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
                    }}
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
