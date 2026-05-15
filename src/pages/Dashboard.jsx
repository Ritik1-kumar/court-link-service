// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const { profile, isInitialized } = useAuth(); // CHANGED: Use isInitialized instead of loading
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Wait for auth to be initialized
    if (!isInitialized) {
      return;
    }

    // If no profile after initialization, there's an error
    if (!profile) {
      console.error("No profile found after auth initialization");
      return;
    }

    // Redirect based on role
    const role = profile.role;

    if (!role) {
      console.error("No role found in profile");
      return;
    }

    setRedirecting(true);

    if (role === "applicant") {
      navigate("/applicant/dashboard", { replace: true });
    } else if (role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else if (role === "hceo") {
      navigate("/hceo/dashboard", { replace: true });
    } else if (role === "accounts") {
      navigate("/accounts/dashboard", { replace: true });
    } else {
      console.error("Unknown role:", role);
      setRedirecting(false);
    }
  }, [profile, isInitialized, navigate]);

  // Show loading only if auth is not initialized yet
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show error if no profile after initialization
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
            <p className="mb-4">
              We couldn't load your profile. Please try logging in again.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no role found
  if (!profile.role) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 text-red-700 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-bold mb-2">No Role Assigned</h2>
            <p className="mb-4">
              Your account doesn't have a role assigned. Please contact support.
            </p>
            <p className="text-sm text-gray-600">
              Logged in as: {profile.email || "Unknown"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show redirecting message
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          {redirecting ? "Redirecting to your dashboard..." : "Loading..."}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
