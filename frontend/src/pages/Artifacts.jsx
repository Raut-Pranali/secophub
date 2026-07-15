// pages/Artifacts.jsx
// FIXED: VULN-VULN- double prefix bug — now shows clean VULN-1782045129416
// FIXED: Vulnerability ID shown clearly and fully for easy cross-reference

import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshCw, Download, ExternalLink, Trash2, File, Image, FileText, Clock, HardDrive } from "lucide-react";

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getFileIcon(fileName) {
  if (!fileName) return <File size={18} color="#6b7280" />;
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["png","jpg","jpeg","webp","gif"].includes(ext)) return <Image size={18} color="#3b82f6" />;
  if (ext === "pdf") return <FileText size={18} color="#ef4444" />;
  if (["doc","docx"].includes(ext)) return <FileText size={18} color="#3b82f6" />;
  return <File size={18} color="#6b7280" />;
}

// 🔧 FIX: Extract clean VULN-XXXXXXXXXX from the S3 key
// S3 key format: proofs/VULN-1782045129416-filename.png
// We want:       VULN-1782045129416
function extractVulnId(key) {
  if (!key) return "Unknown";
  const fileName = key.replace("proofs/", "");
  // Match VULN- followed by numbers
  const match = fileName.match(/^(VULN-\d+)-/);
  if (match) return match[1];
  // fallback — return first 2 dash-separated parts
  return fileName.split("-").slice(0, 2).join("-");
}

export default function Artifacts() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const canView = isAdmin || user?.role?.toLowerCase() === "analyst";

  const [files,      setFiles]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState("");
  const [deleting,   setDeleting]   = useState(null);
  const [confirmKey, setConfirmKey] = useState(null);

  useEffect(() => { loadArtifacts(); }, []);

  const loadArtifacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/api/artifacts");
      setFiles(res.data.files || []);
    } catch (e) {
      setError("Failed to load artifacts.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key) => {
    if (!isAdmin) return;
    setDeleting(key);
    try {
      await api.delete(`/api/artifacts/${encodeURIComponent(key)}`);
      setFiles(prev => prev.filter(f => f.key !== key));
      setConfirmKey(null);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || "Failed to delete artifact.");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = files.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    const vulnId = extractVulnId(f.key);
    return (
      f.fileName?.toLowerCase().includes(q) ||
      vulnId?.toLowerCase().includes(q) ||
      f.key?.toLowerCase().includes(q)
    );
  });

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  if (!canView) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0d0d12" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <File size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>Access Denied. Only Admin and Analyst can view artifacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Artifacts</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            S3 secure storage · {files.length} files · {formatSize(totalSize)} total
          </p>
        </div>
        <button
          onClick={loadArtifacts}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid #1e1e2a", background: "none", borderRadius: 8, padding: "6px 12px", color: "#6b7280", cursor: "pointer" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <File size={14} color="#3b82f6" />
              <span style={{ fontSize: 11, color: "#6b7280" }}>Total files</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6", margin: 0 }}>{files.length}</p>
          </div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <HardDrive size={14} color="#f59e0b" />
              <span style={{ fontSize: 11, color: "#6b7280" }}>Total size</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b", margin: 0 }}>{formatSize(totalSize)}</p>
          </div>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Clock size={14} color="#22c55e" />
              <span style={{ fontSize: 11, color: "#6b7280" }}>URL expiry</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", margin: 0 }}>15 min</p>
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by filename or vulnerability ID (e.g. VULN-1782045...)..."
          style={{
            background: "#111118", border: "1px solid #1e1e2a",
            borderRadius: 8, padding: "9px 14px",
            fontSize: 13, color: "#f1f5f9", outline: "none",
          }}
        />

        {/* Delete confirm */}
        {confirmKey && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{ background: "#111118", border: "1px solid #1e1e2a", borderRadius: 14, padding: 24, maxWidth: 380, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Trash2 size={16} color="#ef4444" />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Delete artifact?</p>
              </div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 18 }}>
                This will permanently delete the file from S3. This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmKey(null)} style={{ flex: 1, padding: "8px", background: "none", border: "1px solid #1e1e2e", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}>
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmKey)}
                  disabled={deleting === confirmKey}
                  style={{ flex: 1, padding: "8px", background: "#7f1d1d", border: "none", borderRadius: 8, color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deleting === confirmKey ? 0.7 : 1 }}
                >
                  {deleting === confirmKey ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Files list */}
        <div style={card}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Proof of Concept Files · Presigned URLs expire in 15 min
          </p>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 60, background: "#0d0d12", borderRadius: 10 }} />)}
            </div>
          )}

          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No artifacts found.</p>
          )}

          {!loading && !error && filtered.map((file) => {
            // 🔧 FIX: use extractVulnId instead of file.vulnId (which had VULN-VULN- bug)
            const vulnId = extractVulnId(file.key);
            return (
              <div
                key={file.key}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  borderBottom: "1px solid #1e1e2a", padding: "14px 0",
                }}
              >
                {/* File icon */}
                <div style={{ width: 40, height: 40, background: "#0d0d12", border: "1px solid #1e1e2a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getFileIcon(file.fileName)}
                </div>

                {/* File info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9", margin: 0 }}>{file.fileName}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                    {/* 🔧 FIX: show full clean VULN-XXXXXXXXXX ID */}
                    <span style={{
                      fontSize: 10, background: "#0a1a2d", color: "#3b82f6",
                      border: "1px solid #1e3a5f", borderRadius: 12, padding: "2px 8px",
                      fontFamily: "monospace", fontWeight: 600,
                    }}>
                      {vulnId}
                    </span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{formatSize(file.size)}</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{formatDate(file.lastModified)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {file.presignedUrl && (
                    <>
                      <a
                        href={file.presignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: "#0a1a2d", border: "1px solid #1e3a5f",
                          borderRadius: 6, padding: "5px 10px",
                          color: "#3b82f6", fontSize: 11, textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={11} /> View
                      </a>
                      <a
                        href={file.presignedUrl}
                        download
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          background: "none", border: "1px solid #1e1e2a",
                          borderRadius: 6, padding: "5px 10px",
                          color: "#6b7280", fontSize: 11, textDecoration: "none",
                        }}
                      >
                        <Download size={11} /> Download
                      </a>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmKey(file.key)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "none", border: "1px solid #7f1d1d",
                        borderRadius: 6, padding: "5px 10px",
                        color: "#ef4444", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Info note */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0a1a2d", border: "1px solid #1e3a5f", borderRadius: 10, padding: "10px 14px" }}>
          <Clock size={13} color="#3b82f6" />
          <span style={{ fontSize: 12, color: "#4b5563" }}>
            All files stored in a <strong style={{ color: "#3b82f6" }}>private S3 bucket</strong>. View links are presigned URLs that expire after{" "}
            <strong style={{ color: "#3b82f6" }}>15 minutes</strong>. Refresh the page to generate new links.
            Deleting a vulnerability also removes its artifacts automatically.
          </span>
        </div>

      </div>
    </div>
  );
}