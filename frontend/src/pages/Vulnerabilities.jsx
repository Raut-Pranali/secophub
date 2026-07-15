// pages/Vulnerabilities.jsx
// UPDATED: Attach Proof button for vulnerabilities with no proof (admin + analyst)

import { useEffect, useState, useCallback, useRef } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ExternalLink, Trash2, Plus, Search, UploadCloud, Download, FileSpreadsheet, FileText, ChevronDown, UserCheck, Paperclip } from "lucide-react";
import AddVulnModal      from "../components/AddVulnModal";
import ImportScanModal   from "../components/ImportScanModal";
import AttachProofModal  from "../components/AttachProofModal";
import { exportToCSV, exportToPDF } from "../utils/exportVulns";

const SEVERITY_COLORS = {
  Critical: { bg: "#2d0a0a", color: "#ef4444", border: "#7f1d1d" },
  High:     { bg: "#2d1a0a", color: "#f59e0b", border: "#78350f" },
  Medium:   { bg: "#0a1a2d", color: "#3b82f6", border: "#1e3a5f" },
  Low:      { bg: "#0a2d0a", color: "#22c55e", border: "#14532d" },
};

const STATUS_COLORS = {
  Open:          { bg: "#2d0a0a", color: "#ef4444" },
  "In Progress": { bg: "#2d1a0a", color: "#f59e0b" },
  Resolved:      { bg: "#0a2d0a", color: "#22c55e" },
  Closed:        { bg: "#1a1a1a", color: "#6b7280" },
};

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved", "Closed"];

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Vulnerabilities() {
  const { user } = useAuth();
  const role       = user?.role?.toLowerCase();
  const isAdmin    = role === "admin";
  const isAnalyst  = role === "analyst";
  const isDeveloper = role === "developer";
  const canAdd     = isAdmin || isAnalyst;
  const canDelete  = isAdmin;
  const canUpdateStatus = isAdmin || isAnalyst || isDeveloper;
  const canAssign  = isAdmin || isAnalyst;
  const canAttachProof = isAdmin || isAnalyst;

  const [vulns,         setVulns]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [sevFilter,     setSevFilter]     = useState("All");
  const [statFilter,    setStatFilter]    = useState("All");
  const [updating,      setUpdating]      = useState(null);
  const [assigning,     setAssigning]     = useState(null);
  const [loadingProof,  setLoadingProof]  = useState(null);
  const [confirmId,     setConfirmId]     = useState(null);
  const [deleting,      setDeleting]      = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [showExportMenu,setShowExportMenu]= useState(false);
  const [exporting,     setExporting]     = useState(false);
  const [developers,    setDevelopers]    = useState([]);
  const [attachVuln,    setAttachVuln]    = useState(null); // vuln to attach proof to
  const exportMenuRef = useRef(null);

  const loadVulns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/vulnerabilities");
      const sorted = (res.data.vulnerabilities || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setVulns(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadVulns(); }, [loadVulns]);

  useEffect(() => {
    if (!canAssign) return;
    api.get("/api/team")
      .then(res => setDevelopers((res.data.team || []).filter(m => m.role?.toLowerCase() === "developer")))
      .catch(console.error);
  }, [canAssign]);

  useEffect(() => {
    const handler = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target))
        setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    if (!canUpdateStatus) return;
    setUpdating(id);
    try {
      await api.patch(`/api/vulnerabilities/${id}/status`, { status: newStatus });
      setVulns(prev => prev.map(v => v.ID === id ? { ...v, status: newStatus } : v));
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  const handleAssignChange = async (id, username) => {
    if (!canAssign) return;
    setAssigning(id);
    try {
      await api.patch(`/api/vulnerabilities/${id}/assign`, { assignedTo: username || null });
      setVulns(prev => prev.map(v => v.ID === id ? { ...v, assignedTo: username || null } : v));
    } catch (e) { console.error(e); }
    finally { setAssigning(null); }
  };

  const handleViewProof = async (id) => {
    setLoadingProof(id);
    try {
      const res = await api.get(`/api/vulnerabilities/${id}/proof-url`);
      (res.data.urls || []).forEach(url => window.open(url, "_blank"));
    } catch (e) { console.error(e); }
    finally { setLoadingProof(null); }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    setDeleting(id);
    try {
      await api.delete(`/api/vulnerabilities/${id}`);
      setVulns(prev => prev.filter(v => v.ID !== id));
      setConfirmId(null);
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  };

  const handleExport = async (type) => {
    setShowExportMenu(false);
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      type === "csv"
        ? exportToCSV(filtered, "secophub-vulnerabilities")
        : await exportToPDF(filtered, "secophub-vulnerabilities");
    } catch (e) { console.error("Export failed:", e); }
    finally { setExporting(false); }
  };

  const filtered = vulns.filter(v => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q
      || v.title?.toLowerCase().includes(q)
      || v.description?.toLowerCase().includes(q)
      || v.ID?.toLowerCase().includes(q)
      || v.ID?.replace("VULN-", "").includes(q);
    const matchSev  = sevFilter  === "All" || v.severity === sevFilter;
    const matchStat = statFilter === "All" || v.status   === statFilter;
    return matchSearch && matchSev && matchStat;
  });

  const showAssignedColumn = canAssign || isDeveloper;
  const colCount = 6 + (showAssignedColumn ? 1 : 0) + (canDelete ? 1 : 0);

  const hasNoProof = (v) =>
    !v.proofOfConceptUrl ||
    v.proofOfConceptUrl === "None Attached" ||
    (Array.isArray(v.proofOfConceptUrl) && v.proofOfConceptUrl.length === 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Vulnerabilities</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {filtered.length} entries found
            {isDeveloper && <span style={{ color: "#3b82f6" }}> · showing only vulnerabilities assigned to you</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>

          {/* Export */}
          <div style={{ position: "relative" }} ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(p => !p)}
              disabled={filtered.length === 0 || exporting}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "1px solid #1e1e2a", borderRadius: 8,
                padding: "7px 14px", color: "#9ca3af", fontSize: 13, fontWeight: 600,
                cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                opacity: filtered.length === 0 ? 0.5 : 1,
              }}
            >
              <Download size={14} /> {exporting ? "Exporting..." : "Export"} <ChevronDown size={12} />
            </button>
            {showExportMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8,
                minWidth: 160, boxShadow: "0 12px 30px rgba(0,0,0,0.5)", zIndex: 20, overflow: "hidden",
              }}>
                <button onClick={() => handleExport("csv")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", color: "#f1f5f9", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  <FileSpreadsheet size={14} color="#22c55e" /> Export as CSV
                </button>
                <button onClick={() => handleExport("pdf")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", borderTop: "1px solid #1e1e2a", color: "#f1f5f9", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                  <FileText size={14} color="#ef4444" /> Export as PDF
                </button>
              </div>
            )}
          </div>

          {canAdd && (
            <>
              <button onClick={() => setShowImport(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #1e3a5f", borderRadius: 8, padding: "7px 14px", color: "#3b82f6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <UploadCloud size={14} /> Import Scan
              </button>
              <button onClick={() => setShowModal(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "#2563eb", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <Plus size={14} /> Add Vulnerability
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={13} color="#4b5563" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, description, or ID number..."
              style={{ width: "100%", boxSizing: "border-box", background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: "9px 12px 9px 32px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
            />
          </div>
          <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#9ca3af", outline: "none" }}>
            {["All","Critical","High","Medium","Low"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={statFilter} onChange={e => setStatFilter(e.target.value)} style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#9ca3af", outline: "none" }}>
            {["All","Open","In Progress","Resolved","Closed"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Delete confirm */}
        {confirmId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 14, padding: 24, maxWidth: 380, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.6)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Trash2 size={18} color="#ef4444" />
                <p style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Delete vulnerability?</p>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
                This will permanently remove the vulnerability from DynamoDB and delete any attached S3 artifacts. This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmId(null)} style={{ flex: 1, padding: "9px", background: "none", border: "1px solid #1e1e2e", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => handleDelete(confirmId)} disabled={deleting === confirmId} style={{ flex: 1, padding: "9px", background: "#7f1d1d", border: "none", borderRadius: 8, color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deleting === confirmId ? 0.7 : 1 }}>
                  {deleting === confirmId ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                {["ID","Title","Severity","Status",
                  ...(showAssignedColumn ? ["Assigned To"] : []),
                  "Created","Proof",
                  ...(canDelete ? ["Delete"] : []),
                ].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#6b7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} style={{ padding: 24, textAlign: "center", color: "#4b5563" }}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={colCount} style={{ padding: 24, textAlign: "center", color: "#4b5563" }}>
                  {isDeveloper ? "No vulnerabilities assigned to you yet." : "No vulnerabilities found."}
                </td></tr>
              ) : filtered.map((v) => {
                const sev = SEVERITY_COLORS[v.severity] || SEVERITY_COLORS.Low;
                const sta = STATUS_COLORS[v.status]     || STATUS_COLORS.Open;
                const noProof = hasNoProof(v);

                return (
                  <tr key={v.ID} style={{ borderBottom: "1px solid #1e1e2e" }}>

                    {/* ID — full ID visible for cross-reference with Artifacts */}
                    <td style={{ padding: "12px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      <span style={{ color: "#4b5563" }}>VULN-</span>
                      <span style={{ color: "#9ca3af" }}>{v.ID?.replace("VULN-", "")}</span>
                    </td>

                    {/* Title */}
                    <td style={{ padding: "12px", maxWidth: 220 }}>
                      <p style={{ fontWeight: 500, color: "#f1f5f9", margin: 0 }}>{v.title}</p>
                      <p style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{v.description}</p>
                    </td>

                    {/* Severity */}
                    <td style={{ padding: "12px" }}>
                      <span style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
                        {v.severity}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "12px" }}>
                      <select
                        value={v.status || "Open"}
                        disabled={!canUpdateStatus || updating === v.ID}
                        onChange={e => handleStatusChange(v.ID, e.target.value)}
                        style={{ background: sta.bg, color: sta.color, border: "1px solid #1e1e2e", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: (!canUpdateStatus || updating === v.ID) ? "not-allowed" : "pointer", opacity: updating === v.ID ? 0.5 : 1 }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>

                    {/* Assigned To */}
                    {showAssignedColumn && (
                      <td style={{ padding: "12px" }}>
                        {canAssign ? (
                          <select
                            value={v.assignedTo || ""}
                            disabled={assigning === v.ID}
                            onChange={e => handleAssignChange(v.ID, e.target.value)}
                            style={{ background: "#0d0d12", color: v.assignedTo ? "#3b82f6" : "#6b7280", border: "1px solid #1e1e2e", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: assigning === v.ID ? "not-allowed" : "pointer", opacity: assigning === v.ID ? 0.5 : 1, maxWidth: 130 }}
                          >
                            <option value="">— Unassigned —</option>
                            {developers.map(dev => <option key={dev.username} value={dev.username}>{dev.name || dev.username}</option>)}
                          </select>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: v.assignedTo ? "#3b82f6" : "#374151" }}>
                            <UserCheck size={12} /> {v.assignedTo || "Unassigned"}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Created */}
                    <td style={{ padding: "12px", color: "#6b7280", fontSize: 11, whiteSpace: "nowrap" }}>
                      {formatDateTime(v.createdAt)}
                    </td>

                    {/* Proof — View button OR Attach button */}
                    <td style={{ padding: "12px" }}>
                      {noProof ? (
                        canAttachProof ? (
                          // 🆕 Attach Proof button — shown when no proof exists
                          <button
                            onClick={() => setAttachVuln(v)}
                            style={{
                              background: "none", border: "1px solid #1e3a5f",
                              borderRadius: 6, padding: "4px 10px",
                              color: "#3b82f6", fontSize: 11, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <Paperclip size={11} /> Attach
                          </button>
                        ) : (
                          <span style={{ color: "#374151", fontSize: 12 }}>None</span>
                        )
                      ) : (
                        <button
                          onClick={() => handleViewProof(v.ID)}
                          disabled={loadingProof === v.ID}
                          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: loadingProof === v.ID ? "#6b7280" : "#3b82f6", fontSize: 12, padding: 0, opacity: loadingProof === v.ID ? 0.6 : 1 }}
                        >
                          <ExternalLink size={12} />
                          {loadingProof === v.ID ? "Loading..." : "View"}
                        </button>
                      )}
                    </td>

                    {/* Delete */}
                    {canDelete && (
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => setConfirmId(v.ID)}
                          style={{ background: "none", border: "1px solid #7f1d1d", borderRadius: 6, padding: "4px 10px", color: "#ef4444", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
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
      </div>

      {showModal  && <AddVulnModal    onClose={() => setShowModal(false)}  onSuccess={() => { setShowModal(false);  loadVulns(); }} />}
      {showImport && <ImportScanModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); loadVulns(); }} />}

      {/* 🆕 Attach Proof Modal */}
      {attachVuln && (
        <AttachProofModal
          vuln={attachVuln}
          onClose={() => setAttachVuln(null)}
          onSuccess={() => { setAttachVuln(null); loadVulns(); }}
        />
      )}
    </div>
  );
}