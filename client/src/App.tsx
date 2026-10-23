import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PatronAuthProvider } from './context/PatronAuthContext';
import { Layout } from './components/Layout';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BooksPage } from './pages/BooksPage';
import { EbooksPage } from './pages/EbooksPage';
import { UsersPage } from './pages/UsersPage';
import { IssuesPage } from './pages/IssuesPage';
import { SeatsPage } from './pages/SeatsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ActivityPage } from './pages/ActivityPage';
import { DatabaseConfigPage } from './pages/DatabaseConfigPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserRequestsPage } from './pages/UserRequestsPage';

// Patron Portal Imports
import { PatronLoginPage } from './pages/portal/PatronLoginPage';
import { PortalLayout } from './components/portal/PortalLayout';
import { PortalDashboardPage } from './pages/portal/PortalDashboardPage';
import { PortalLoansPage } from './pages/portal/PortalLoansPage';
import { PortalCatalogPage } from './pages/portal/PortalCatalogPage';
import { PortalEbooksPage } from './pages/portal/PortalEbooksPage';
import { PortalSeatsPage } from './pages/portal/PortalSeatsPage';
import { PatronProtectedRoute } from './components/portal/PatronProtectedRoute';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, dbStatus, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading Library System...</p>
        </div>
      </div>
    );
  }

  // If system is completely unconfigured or first-run, direct to setup
  if (dbStatus && (!dbStatus.isConfigured || !dbStatus.hasAdmin)) {
    return <Navigate to="/setup" replace />;
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PatronAuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Patron / Member Portal Routes */}
            <Route path="/portal/login" element={<PatronLoginPage />} />
            <Route
              path="/portal"
              element={
                <PatronProtectedRoute>
                  <PortalLayout />
                </PatronProtectedRoute>
              }
            >
              <Route index element={<PortalDashboardPage />} />
              <Route path="loans" element={<PortalLoansPage />} />
              <Route path="catalog" element={<PortalCatalogPage />} />
              <Route path="ebooks" element={<PortalEbooksPage />} />
              <Route path="seats" element={<Navigate to="/portal" replace />} />
            </Route>

            {/* Public Admin / Setup Routes */}
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Admin Application Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="books" element={<BooksPage />} />
              <Route path="ebooks" element={<EbooksPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="seats" element={<SeatsPage />} />
              <Route path="user-requests" element={<UserRequestsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="database-config" element={<DatabaseConfigPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </PatronAuthProvider>
    </AuthProvider>
  );
};

export default App;
