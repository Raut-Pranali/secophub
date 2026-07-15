// components/AttachProofModal.jsx
// Modal for attaching proof to an existing vulnerability (admin + analyst only)

import { useState } from "react";
import api from "../services/api";
import { X, Upload, FileText, Image, File, Paperclip } from "lucide-react";

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

export default function AttachProofModal({ vuln, onClose, onSuccess }) {
  const [file,       setFile]       = useState(null);
  const [fileError,  setFileError]  = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");

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

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    try {
      setUploading(true);
      setError("");
      const formData = new FormData();
      formData.append("proof", file);
      await api.patch(`/api/vulnerabilities/${vuln.ID}/proof`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to upload proof.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "#111122", border: "1px solid #1e1e2e", borderRadius: 14, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Paperclip size={16} color="#3b82f6" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Attach Proof</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Vulnerability info */}
        <div style={{ background: "#0d0d12", border: "1px solid #1e1e2a", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 4px", fontFamily: "monospace" }}>
            {vuln.ID}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
            {vuln.title}
          </p>
          <span style={{
            display: "inline-block", marginTop: 6,
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
            background: vuln.severity === "Critical" ? "#2d0a0a" : vuln.severity === "High" ? "#2d1a0a" : "#0a1a2d",
            color: vuln.severity === "Critical" ? "#ef4444" : vuln.severity === "High" ? "#f59e0b" : "#3b82f6",
            border: vuln.severity === "Critical" ? "1px solid #7f1d1d" : vuln.severity === "High" ? "1px solid #78350f" : "1px solid #1e3a5f",
          }}>
            {vuln.severity}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#2d0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#ef4444", marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* File upload */}
        <div>
          <label style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8, display: "block", fontWeight: 600 }}>
            Select proof file
          </label>
          <div style={{ border: "1px dashed #1e1e2e", borderRadius: 8, padding: "16px", background: "#0f0f1a", cursor: "pointer" }}>
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="attach-proof-file"
            />
            <label htmlFor="attach-proof-file" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <Upload size={16} color="#4b5563" />
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
          {fileError && <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>{fileError}</p>}
          <p style={{ fontSize: 10, color: "#374151", margin: "4px 0 0" }}>
            Supported: Images (PNG, JPG) · PDF · Word (DOC, DOCX) · Text
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "9px", background: "none", border: "1px solid #1e1e2e", borderRadius: 8, color: "#9ca3af", fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !!fileError}
            style={{
              flex: 1, padding: "9px", borderRadius: 8, border: "none",
              background: (uploading || !file || fileError) ? "#1e3a5f" : "#2563eb",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: (uploading || !file || fileError) ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload Proof"}
          </button>
        </div>
      </div>
    </div>
  );
}