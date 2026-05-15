// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import LoginForm from "./pages/auth/LoginForm";
import RegisterForm from "./pages/auth/RegisterForm";
import ForgotPasswordForm from "./pages/auth/ForgotPasswordForm";
import ResetPasswordForm from "./pages/auth/ResetPasswordForm";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ApplicantDashboard from "./pages/applicant/ApplicantDashboard";
import CaseDetailsPage from "./pages/applicant/CaseDetailsPage";
import DraftsPage from "./pages/applicant/DraftsPage";
import CaseSubmission from "./pages/applicant/CaseSubmission";
import EditCaseForm from "./pages/applicant/EditCaseForm";
import { useAuth } from "./context/AuthContext";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCaseDetailsPage from "./pages/admin/AdminCaseDetailsPage";
import ReportsAnalytics from "./pages/admin/ReportsAnalytics";
import UserManagement from "./pages/admin/UserManagement";
import HceoCaseDetailsPage from "./pages/hceo/HceoCaseDetailsPage";
import HceoDashboard from "./pages/hceo/HceoDashboard";
import AccountsDashboard from "./pages/accounts/AccountsDashboard";
import NetworkErrorBoundary from "./components/NetworkErrorBoundary";
import DebugAuthMonitor from "./components/DebugAuthMonitor";
import InactivityTimeoutModal from "./components/InactivityTimeoutModal";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";

import SetPasswordForm from "./pages/auth/SetPasswordForm";
import SentryErrorBoundary from "./components/ErrorBoundary";
function AppLayout({ children }) {
  const location = useLocation();
  const { isInitialized, inviteSession } = useAuth();

  const publicPages = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/set-password",
  ];
  const isPublicPage = publicPages.includes(location.pathname);

  // ✅ Public pages (including /set-password) should NEVER be blocked by loading.
  // Invite links land on /set-password before auth is initialized — if we show
  // the loading spinner here, SetPasswordForm never gets to process the URL tokens.
  if (isPublicPage || inviteSession) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  // For protected pages, wait for auth to initialize before rendering
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Protected pages - with sidebar
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-0 lg:ml-64">{children}</div>
    </div>
  );
}

function AppRoutes() {
  const { showWarning, remainingTime, handleStayLoggedIn } =
    useInactivityTimeout();

  

  return (
    <>
      <AppLayout>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />
          <Route path="/reset-password" element={<ResetPasswordForm />} />
          <Route path="/set-password" element={<SetPasswordForm />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Applicant routes */}
          <Route
            path="/applicant/dashboard"
            element={
              <ProtectedRoute allowedRoles={["applicant"]}>
                <ApplicantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/case-submission"
            element={
              <ProtectedRoute allowedRoles={["applicant"]}>
                <CaseSubmission />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-case/:caseId"
            element={
              <ProtectedRoute allowedRoles={["applicant"]}>
                <EditCaseForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/case-details/:caseId"
            element={
              <ProtectedRoute allowedRoles={["applicant"]}>
                <CaseDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/drafts"
            element={
              <ProtectedRoute allowedRoles={["applicant"]}>
                <DraftsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/case/:caseId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCaseDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <ReportsAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/user-management"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          {/* HCEO routes */}
          <Route
            path="/hceo/dashboard"
            element={
              <ProtectedRoute allowedRoles={["hceo"]}>
                <HceoDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hceo/case/:caseId"
            element={
              <ProtectedRoute allowedRoles={["hceo"]}>
                <HceoCaseDetailsPage />
              </ProtectedRoute>
            }
          />

          {/* Accounts routes */}
          <Route
            path="/accounts/dashboard"
            element={
              <ProtectedRoute allowedRoles={["accounts", "admin"]}>
                <AccountsDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppLayout>

      <InactivityTimeoutModal
        isOpen={showWarning}
        onStayLoggedIn={handleStayLoggedIn}
        remainingTime={remainingTime}
      />
    </>
  );
}

export default function App() {
  return (
    <NetworkErrorBoundary>
       <SentryErrorBoundary> 
      <AuthProvider>
        <Router>
          <AppRoutes />
          {/* <DebugAuthMonitor /> */}
        </Router>
      </AuthProvider>
      </SentryErrorBoundary>
    </NetworkErrorBoundary>
  );
}