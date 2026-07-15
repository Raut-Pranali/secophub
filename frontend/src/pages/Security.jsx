// pages/Security.jsx  ← NEW PAGE
// Shows brute force attempts, blocked IPs, failed login events
// Admin only. Backend must expose /api/security/events and /api/security/blocked-ips

import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ShieldAlert, Ban, Globe, Clock, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Unlock, Activity
} from "lucide-react";

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
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

const EVENT_COLORS = {
  FAILED_LOGIN:    { color: "#f59e0b", bg: "#2d1a0a", border: "#78350f", label: "Failed Login" },
  IP_BLOCKED:      { color: "#ef4444", bg: "#2d0a0a", border: "#7f1d1d", label: "IP Blocked" },
  BRUTE_FORCE:     { color: "#ef4444", bg: "#2d0a0a", border: "#7f1d1d", label: "Brute Force" },
  SUCCESS_LOGIN:   { color: "#22c55e", bg: "#0a2d0a", border: "#14532d", label: "Login Success" },
  IP_UNBLOCKED:    { color: "#3b82f6", bg: "#0a1a2d", border: "#1e3a5f", label: "IP Unblocked" },
};

export default function Security() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const [events,      setEvents]     = useState([]);
  const [blockedIPs,  setBlockedIPs] = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [error,       setError]      = useState(null);
  const [activeTab,   setTab]        = useState("events");
  const [unblocking,  setUnblocking] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      loadAll();
    }
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, blockedRes] = await Promise.all([
        api.get("/api/security/events"),
        api.get("/api/security/blocked-ips"),
      ]);
      setEvents(eventsRes.data.events || []);
      setBlockedIPs(blockedRes.data.blockedIPs || []);
    } catch (e) {
      setError("Failed to load security data.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (ip) => {
    setUnblocking(ip);
    try {
      await api.post("/api/security/unblock", { ip });
      setBlockedIPs(prev => prev.filter(b => b.ip !== ip));
    } catch (e) {
      alert(e.response?.data?.error || "Failed to unblock IP.");
    } finally {
      setUnblocking(null);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0d0d12" }}>
        <div style={{ textAlign: "center" }}>
          <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 15, color: "#6b7280" }}>Access Denied. Admin clearance required.</p>
        </div>
      </div>
    );
  }

  const failedCount  = events.filter(e => e.type === "FAILED_LOGIN").length;
  const blockedCount = events.filter(e => e.type === "IP_BLOCKED").length;
  const bruteCount   = events.filter(e => e.type === "BRUTE_FORCE").length;
  const recentThreats = blockedIPs.length; // Only show banner when IPs are CURRENTLY blocked

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={16} color="#ef4444" /> Security Monitor
          </h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Login events · Brute force detection · Blocked IPs
          </p>
        </div>
        <button
          onClick={loadAll}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid #1e1e2a", background: "none", borderRadius: 8, padding: "6px 12px", color: "#6b7280", cursor: "pointer" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Active threat banner */}
        {recentThreats > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#2d0a0a", border: "1px solid #7f1d1d",
            borderRadius: 10, padding: "12px 16px",
          }}>
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ fontSize: 13, color: "#fca5a5", fontWeight: 600 }}>
              {recentThreats} security threat{recentThreats !== 1 ? "s" : ""} detected — {blockedIPs.length} IP{blockedIPs.length !== 1 ? "s" : ""} currently blocked.
            </span>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Failed Logins",   value: failedCount,       icon: XCircle,     color: "#f59e0b" },
            { label: "Brute Force",     value: bruteCount,        icon: ShieldAlert, color: "#ef4444" },
            { label: "IPs Blocked",     value: blockedCount,      icon: Ban,         color: "#ef4444" },
            { label: "Currently Blocked", value: blockedIPs.length, icon: Globe,     color: "#f59e0b" },
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "#0d0d12", border: "1px solid #1e1e2a", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {[
            { key: "events",  label: "Login Events", icon: Activity },
            { key: "blocked", label: `Blocked IPs (${blockedIPs.length})`, icon: Ban },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8, fontSize: 12,
                fontWeight: activeTab === key ? 600 : 400,
                background: activeTab === key ? "#1e1e2a" : "none",
                color: activeTab === key ? "#f1f5f9" : "#6b7280",
                border: "none", cursor: "pointer",
              }}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

        {/* Login Events tab */}
        {activeTab === "events" && (
          <div style={card}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Security Event Log
            </p>

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 56, background: "#0d0d12", borderRadius: 8 }} />)}
              </div>
            )}

            {!loading && events.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <CheckCircle size={32} color="#22c55e" style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: "#4b5563" }}>No security events recorded.</p>
              </div>
            )}

            {!loading && events.map((evt, i) => {
              const cfg = EVENT_COLORS[evt.type] || EVENT_COLORS.FAILED_LOGIN;
              return (
                <div
                  key={evt.eventId || i}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 0", borderBottom: "1px solid #1e1e2a",
                  }}
                >
                  {/* Type badge */}
                  <span style={{
                    background: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 6, padding: "3px 8px",
                    fontSize: 10, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    {cfg.label}
                  </span>

                  {/* IP */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <Globe size={11} color="#4b5563" />
                    <span style={{ fontSize: 12, color: "#f1f5f9", fontFamily: "monospace" }}>
                      {evt.ip || "Unknown"}
                    </span>
                  </div>

                  {/* Username attempted */}
                  {evt.username && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      @{evt.username}
                    </span>
                  )}

                  {/* Attempt count */}
                  {evt.attempts && (
                    <span style={{ fontSize: 11, color: "#f59e0b" }}>
                      {evt.attempts} attempt{evt.attempts !== 1 ? "s" : ""}
                    </span>
                  )}

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Timestamp */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Clock size={10} color="#4b5563" />
                    <span style={{ fontSize: 11, color: "#4b5563" }}>
                      {formatDate(evt.createdAt || evt.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Blocked IPs tab */}
        {activeTab === "blocked" && (
          <div style={card}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
              Currently Blocked IP Addresses
            </p>

            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[1,2].map(i => <div key={i} style={{ height: 56, background: "#0d0d12", borderRadius: 8 }} />)}
              </div>
            )}

            {!loading && blockedIPs.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <CheckCircle size={32} color="#22c55e" style={{ marginBottom: 8, opacity: 0.5 }} />
                <p style={{ fontSize: 13, color: "#4b5563" }}>No IPs currently blocked. System is clean.</p>
              </div>
            )}

            {!loading && blockedIPs.map((item, i) => (
              <div
                key={item.ip || i}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 0", borderBottom: "1px solid #1e1e2a",
                }}
              >
                {/* Blocked icon */}
                <div style={{ width: 36, height: 36, background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ban size={16} color="#ef4444" />
                </div>

                {/* IP + info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", margin: 0, fontFamily: "monospace" }}>
                    {item.ip}
                  </p>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      Failed attempts: <strong style={{ color: "#f59e0b" }}>{item.attempts || "5+"}</strong>
                    </span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      Blocked at: {formatDate(item.blockedAt)}
                    </span>
                    {item.unblockAt && (
                      <span style={{ fontSize: 11, color: "#6b7280" }}>
                        Auto-unblock: {formatDate(item.unblockAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Unblock button */}
                <button
                  onClick={() => handleUnblock(item.ip)}
                  disabled={unblocking === item.ip}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: "#0a1a2d", border: "1px solid #1e3a5f",
                    borderRadius: 8, padding: "6px 12px",
                    color: "#3b82f6", fontSize: 11, fontWeight: 600,
                    cursor: "pointer", opacity: unblocking === item.ip ? 0.6 : 1,
                  }}
                >
                  <Unlock size={11} />
                  {unblocking === item.ip ? "Unblocking..." : "Unblock"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div style={{ background: "#0d1117", border: "1px solid #1e3a5f", borderRadius: 10, padding: "12px 16px" }}>
          <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>
            🔐 <strong style={{ color: "#3b82f6" }}>Protection active:</strong> IPs are blocked after{" "}
            <strong style={{ color: "#f1f5f9" }}>5 failed login attempts</strong>. CAPTCHA activates at attempt 3.
            Blocked IPs automatically unblock after 15 minutes. Admin receives SNS alert on each block event.
          </p>
        </div>

      </div>
    </div>
  );
}