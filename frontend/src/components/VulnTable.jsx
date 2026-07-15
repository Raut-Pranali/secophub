import { useState } from "react";
import api from "../services/api";
import { ExternalLink, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext"; // 👈 IMPORT AUTH CONTEXT

const SEVERITY_COLORS = {
  Critical: { bg: "#2d0a0a", color: "#ef4444", border: "#7f1d1d" },
  High:     { bg: "#2d1a0a", color: "#f59e0b", border: "#78350f" },
  Medium:   { bg: "#0a1a2d", color: "#3b82f6", border: "#1e3a5f" },
  Low:      { bg: "#0a2d0a", color: "#22c55e", border: "#14532d" },
};

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

const STATUS_COLORS = {
  "Open":        { bg: "#2d0a0a", color: "#ef4444" },
  "In Progress": { bg: "#2d1a0a", color: "#f59e0b" },
  "Resolved":    { bg: "#0a2d0a", color: "#22c55e" },
  "Closed":      { bg: "#1a1a2d", color: "#6b7280" },
};

export default function VulnTable({ vulns = [], loading, onStatusChange }) {
  const { user } = useAuth(); // 👈 EXTRACT LOGGED-IN USER INFORMTATION
  const [updating, setUpdating]       = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const [confirmId, setConfirmId]     = useState(null);
  const [loadingProof, setLoadingProof] = useState(null);

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  
  // Checking matrix authorization for changing status (Admin, Analyst, Developer allowed)
  const canUpdateStatus = ["admin", "analyst", "developer"].includes(userRole);

  const handleViewProof = async (id) => {
    try {
      setLoadingProof(id);
      const res = await api.get(`/api/vulnerabilities/${id}/proof-url`);
      const urls = res.data.urls || [];
      urls.forEach((url) => window.open(url, "_blank", "noreferrer"));
    } catch (e) {
      console.error("Failed to get proof URL", e);
      alert("Could not load proof. Please try again.");
    } finally {
      setLoadingProof(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setUpdating(id);
      await api.patch(`/api/vulnerabilities/${id}/status`, { status: newStatus });
      onStatusChange();
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeleting(id);
      await api.delete(`/api/vulnerabilities/${id}`);
      setConfirmId(null);
      onStatusChange();
    } catch (e) {
      console.error("Failed to delete", e);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 52, background: "#111122", borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (vulns.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280", fontSize: 14 }}>
        No vulnerabilities found.
      </div>
    );
  }

  return (
    <>
      {/* Delete confirmation modal - Locked down to Admin */}
      {confirmId && isAdmin && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
        }}>
          <div style={{
            background: "#111118", border: "1px solid #7f1d1d",
            borderRadius: 12, padding: 24, maxWidth: 360, width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Trash2 size={18} color="#ef4444" />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
                Delete vulnerability?
              </p>
            </div>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              This will permanently remove the vulnerability and its data from DynamoDB. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  flex: 1, padding: "9px", background: "none",
                  border: "1px solid #1e1e2e", borderRadius: 8,
                  color: "#9ca3af", fontSize: 13, cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={deleting === confirmId}
                style={{
                  flex: 1, padding: "9px", background: "#7f1d1d",
                  border: "none", borderRadius: 8, color: "#fca5a5",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  opacity: deleting === confirmId ? 0.7 : 1,
                }}
              >
                {deleting === confirmId ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
              {["ID", "Title", "Severity", "Status", "Created", "Proof"].map(h => (
                <th key={h} style={{
                  padding: "10px 12px", textAlign: "left", fontSize: 11,
                  color: "#6b7280", fontWeight: 500, textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  {h}
                </th>
              ))}
              {/* 👈 Hide the Delete column header for non-admins */}
              {isAdmin && (
                <th style={{
                  padding: "10px 12px", textAlign: "left", fontSize: 11,
                  color: "#6b7280", fontWeight: 500, textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  Delete
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {vulns.map((v) => {
              const sev = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.Low;
              const sta = STATUS_COLORS[v.status]     || STATUS_COLORS.Open;
              return (
                <tr key={v.ID} style={{ borderBottom: "1px solid #1e1e2e" }}>

                  {/* ID */}
                  <td style={{ padding: "12px", color: "#6b7280", fontSize: 11 }}>
                    {v.ID?.replace("VULN-", "")}
                  </td>

                  {/* Title + Description */}
                  <td style={{ padding: "12px", maxWidth: 220 }}>
                    <p style={{ fontWeight: 500, color: "#f1f5f9", margin: 0 }}>{v.title}</p>
                    <p style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {v.description}
                    </p>
                  </td>

                  {/* Severity pill */}
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      background: sev.bg, color: sev.color,
                      border: `1px solid ${sev.border}`,
                      borderRadius: 20, padding: "3px 10px",
                      fontSize: 11, fontWeight: 500
                    }}>
                      {v.severity}
                    </span>
                  </td>

                  {/* Status dropdown element */}
                  <td style={{ padding: "12px" }}>
                    <select
                      value={v.status || "Open"}
                      disabled={updating === v.ID || !canUpdateStatus} // 👈 Disable if updating or role is unauthorized
                      onChange={(e) => handleStatusChange(v.ID, e.target.value)}
                      style={{
                        background: sta.bg, color: sta.color,
                        border: "1px solid #1e1e2e", borderRadius: 6,
                        padding: "4px 8px", fontSize: 12, 
                        cursor: (!canUpdateStatus || updating === v.ID) ? "not-allowed" : "pointer",
                        opacity: updating === v.ID ? 0.5 : 1
                      }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>

                  {/* Created date */}
                  <td style={{ padding: "12px", color: "#6b7280", fontSize: 11 }}>
                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}
                  </td>

                  {/* Presigned URL Link */}
                  <td style={{ padding: "12px" }}>
                    {!v.proofOfConceptUrl || v.proofOfConceptUrl === "None Attached" ? (
                      <span style={{ color: "#374151", fontSize: 12 }}>None</span>
                    ) : (
                      <button
                        onClick={() => handleViewProof(v.ID)}
                        disabled={loadingProof === v.ID}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                          color: loadingProof === v.ID ? "#6b7280" : "#3b82f6",
                          fontSize: 12, padding: 0,
                          opacity: loadingProof === v.ID ? 0.6 : 1,
                        }}
                      >
                        <ExternalLink size={12} />
                        {loadingProof === v.ID ? "Loading..." : "View"}
                      </button>
                    )}
                  </td>

                  {/* 👈 Dynamic Delete button container - completely hidden from non-admins */}
                  {isAdmin && (
                    <td style={{ padding: "12px" }}>
                      <button
                        onClick={() => setConfirmId(v.ID)}
                        style={{
                          background: "none", border: "1px solid #7f1d1d",
                          borderRadius: 6, padding: "4px 10px",
                          color: "#ef4444", fontSize: 11, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </td>
                  )}

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}