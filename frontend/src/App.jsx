import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import ClientsCRM from './pages/dashboard/ClientsCRM';
import ScheduleManager from './pages/dashboard/ScheduleManager';
import ClinicalNotes from './pages/dashboard/ClinicalNotes';
import PaymentsBilling from './pages/dashboard/PaymentsBilling';
import AnalyticsView from './pages/dashboard/AnalyticsView';
import SettingsView from './pages/dashboard/SettingsView';
import PublicProfile from './pages/public/PublicProfile';
import ClientPortal from './pages/portal/ClientPortal';

// Protected Route Wrapper for Therapist Dashboard
const ProtectedTherapistRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600 }}>Loading UNFAZED...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      {children}
    </div>
  );
};

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Client Portal Route */}
      <Route path="/portal" element={<ClientPortal />} />

      {/* Protected Therapist Dashboard Sub-routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedTherapistRoute>
            <DashboardOverview />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/clients"
        element={
          <ProtectedTherapistRoute>
            <ClientsCRM />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/schedule"
        element={
          <ProtectedTherapistRoute>
            <ScheduleManager />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/notes"
        element={
          <ProtectedTherapistRoute>
            <ClinicalNotes />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/payments"
        element={
          <ProtectedTherapistRoute>
            <PaymentsBilling />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/analytics"
        element={
          <ProtectedTherapistRoute>
            <AnalyticsView />
          </ProtectedTherapistRoute>
        }
      />
      <Route
        path="/dashboard/settings"
        element={
          <ProtectedTherapistRoute>
            <SettingsView />
          </ProtectedTherapistRoute>
        }
      />

      {/* Public Branded Link Route (/:slug e.g. unfazed.in/dr-ananya-sharma) */}
      <Route path="/:slug" element={<PublicProfile />} />

      {/* Root Fallback */}
      <Route path="/" element={<Navigate to="/dr-ananya-sharma" replace />} />
    </Routes>
  );
}

export default App;
