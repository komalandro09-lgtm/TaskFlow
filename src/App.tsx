import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FirewallProvider } from './context/FirewallContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Members from './pages/Members';
import Settings from './pages/Settings';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Tasks from './pages/Tasks';
import Files from './pages/Files';
import ActivityLogs from './pages/ActivityLogs';
import InviteLanding from './pages/InviteLanding';
import TeamChat from './pages/TeamChat';

// Layout
import Sidebar from './components/shared/Sidebar';
import Topbar from './components/shared/Topbar';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0720, #1e0f3d, #0f0720)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full" style={{ border: '3px solid rgba(139, 92, 246, 0.2)' }}></div>
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full" style={{ border: '3px solid transparent', borderTopColor: '#8b5cf6' }}></div>
          </div>
          <p className="text-sm font-semibold tracking-wide" style={{ color: 'rgba(167, 139, 250, 0.7)', fontFamily: "'Outfit', sans-serif" }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Protection Route Wrapper
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  // Check if profile has is_admin set to true
  if (!user || !(user as any).is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Main Dashboard Shell
const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden transition-colors duration-200" style={{ background: 'var(--app-bg, #f4f2ff)', color: 'var(--text-primary, #1e1b4b)' }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 md:p-7" style={{ background: 'var(--main-bg, #f0ecff)' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:projectId" element={<ProjectDetail />} />
            <Route path="/members" element={<Members />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/team/:teamId" element={<TeamDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/files" element={<Files />} />
            <Route path="/activity" element={<ActivityLogs />} />
            <Route path="/chat" element={<TeamChat />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <FirewallProvider>
            <WorkspaceProvider>
              <Routes>
                {/* Auth Portals */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/invite" element={<InviteLanding />} />

                {/* Dashboard Workspace */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </WorkspaceProvider>
          </FirewallProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
