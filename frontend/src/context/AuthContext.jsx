// context/AuthContext.jsx
// UPDATED: Added role helper functions (isAdmin, isAnalyst, isDeveloper, can*)
// These are used throughout the app to enforce RBAC on the frontend.

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("secophub_token");
    const savedUser  = sessionStorage.getItem("secophub_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // corrupt session — clear it
        sessionStorage.removeItem("secophub_token");
        sessionStorage.removeItem("secophub_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (tokenValue, userData) => {
    sessionStorage.setItem("secophub_token", tokenValue);
    sessionStorage.setItem("secophub_user",  JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem("secophub_token");
    sessionStorage.removeItem("secophub_user");
    setToken(null);
    setUser(null);
  };

  // ── Role helpers ──────────────────────────────────────────────────────────
  const role      = user?.role?.toLowerCase();
  const isAdmin   = role === "admin";
  const isAnalyst = role === "analyst";
  const isDev     = role === "developer";

  // Permission gates (mirrors the permissions matrix in Team.jsx)
  const permissions = {
    viewDashboard:    true,                          // all roles
    addVulnerability: isAdmin || isAnalyst,
    deleteVulnerability: isAdmin,
    updateStatus:     isAdmin || isAnalyst,          // developer: NO
    viewAnalytics:    isAdmin || isAnalyst,          // developer also has analytics
    viewTeam:         true,
    manageMembers:    isAdmin,
    receiveSNSAlerts: isAdmin,
    viewArtifacts:    isAdmin || isAnalyst,
    viewSecurity:     isAdmin,
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={{
      user, token, login, logout, loading,
      // role helpers
      role, isAdmin, isAnalyst, isDev,
      // permission flags — use these in components
      permissions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
