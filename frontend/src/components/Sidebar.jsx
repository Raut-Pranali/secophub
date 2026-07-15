import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bug, BarChart2, Settings,
  ShieldCheck, LogOut, ChevronLeft, ChevronRight, Users, FolderOpen,
  Bell, ShieldAlert, ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vulnerabilities', icon: Bug,             label: 'Vulnerabilities' },
  { to: '/alerts',          icon: Bell,            label: 'Alerts' },
  { to: '/analytics',       icon: BarChart2,       label: 'Analytics' },
  { to: '/artifacts',       icon: FolderOpen,      label: 'Artifacts' },
  { to: '/team',            icon: Users,           label: 'Team' },
  { to: '/security',        icon: ShieldAlert,     label: 'Security' },
  { to: '/audit',           icon: ClipboardList,   label: 'Audit Log' },  // 🆕
  { to: '/settings',        icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout }          = useAuth();
  const navigate                  = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const width = collapsed ? 60 : 200;

  return (
    <div style={{
      width, minWidth: width,
      background: "#0d0d12",
      borderRight: "1px solid #1e1e2a",
      display: "flex", flexDirection: "column",
      height: "100%", flexShrink: 0,
      transition: "width 0.25s ease, min-width 0.25s ease",
      overflow: "hidden",
    }}>

      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        padding: collapsed ? "16px 0" : "16px",
        borderBottom: "1px solid #1e1e2a", minHeight: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "#2563eb", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <ShieldCheck size={15} color="white" />
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9", whiteSpace: "nowrap" }}>
              SecOpHub
            </span>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, paddingTop: 12 }}>
        {links
          .filter(({ to }) => {
            const role = user?.role?.toLowerCase();

            if (role === 'developer') {
              return to !== '/alerts' && to !== '/security' && to !== '/audit';
            }
            if (role === 'analyst') {
              return to !== '/alerts' && to !== '/security' && to !== '/audit';
            }
            // Admin sees everything
            return true;
          })
          .map(({ to, icon: Icon, label }) => {
            const isSecurityLink = to === '/security';
            const isAuditLink    = to === '/audit';
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={collapsed ? label : ""}
                style={({ isActive }) => ({
                  display: "flex", alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 10, padding: collapsed ? "10px 0" : "9px 16px",
                  fontSize: 13, textDecoration: "none",
                  color: isActive
                    ? (isSecurityLink ? "#ef4444" : "#3b82f6")
                    : (isSecurityLink ? "#ef4444" : "#6b7280"),
                  background: isActive
                    ? (isSecurityLink ? "#2d0a0a" : "#0f1f3d")
                    : "transparent",
                  borderRight: isActive
                    ? `2px solid ${isSecurityLink ? "#ef4444" : "#3b82f6"}`
                    : "2px solid transparent",
                  fontWeight: isActive ? 500 : 400,
                  transition: "all 0.2s",
                })}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
              </NavLink>
            );
          })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 8, padding: collapsed ? "10px 0" : "10px 16px",
          background: "none", border: "none",
          borderTop: "1px solid #1e1e2a",
          color: "#4b5563", fontSize: 12, cursor: "pointer",
          width: "100%", transition: "all 0.2s",
        }}
      >
        {collapsed
          ? <ChevronRight size={15} />
          : <><ChevronLeft size={15} /><span style={{ whiteSpace: "nowrap" }}>Collapse</span></>
        }
      </button>

      {/* User + Logout */}
      <div style={{
        padding: collapsed ? "12px 0" : "12px 16px",
        borderTop: "1px solid #1e1e2a",
        display: "flex", flexDirection: "column",
        alignItems: collapsed ? "center" : "stretch",
        gap: collapsed ? 8 : 10,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "#1e3a5f", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#3b82f6", flexShrink: 0,
          }}
            title={collapsed ? (user?.name || user?.username || "User") : ""}
          >
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name || user?.username || "User"}
              </p>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0, textTransform: "capitalize" }}>
                {user?.role || "guest"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : ""}
          style={{
            display: "flex", alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 6, padding: collapsed ? "7px 0" : "7px 10px",
            background: "none", border: "1px solid #1e1e2a",
            borderRadius: 6, color: "#6b7280", fontSize: 12,
            cursor: "pointer", width: "100%",
          }}
        >
          <LogOut size={13} />
          {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Sign out</span>}
        </button>
      </div>

    </div>
  );
}