import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { User, Lock, Key, Trash2, Check, Eye, EyeOff, Copy, ShieldCheck } from "lucide-react";

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "24px",
};

const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#f1f5f9",
  marginBottom: 4,
};

const sectionDesc = {
  fontSize: 12,
  color: "#6b7280",
  marginBottom: 20,
};

const label = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 6,
  display: "block",
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  background: "#0d0d12",
  border: "1px solid #1e1e2a",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  color: "#f1f5f9",
  outline: "none",
  marginBottom: 14,
};

const btn = (color = "#3b82f6", bg = "#0f1f3d", border = "#1e3a5f") => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 8,
  fontSize: 13,
  color,
  cursor: "pointer",
  fontWeight: 500,
});

function Toast({ msg, type }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", top: 20, right: 24, zIndex: 100,
      background: isErr ? "#1a0505" : "#051a0f",
      border: `1px solid ${isErr ? "#7f1d1d" : "#14532d"}`,
      borderRadius: 10, padding: "12px 18px",
      fontSize: 13, color: isErr ? "#ef4444" : "#22c55e",
      display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    }}>
      {!isErr && <Check size={14} />}
      {msg}
    </div>
  );
}

export default function Settings() {
  const { user, login } = useAuth();

  // Toast
  const [toast, setToast] = useState({ msg: "", type: "success" });
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  };

  // Profile
  const [name,        setName]        = useState(user?.name || "");
  const [savingName,  setSavingName]  = useState(false);

  const handleProfileSave = async () => {
    if (!name.trim()) return showToast("Name cannot be empty.", "error");
    setSavingName(true);
    try {
      const res = await api.put("/api/auth/profile", { name });
      // Update token in localStorage so refresh keeps new name
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      showToast("Display name updated!");
    } catch (e) {
      showToast(e?.response?.data?.error || "Failed to update profile.", "error");
    } finally {
      setSavingName(false);
    }
  };

  // Password
  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [savingPw,     setSavingPw]     = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !confirmPw) return showToast("All fields are required.", "error");
    if (newPw !== confirmPw) return showToast("New passwords do not match.", "error");
    if (newPw.length < 6) return showToast("Password must be at least 6 characters.", "error");
    if (newPw === currentPw) return showToast("New password must be different from current.", "error");
    setSavingPw(true);
    try {
      await api.put("/api/auth/password", { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully!");
    } catch (e) {
      showToast(e?.response?.data?.error || "Failed to change password.", "error");
    } finally {
      setSavingPw(false);
    }
  };

  // API Key
  const API_KEY = "mySuperSecretVulnTrackerKey123";
  const [showKey,   setShowKey]   = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(API_KEY);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDanger,    setShowDanger]    = useState(false);

  const pwStrength = (pw) => {
    if (!pw) return null;
    let score = 0;
    if (pw.length >= 8)           score++;
    if (/[A-Z]/.test(pw))         score++;
    if (/[0-9]/.test(pw))         score++;
    if (/[^A-Za-z0-9]/.test(pw))  score++;
    if (score <= 1) return { label: "Weak",   color: "#ef4444", width: "25%" };
    if (score === 2) return { label: "Fair",   color: "#f59e0b", width: "50%" };
    if (score === 3) return { label: "Good",   color: "#3b82f6", width: "75%" };
    return                        { label: "Strong", color: "#22c55e", width: "100%" };
  };

  const strength = pwStrength(newPw);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      <Toast msg={toast.msg} type={toast.type} />

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Settings</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Manage your account and preferences
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#0a1a2d", border: "1px solid #1e3a5f",
          borderRadius: 20, padding: "4px 12px",
        }}>
          <ShieldCheck size={12} color="#3b82f6" />
          <span style={{ fontSize: 11, color: "#3b82f6", textTransform: "capitalize" }}>
            {user?.role || "guest"}
          </span>
        </div>
      </div>

      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>

        {/* ── Profile ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "#1e3a5f", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#3b82f6", flexShrink: 0,
            }}>
              {user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p style={sectionTitle}><User size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Profile</p>
              <p style={{ ...sectionDesc, marginBottom: 0 }}>Update your display name</p>
            </div>
          </div>

          <label style={label}>Username (cannot be changed)</label>
          <input
            style={{ ...input, color: "#4b5563", cursor: "not-allowed" }}
            value={user?.username || ""}
            disabled
          />

          <label style={label}>Display name</label>
          <input
            style={input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your display name"
          />

          <button onClick={handleProfileSave} disabled={savingName} style={btn()}>
            {savingName ? "Saving..." : <><Check size={13} /> Save changes</>}
          </button>
        </div>

        {/* ── Password ── */}
        <div style={card}>
          <p style={sectionTitle}><Lock size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Change Password</p>
          <p style={sectionDesc}>Use a strong password with letters, numbers and symbols.</p>

          <label style={label}>Current password</label>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <input
              style={{ ...input, marginBottom: 0, paddingRight: 40 }}
              type={showCurrent ? "text" : "password"}
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
            />
            <button onClick={() => setShowCurrent(!showCurrent)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 0,
            }}>
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <label style={label}>New password</label>
          <div style={{ position: "relative", marginBottom: 8 }}>
            <input
              style={{ ...input, marginBottom: 0, paddingRight: 40 }}
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Enter new password"
            />
            <button onClick={() => setShowNew(!showNew)} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 0,
            }}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Strength bar */}
          {strength && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ height: 3, background: "#1e1e2a", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: strength.width, background: strength.color, transition: "width 0.3s, background 0.3s" }} />
              </div>
              <span style={{ fontSize: 11, color: strength.color, marginTop: 4, display: "block" }}>
                {strength.label} password
              </span>
            </div>
          )}

          <label style={label}>Confirm new password</label>
          <input
            style={{
              ...input,
              borderColor: confirmPw && confirmPw !== newPw ? "#7f1d1d" : "#1e1e2a",
            }}
            type="password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            placeholder="Repeat new password"
          />
          {confirmPw && confirmPw !== newPw && (
            <p style={{ fontSize: 11, color: "#ef4444", marginTop: -10, marginBottom: 14 }}>Passwords do not match</p>
          )}

          <button onClick={handlePasswordChange} disabled={savingPw} style={btn()}>
            {savingPw ? "Changing..." : <><Lock size={13} /> Change password</>}
          </button>
        </div>

        {/* ── API Key ── */}
        <div style={card}>
          <p style={sectionTitle}><Key size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />API Key</p>
          <p style={sectionDesc}>Used to authenticate backend API requests. Keep this secret.</p>

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#0d0d12", border: "1px solid #1e1e2a",
            borderRadius: 8, padding: "10px 12px", marginBottom: 14,
          }}>
            <code style={{ flex: 1, fontSize: 12, color: "#6b7280", fontFamily: "monospace", letterSpacing: showKey ? "normal" : "0.15em" }}>
              {showKey ? API_KEY : "•".repeat(32)}
            </code>
            <button onClick={() => setShowKey(!showKey)} style={{
              background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 0,
            }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <button onClick={copyKey} style={btn(keyCopied ? "#22c55e" : "#3b82f6", keyCopied ? "#051a0f" : "#0f1f3d", keyCopied ? "#14532d" : "#1e3a5f")}>
            {keyCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy key</>}
          </button>

          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 14, marginBottom: 0 }}>
            To rotate the key, update <code style={{ color: "#6b7280" }}>API_KEY</code> in your EC2 <code style={{ color: "#6b7280" }}>.env</code> file and restart PM2.
          </p>
        </div>

        {/* ── Danger Zone ── */}
        {user?.role === "admin" && (
          <div style={{ ...card, border: "1px solid #7f1d1d", background: "#0d0505" }}>
            <p style={{ ...sectionTitle, color: "#ef4444" }}>
              <Trash2 size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />Danger Zone
            </p>
            <p style={sectionDesc}>These actions are irreversible. Admin only.</p>

            {!showDanger ? (
              <button onClick={() => setShowDanger(true)} style={btn("#ef4444", "#1a0505", "#7f1d1d")}>
                <Trash2 size={13} /> Delete my account
              </button>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: "#f87171", marginBottom: 10 }}>
                  Type <strong>DELETE</strong> to confirm account deletion. This cannot be undone.
                </p>
                <input
                  style={{ ...input, borderColor: "#7f1d1d", background: "#1a0505" }}
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder='Type DELETE to confirm'
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setShowDanger(false); setDeleteConfirm(""); }}
                    style={btn("#6b7280", "#111118", "#1e1e2a")}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteConfirm !== "DELETE"}
                    style={{
                      ...btn("#ef4444", "#1a0505", "#7f1d1d"),
                      opacity: deleteConfirm !== "DELETE" ? 0.4 : 1,
                      cursor: deleteConfirm !== "DELETE" ? "not-allowed" : "pointer",
                    }}
                    onClick={() => showToast("Account deletion requires backend implementation.", "error")}
                  >
                    <Trash2 size={13} /> Confirm delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}