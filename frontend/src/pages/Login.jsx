// pages/Login.jsx
// UPDATED: CAPTCHA after 3 failed attempts, MFA-ready, improved security UX

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Eye, EyeOff, Lock, User, AlertTriangle, Ban, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

// Simple math CAPTCHA (replace with reCAPTCHA v2 for production)
function MathCaptcha({ onVerify }) {
  const [a] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [b] = useState(() => Math.floor(Math.random() * 9) + 1);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState(false);

  const verify = () => {
    if (parseInt(answer) === a + b) {
      onVerify(true);
    } else {
      setError(true);
      setAnswer("");
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e3a5f",
      borderRadius: 10, padding: "14px 16px", marginBottom: 16,
    }}>
      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, margin: "0 0 10px" }}>
        🔐 Security Check — Please solve to continue:
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>
          {a} + {b} = ?
        </span>
        <input
          type="number"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => e.key === "Enter" && verify()}
          placeholder="Answer"
          style={{
            width: 80, background: error ? "#1a0505" : "#111118",
            border: `1px solid ${error ? "#7f1d1d" : "#1e3a5f"}`,
            borderRadius: 6, padding: "6px 10px",
            color: "#f1f5f9", fontSize: 13, outline: "none",
          }}
        />
        <button
          onClick={verify}
          style={{
            background: "#1d4ed8", border: "none", borderRadius: 6,
            padding: "6px 12px", color: "#fff", fontSize: 12,
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Verify
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "#ef4444", margin: "6px 0 0" }}>
          Wrong answer. Try again.
        </p>
      )}
    </div>
  );
}

export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm]           = useState({ username: "", password: "" });
  const [showPassword, setShow]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [attemptsLeft, setLeft]   = useState(null);
  const [failCount, setFailCount] = useState(0);     // local fail counter
  const [blocked, setBlocked]     = useState(false);
  const [minutesLeft, setMinutes] = useState(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);   // reset captcha

  // If blocked, show countdown
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (blocked && minutesLeft) {
      setCountdown(minutesLeft * 60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setBlocked(false);
            setFailCount(0);
            setLeft(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [blocked, minutesLeft]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (blocked) return;
    if (!form.username || !form.password) {
      setError("Please enter both username and password.");
      return;
    }
    // Require captcha after 3 fails, until verified
    if (captchaRequired && !captchaVerified) {
      setError("Please complete the security check first.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await API.post("/api/auth/login", form);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      const newFail = failCount + 1;
      setFailCount(newFail);

      if (data?.blocked) {
        setBlocked(true);
        setMinutes(data.minutesLeft || 15);
        setError("");
      } else {
        setError(data?.error || "Login failed. Check your credentials.");
        setLeft(data?.attemptsLeft ?? null);

        // Enable captcha after 3 failures
        if (newFail >= 3) {
          setCaptchaRequired(true);
          setCaptchaVerified(false);
          setCaptchaKey(k => k + 1); // regenerate captcha
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  const warningLevel = attemptsLeft !== null
    ? attemptsLeft <= 1 ? "critical"
    : attemptsLeft <= 2 ? "high"
    : "medium"
    : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a12",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
            boxShadow: "0 0 30px rgba(37,99,235,0.3)",
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>SecOpHub</h1>
          <p style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
            Security Operations Platform · Authorized Access Only
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#0f0f1a",
          border: "1px solid #1e1e2e",
          borderRadius: 16,
          padding: 28,
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}>

          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", margin: "0 0 20px" }}>
            Sign in to your account
          </h2>

          {/* Attempt progress bar */}
          {failCount > 0 && !blocked && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#6b7280" }}>Failed attempts</span>
                <span style={{ fontSize: 10, color: failCount >= 4 ? "#ef4444" : "#f59e0b" }}>
                  {failCount} / 5
                </span>
              </div>
              <div style={{ height: 3, background: "#1e1e2e", borderRadius: 2 }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  width: `${(failCount / 5) * 100}%`,
                  background: failCount >= 4 ? "#ef4444" : failCount >= 3 ? "#f59e0b" : "#3b82f6",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          )}

          {/* Blocked state */}
          {blocked && (
            <div style={{
              background: "#1a0505", border: "1px solid #7f1d1d",
              borderRadius: 10, padding: "14px 16px", marginBottom: 20,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <Ban size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", margin: 0 }}>
                  IP Address Blocked
                </p>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
                  Too many failed attempts. Retry in{" "}
                  <strong style={{ color: "#f87171", fontFamily: "monospace" }}>
                    {countdown > 0 ? formatCountdown(countdown) : `${minutesLeft}m`}
                  </strong>.
                  A security alert has been sent to the admin.
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !blocked && (
            <div style={{
              background: warningLevel === "critical" ? "#1a0505" : "#141420",
              border: `1px solid ${warningLevel === "critical" ? "#7f1d1d" : warningLevel === "high" ? "#78350f" : "#374151"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 16,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <AlertTriangle size={15} color={warningLevel === "critical" ? "#ef4444" : "#f59e0b"} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, color: "#f1f5f9", margin: 0 }}>{error}</p>
                {attemptsLeft !== null && (
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "4px 0 0" }}>
                    {attemptsLeft <= 1
                      ? "⚠️ One more failure will block your IP for 15 minutes."
                      : attemptsLeft <= 2
                      ? "⚠️ Your IP will be blocked after the next failed attempt."
                      : "Repeated failures will trigger a security alert to admin."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CAPTCHA (shown after 3 failures) */}
          {captchaRequired && !captchaVerified && !blocked && (
            <MathCaptcha key={captchaKey} onVerify={(ok) => {
              if (ok) setCaptchaVerified(true);
            }} />
          )}
          {captchaVerified && (
            <div style={{
              background: "#0a2d0a", border: "1px solid #14532d",
              borderRadius: 8, padding: "8px 12px", marginBottom: 14,
              fontSize: 12, color: "#22c55e",
            }}>
              ✅ Security check passed
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Username
            </label>
            <div style={{ position: "relative" }}>
              <User size={14} color="#4b5563" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                onKeyDown={handleKey}
                placeholder="Enter username"
                disabled={blocked}
                autoComplete="username"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#0a0a12", border: "1px solid #1e1e2e",
                  borderRadius: 8, padding: "10px 12px 10px 34px",
                  fontSize: 13, color: "#f1f5f9", outline: "none",
                  opacity: blocked ? 0.5 : 1,
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={14} color="#4b5563" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={handleKey}
                placeholder="Enter password"
                disabled={blocked}
                autoComplete="current-password"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#0a0a12", border: "1px solid #1e1e2e",
                  borderRadius: 8, padding: "10px 36px 10px 34px",
                  fontSize: 13, color: "#f1f5f9", outline: "none",
                  opacity: blocked ? 0.5 : 1,
                }}
              />
              <button
                onClick={() => setShow(!showPassword)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#4b5563" }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || blocked || (captchaRequired && !captchaVerified)}
            style={{
              width: "100%", padding: "11px", borderRadius: 8, border: "none",
              background: (loading || blocked || (captchaRequired && !captchaVerified))
                ? "#1e3a5f"
                : "linear-gradient(135deg, #1d4ed8, #2563eb)",
              color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: (loading || blocked || (captchaRequired && !captchaVerified)) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                Authenticating...
              </>
            ) : blocked ? (
              "Access Blocked"
            ) : (
              "Sign In"
            )}
          </button>

          {/* Security notice */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#374151", marginTop: 16 }}>
            🔒 All login attempts are monitored and logged.
            <br />Unauthorized access will trigger an immediate security alert.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}