// components/ImportScanModal.jsx
import { useState, useRef } from "react";
import api from "../services/api";
import { UploadCloud, FileJson, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function ImportScanModal({ onClose, onSuccess }) {
  const [file,      setFile]      = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");
  const [result,    setResult]    = useState(null);
  const inputRef = useRef(null);

  const pickFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith(".json")) {
      setError("Only .json files are accepted.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("report", file);
      const res = await api.post("/api/vulnerabilities/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Import failed. Check the file format and try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    onSuccess?.();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
    }}>
      <div style={{
        background: "#111118", border: "1px solid #1e1e2a",
        borderRadius: 14, padding: 24, maxWidth: 460, width: "100%",
        boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <UploadCloud size={18} color="#3b82f6" />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Import Scan Report</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
              Upload a scanner-style JSON report. Each finding in the file becomes a new vulnerability automatically.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `1px dashed ${dragOver ? "#3b82f6" : "#1e1e2a"}`,
                background: dragOver ? "#0f1f3d" : "#0d0d12",
                borderRadius: 10, padding: "28px 16px",
                textAlign: "center", cursor: "pointer",
                marginBottom: 14, transition: "all 0.15s",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => pickFile(e.target.files?.[0])}
                style={{ display: "none" }}
              />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <FileJson size={18} color="#3b82f6" />
                  <span style={{ fontSize: 13, color: "#f1f5f9" }}>{file.name}</span>
                </div>
              ) : (
                <>
                  <UploadCloud size={24} color="#4b5563" style={{ marginBottom: 8 }} />
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                    Drag a .json file here, or click to browse
                  </p>
                </>
              )}
            </div>

            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#1a0505", border: "1px solid #7f1d1d",
                borderRadius: 8, padding: "10px 12px", marginBottom: 14,
                fontSize: 12, color: "#ef4444",
              }}>
                <AlertTriangle size={13} /> {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: "9px", background: "none", border: "1px solid #1e1e2a", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || uploading}
                style={{
                  flex: 1, padding: "9px", background: "#2563eb",
                  border: "none", borderRadius: 8, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: !file || uploading ? "not-allowed" : "pointer",
                  opacity: !file || uploading ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {uploading ? <><Loader2 size={13} className="spin" /> Importing...</> : "Import"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Result summary */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#051a0f", border: "1px solid #14532d",
              borderRadius: 10, padding: "14px 16px", marginBottom: 14,
            }}>
              <CheckCircle size={18} color="#22c55e" />
              <div>
                <p style={{ fontSize: 13, color: "#22c55e", margin: 0, fontWeight: 600 }}>
                  {result.imported} vulnerabilit{result.imported === 1 ? "y" : "ies"} imported
                </p>
                {result.skippedCount > 0 && (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0, marginTop: 2 }}>
                    {result.skippedCount} entr{result.skippedCount === 1 ? "y" : "ies"} skipped (missing title or invalid severity)
                  </p>
                )}
              </div>
            </div>

            {result.items?.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.items.map((item) => (
                  <div key={item.ID} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#0d0d12", border: "1px solid #1e1e2a", borderRadius: 8,
                    padding: "8px 12px", fontSize: 12,
                  }}>
                    <span style={{ color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                      {item.title}
                    </span>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                      background: item.severity === "Critical" ? "#2d0a0a" : item.severity === "High" ? "#2d1a0a" : item.severity === "Medium" ? "#0a1a2d" : "#0a2d0a",
                      color: item.severity === "Critical" ? "#ef4444" : item.severity === "High" ? "#f59e0b" : item.severity === "Medium" ? "#3b82f6" : "#22c55e",
                    }}>
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleDone}
              style={{ width: "100%", padding: "9px", background: "#2563eb", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Done
            </button>
          </>
        )}

      </div>
    </div>
  );
}