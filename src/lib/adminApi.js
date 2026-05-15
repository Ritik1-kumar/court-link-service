// src/lib/adminApi.js
import { supabase } from "./supabase";

/**
 * Get the current user's auth token for API calls
 */
const getAuthToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("No active session. Please log in.");
  }

  return session.access_token;
};

/**
 * Get the base URL for admin functions
 * Works with your existing dev-server.js setup
 */
const getAdminFunctionUrl = () => {
  // Check if we're in development mode
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // Use your dev server (default port 3001)
    const devServerUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3001";
    return `${devServerUrl}/.netlify/functions/admin-operations`;
  }

  // Production: use relative path (Netlify)
  return "/.netlify/functions/admin-operations";
};

/**
 * Call the admin operations function
 */
const callAdminFunction = async (operation, params = {}) => {
  const token = await getAuthToken();
  const functionUrl = getAdminFunctionUrl();

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      operation,
      ...params,
    }),
  });

  const data = await response.json();

  // Log server logs if present
  // if (data._serverLogs) {
  //   console.groupCollapsed('🖥️ Server Logs');
  //   data._serverLogs.forEach(log => {
  //     console.log(log.message);
  //   });
  //   console.groupEnd();
  // }

  if (!response.ok) {
    throw new Error(
      data.error || `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  if (!data.success) {
    throw new Error(data.error || "Operation failed");
  }

  return data.data;
};

/**
 * List all users (admin only)
 */
export const listUsers = async () => {
  return callAdminFunction("listUsers");
};

/**
 * Get admin emails (admin only)
 */
export const getAdminEmails = async () => {
  return callAdminFunction("getAdminEmails");
};

/**
 * Invite a new user (admin only)
 */
export const inviteUser = async ({ fullName, email, role, redirectTo }) => {
  return callAdminFunction("inviteUser", {
    fullName,
    email,
    role,
    redirectTo,
  });
};

/**
 * Delete a user (admin only)
 */
export const deleteUser = async (userId) => {
  return callAdminFunction("deleteUser", { userId });
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (userId, newRole) => {
  return callAdminFunction("updateUserRole", { userId, newRole });
};
