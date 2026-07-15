import { useEffect, useState } from "react";
import api from "../services/api";
import { Shield, Code, Crown, Users, Mail, Plus, Trash2, X, Eye, EyeOff, Loader } from "lucide-react";

const ROLE_CONFIG = {
  admin: {
    label: "Security Admin",
    icon: Crown,
    color: "#ef4444",
    bg: "#2d0a0a",
    border: "#7f1d1d",
    description: "Full access · Receives all alerts",
  },
  analyst: {
    label: "Security Analyst",
    icon: Shield,
    color: "#f59e0b",
    bg: "#2d1a0a",
    border: "#78350f",
    description: "Can add & update vulnerabilities",
  },
  developer: {
    label: "Developer",
    icon: Code,
    color: "#3b82f6",
    bg: "#0a1a2d",
    border: "#1e3a5f",
    description: "Read only · Updates assigned vulns",
  },
};

const card = {
  background: "#111118",
  border: "1px solid #1e1e2a",
  borderRadius: 12,
  padding: "20px",
};

export default function Team() {
  const [team, setTeam]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccess]  = useState("");

  const [form, setForm] = useState({
    username: "", password: "", name: "", role: "analyst", email: "",
  });

  useEffect(() => { loadTeam(); }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/team");
      setTeam(res.data.team || []);
    } catch (e) {
      setError("Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.username || !form.password || !form.role) {
      setFormError("Username, password and role are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post("/api/team", form);
      setShowModal(false);
      setForm({ username: "", password: "", name: "", role: "analyst", email: "" });
      setSuccess("User added successfully!");
      setTimeout(() => setSuccess(""), 3000);
      loadTeam();
    } catch (e) {
      setFormError(e.response?.data?.error || "Failed to add user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Remove @${username} from the team?`)) return;
    setDeleting(username);
    try {
      await api.delete(`/api/team/${username}`);
      setSuccess(`@${username} removed.`);
      setTimeout(() => setSuccess(""), 3000);
      loadTeam();
    } catch (e) {
      alert(e.response?.data?.error || "Failed to delete user.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0d0d12" }}>

      {/* Topbar */}
      <div style={{
        padding: "13px 24px", borderBottom: "1px solid #1e1e2a",
        background: "#0d0d12", position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", margin: 0 }}>Team</h1>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{team.length} members · SecOps team</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#0f1f3d", border: "1px solid #1e3a5f", borderRadius: 8, padding: "6px 12px" }}>
            <Users size={13} color="#3b82f6" />
            <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 500 }}>{team.length} Active</span>
          </div>
          <button
            onClick={() => { setShowModal(true); setFormError(""); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
              border: "none", borderRadius: 8, padding: "7px 14px",
              fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer",
            }}
          >
            <Plus size={13} /> Add Member
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Success message */}
        {successMsg && (
          <div style={{ background: "#0a2d0a", border: "1px solid #14532d", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#22c55e" }}>
            ✅ {successMsg}
          </div>
        )}

        {/* Role cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} style={{ ...card, borderColor: cfg.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={14} color={cfg.color} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                </div>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{cfg.description}</p>
              </div>
            );
          })}
        </div>

        {/* Team members */}
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Team members
          </p>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 64, background: "#0d0d12", borderRadius: 10 }} />)}
            </div>
          )}

          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

          {!loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {team.map((member) => {
                const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.developer;
                const Icon = cfg.icon;
                return (
                  <div key={member.username} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "#0d0d12", border: "1px solid #1e1e2a",
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 15, fontWeight: 700, color: cfg.color, flexShrink: 0,
                    }}>
                      {member.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{member.name}</span>
                        <span style={{ fontSize: 10, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 20, padding: "2px 8px", fontWeight: 500 }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: 10, background: "#0a2d0a", color: "#22c55e", border: "1px solid #14532d", borderRadius: 20, padding: "2px 8px" }}>
                          Active
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 11, color: "#6b7280" }}>@{member.username}</span>
                        {member.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Mail size={10} color="#4b5563" />
                            <span style={{ fontSize: 11, color: "#4b5563" }}>{member.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    {member.username !== "Jagruti" && (
                      <button
                        onClick={() => handleDelete(member.username)}
                        disabled={deleting === member.username}
                        style={{
                          background: "#1a0505", border: "1px solid #7f1d1d",
                          borderRadius: 8, padding: "7px 10px", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 5,
                          fontSize: 11, color: "#ef4444", flexShrink: 0,
                        }}
                      >
                        {deleting === member.username ? <Loader size={12} /> : <Trash2 size={12} />}
                        {deleting === member.username ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Permissions table */}
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Permissions matrix
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2a" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: "#6b7280", fontWeight: 500 }}>Feature</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#ef4444", fontWeight: 500 }}>Admin</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#f59e0b", fontWeight: 500 }}>Analyst</th>
                <th style={{ padding: "8px 12px", textAlign: "center", color: "#3b82f6", fontWeight: 500 }}>Developer</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["View Dashboard",       true,  true,  true ],
                ["Add Vulnerability",    true,  true,  false],
                ["Delete Vulnerability", true,  false, false],
                ["Update Status",        true,  true,  false],
                ["View Analytics",       true,  true,  true ],
                ["View Team",            true,  true,  true ],
                ["Add/Remove Members",   true,  false, false],
                ["Receive SNS Alerts",   true,  false, false],
                ["View S3 Artifacts",    true,  true,  false],
              ].map(([feature, admin, analyst, dev]) => (
                <tr key={feature} style={{ borderBottom: "1px solid #1e1e2a" }}>
                  <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{feature}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{admin   ? "✅" : "❌"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{analyst ? "✅" : "❌"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{dev     ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MEMBER MODAL */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#0f0f1a", border: "1px solid #1e1e2e",
            borderRadius: 16, padding: 28, width: "100%", maxWidth: 420,
            boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>Add Team Member</h2>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>User can login immediately after creation</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ background: "#1a0505", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#ef4444" }}>
                {formError}
              </div>
            )}

            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "e.g. John Smith", required: false },
              { label: "Username *", key: "username", type: "text", placeholder: "e.g. john123", required: true },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
                />
              </div>
            ))}

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Strong password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ width: "100%", boxSizing: "border-box", background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "10px 36px 10px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
                />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role *</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ width: "100%", background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
              >
                <option value="analyst">Security Analyst</option>
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email (optional)</label>
              <input
                type="email"
                placeholder="john@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box", background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#f1f5f9", outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: "10px", background: "#1e1e2e", border: "1px solid #2e2e3e", borderRadius: 8, fontSize: 13, color: "#9ca3af", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                style={{ flex: 2, padding: "10px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "white", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                {saving ? <><Loader size={13} /> Creating...</> : <><Plus size={13} /> Create Member</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}