import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard       from './pages/Dashboard';
import Vulnerabilities from './pages/Vulnerabilities';
import Analytics       from './pages/Analytics';
import Login           from './pages/Login';
import Team            from './pages/Team';
import Artifacts       from './pages/Artifacts';
import Settings        from './pages/Settings';
import Sidebar         from './components/Sidebar';
import Alerts          from './pages/Alerts';
import Security        from './pages/Security';
import AuditLog        from './pages/AuditLog';   // 🆕

function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a12", color: "#4b5563", fontSize: 13 }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const userRole = user?.role?.toLowerCase();
  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f0f1a", overflow: "hidden" }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: "auto" }}>
        <Routes>
          {/* Publicly available views inside the protected panel */}
          <Route path="/"                element={<Dashboard />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/artifacts"       element={<Artifacts />} />
          <Route path="/team"            element={<Team />} />
          <Route path="/settings"        element={<Settings />} />

          {/* 🛡️ Analytics: Accessible by Admins and Analysts. Developers get kicked back to dashboard */}
          <Route path="/analytics" element={<Analytics />} />

          {/* 🛡️ Alerts: Exclusively accessible by Admin. Analysts and Developers get kicked back */}
          <Route path="/alerts" element={
            userRole === 'admin' ? <Alerts /> : <Navigate to="/" replace />
          } />

          {/* 🛡️ Security Monitor: Exclusively accessible by Admin only */}
          <Route path="/security" element={
            userRole === 'admin' ? <Security /> : <Navigate to="/" replace />
          } />

          {/* 🛡️ Audit Log: Exclusively accessible by Admin only */}
          <Route path="/audit" element={
            userRole === 'admin' ? <AuditLog /> : <Navigate to="/" replace />
          } />

          {/* Catch-all safety routing fallbacks */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*"     element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}