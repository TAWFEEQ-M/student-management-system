import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Marks from "./pages/Marks";
import Subjects from "./pages/Subjects";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import { AppProvider, useApp } from "./context/AppContext";
const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";
function BackendNotice() {
  const { backendStatus, backendError } = useApp();
  return backendStatus === "offline" ? <div className="form-error" role="status">Backend unavailable — showing local demo data. {backendError || "Changes remain available in this session."}</div> : null;
}

function ProtectedApp() {
  const { user, authLoading, logout } = useApp();
  if (authLoading) return <div className="loading-state">Connecting to the administration system...</div>;
  if (!user && !authDisabled) return <Navigate to="/login" replace />;
  return <div className="app">
    <Sidebar />
    <div className="main-area">
      <Navbar />
      <BackendNotice />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/marks" element={<Marks />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <button className="session-logout" onClick={logout}>Sign out</button>
    </div>
  </div>;
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<ProtectedApp />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;