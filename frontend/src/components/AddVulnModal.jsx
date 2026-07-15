// components/AddVulnModal.jsx
// UPDATED: Accepts image, PDF, DOC, DOCX files — not just images

import { useState } from "react";
import api from "../services/api";
import { X, Upload, FileText, Image, File } from "lucide-react";

const ACCEPTED_TYPES = [
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_FILE_SIZE_MB = 10;

function getFileIcon(file) {
  if (!file) return null;
  if (file.type.startsWith("image/")) return <Image size={13} color="#3b82f6" />;
  if (file.type === "application/pdf") return <FileText size={13} color="#ef4444" />;
  return <File size={13} color="#f59e0b" />;
}

export default function AddVulnModal({ onClose, onSuccess }) {
  const [form, setForm]             = useState({ title: "", description: "", severity: "Medium" });
  const [file, setFile]             = useState(null);
  const [fileError, setFileError]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) { setFile(null); return; }

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("Unsupported file type. Use: PNG, JPG, PDF, DOC, DOCX, or TXT.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`File too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description) {
      setError("Title and description are required.");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const formData = new FormData();
      formData.append("title",       form.title);
      formData.append("description", form.description);
      formData.append("severity",    form.severity);
      if (file) formData.append("screenshot", file);

      await api.post("/api/vulnerabilities", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to submit. Check your backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#111122", border: "1px solid #1e1e2e", borderRadius: 14, padding: 24, width: "100%", maxWidth: 480, position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Log new vulnerability</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ef4444", marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "block", fontWeight: 600 }}>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. SQL Injection on /api/users"
              style={{ width: "100%", boxSizing: "border-box", background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "block", fontWeight: 600 }}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the vulnerability, steps to reproduce..."
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#f1f5f9", outline: "none", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "block", fontWeight: 600 }}>Severity *</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
              style={{ width: "100%", background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
            >
              {["Critical", "High", "Medium", "Low"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* File Upload — supports image, PDF, DOC */}
          <div>
            <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "block", fontWeight: 600 }}>
              Proof / Screenshot (optional)
            </label>
            <div style={{
              border: "1px dashed #1e1e2e", borderRadius: 8, padding: "12px",
              background: "#0f0f1a", cursor: "pointer",
              transition: "border-color 0.2s",
            }}>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="proof-file"
              />
              <label htmlFor="proof-file" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <Upload size={15} color="#4b5563" />
                {file ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {getFileIcon(file)}
                    <span style={{ fontSize: 12, color: "#f1f5f9" }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>({(file.size / 1024).toFixed(0)} KB)</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "#4b5563" }}>
                    Click to upload — PNG, JPG, PDF, DOC, DOCX (max 10MB)
                  </span>
                )}
              </label>
            </div>
            {fileError && (
              <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{fileError}</p>
            )}
            <p style={{ fontSize: 10, color: "#374151", margin: "4px 0 0" }}>
              Supported: Images (PNG, JPG, WEBP) · PDF · Word (DOC, DOCX) · Text
            </p>
          </div>

        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !!fileError}
          style={{
            marginTop: 20, width: "100%", padding: "11px", borderRadius: 8, border: "none",
            background: (submitting || fileError) ? "#1e3a5f" : "#2563eb",
            color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: (submitting || fileError) ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting…" : "Submit vulnerability"}
        </button>
      </div>
    </div>
  );
}