// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, profile, loading, isInitialized, inviteSession } = useAuth();

  // Wait for auth to initialize
  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Invite flow in progress — SetPasswordForm is handling everything,
  // don't redirect anywhere, just show nothing (SetPasswordForm renders separately)
  if (inviteSession) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!profile?.role || !allowedRoles.includes(profile.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}