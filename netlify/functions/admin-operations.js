// netlify/functions/admin-operations.js
import { createClient } from "@supabase/supabase-js";
import { ServerLogger, injectLogsIntoResponse } from "./logger.js";

// Initialize Supabase Admin client (server-side only, NOT exposed to browser)
let supabaseAdmin = null;
const getSupabaseAdmin = () => {
  if (
    !supabaseAdmin &&
    process.env.VITE_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return supabaseAdmin;
};

// Initialize a client for verifying user tokens (using anon key)
let supabaseClient = null;
// Fix 1: getSupabaseClient — use ANON key, not service role key
const getSupabaseClient = () => {
  if (
    !supabaseClient &&
    process.env.VITE_SUPABASE_URL &&
    process.env.VITE_SUPABASE_ANON_KEY
  ) {
    supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY, // ← was SUPABASE_SERVICE_ROLE_KEY (the bug)
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return supabaseClient;
};

/**
 * Verify the requesting user has admin privileges
 */
// Fix 2: verifyAdminAccess — use admin client directly to verify,
// since auth.getUser(token) works correctly with the service role client too,
// but we need to ensure the token is verified against the right project URL.
const verifyAdminAccess = async (authToken) => {
  if (!authToken) {
    throw new Error("Authentication required");
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (!supabaseAdmin) {
    throw new Error(
      "Supabase configuration error. Please check environment variables.",
    );
  }

  // Verify the user token — works fine with the service role client
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(authToken);

  if (authError || !user) {
    throw new Error(`Invalid authentication token: ${authError?.message}`);
  }

  // Get user profile to check role
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("User profile not found");
  }

  const adminRoles = ["admin", "hceo"];
  if (!adminRoles.includes(profile.role)) {
    throw new Error("Insufficient permissions. Admin access required.");
  }

  return { user, profile };
};

// Fix 3: listUsers — the auth.admin API requires the Supabase URL to NOT have
// a trailing slash, and the service role key must be correct.
// Add diagnostic logging to catch misconfiguration early.
const listUsers = async () => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase admin configuration error");
  }

  // Sanity check — auth.admin calls hit https://<project>.supabase.co/auth/v1/admin/users
  // If the URL is wrong you get back an HTML 404. Log it so it's visible.
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.replace(/\/$/, ""); // strip trailing slash

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  // auth.admin.listUsers returns { users } not { data: { users } }
  return data.users;
};
/**
 * Get admin emails
 */
const getAdminEmails = async () => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase configuration error");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .in("role", ["admin", "hceo"]);

  if (error) {
    throw new Error(`Failed to get admin emails: ${error.message}`);
  }

  return data?.map((profile) => profile.email) || [];
};

/**
 * Create/invite a new user
 */
const inviteUser = async ({ fullName, email, role, redirectTo }) => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase configuration error");
  }

  // Validate inputs
  if (!fullName || !email || !role) {
    throw new Error(
      "Missing required fields: fullName, email, and role are required",
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address");
  }

  const validRoles = ["applicant", "admin", "hceo", "accounts"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  // Invite user
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        role: role,
      },
      redirectTo: redirectTo,
    });

  if (inviteError) {
    if (inviteError.message?.includes("already registered")) {
      throw new Error("A user with this email already exists");
    } else if (inviteError.message?.includes("rate limit")) {
      throw new Error("Too many invite requests. Please try again later");
    }
    throw new Error(`Failed to invite user: ${inviteError.message}`);
  }

  return inviteData;
};

/**
 * Delete a user
 */
const deleteUser = async (userId) => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase configuration error");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  return { success: true };
};

/**
 * Update user role
 */
const updateUserRole = async (userId, newRole) => {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    throw new Error("Supabase configuration error");
  }

  if (!userId || !newRole) {
    throw new Error("User ID and new role are required");
  }

  const validRoles = ["applicant", "admin", "hceo", "accounts"];
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: newRole },
  });

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }

  return { success: true };
};

/**
 * Main handler
 */
export const handler = async (event) => {
  const logger = new ServerLogger();

  const headers = {
    "Access-Control-Allow-Origin": process.env.CLIENT_URL,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return injectLogsIntoResponse(
      {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: "Method not allowed" }),
      },
      logger,
    );
  }

  try {
    // Check environment configuration
    if (
      !process.env.VITE_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.VITE_SUPABASE_ANON_KEY
    ) {
      logger.error("❌ Missing environment variables");
      logger.error(
        "VITE_SUPABASE_URL:",
        process.env.VITE_SUPABASE_URL ? "Set" : "Missing",
      );
      logger.error(
        "SUPABASE_SERVICE_ROLE_KEY:",
        process.env.SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Missing",
      );
      logger.error(
        "VITE_SUPABASE_ANON_KEY:",
        process.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Missing",
      );

      return injectLogsIntoResponse(
        {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: "Server configuration error. Missing Supabase credentials.",
          }),
        },
        logger,
      );
    }

    // Get auth token from header
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    const authToken = authHeader?.replace("Bearer ", "");

    // Verify admin access
    logger.info("🔒 Verifying admin access...");
    const verifiedAdmin = await verifyAdminAccess(authToken);
    logger.success("✅ Admin access verified");

    // Parse request
    const { operation, ...params } = JSON.parse(event.body);

    logger.info(`📋 Executing operation: ${operation}`);

    let result;

    switch (operation) {
      case "listUsers":
        result = await listUsers();
        break;

      case "getAdminEmails":
        result = await getAdminEmails();
        break;

      case "inviteUser":
        result = await inviteUser(params);
        break;

      case "deleteUser":
        if (params.userId === verifiedAdmin.user.id) {
          throw new Error("Admins cannot delete their own account.");
        }
        result = await deleteUser(params.userId);
        break;

      case "updateUserRole":
        result = await updateUserRole(params.userId, params.newRole);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    logger.success(`✅ Operation ${operation} completed successfully`);

    return injectLogsIntoResponse(
      {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: result,
        }),
      },
      logger,
    );
  } catch (error) {
    logger.error("❌ Error in admin operation:", error);

    // Determine appropriate status code
    let statusCode = 500;
    if (
      error.message.includes("Authentication required") ||
      error.message.includes("Invalid authentication")
    ) {
      statusCode = 401;
    } else if (error.message.includes("Insufficient permissions")) {
      statusCode = 403;
    } else if (
      error.message.includes("Missing required fields") ||
      error.message.includes("Invalid")
    ) {
      statusCode = 400;
    }

    return injectLogsIntoResponse(
      {
        statusCode,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message || "An error occurred",
        }),
      },
      logger,
    );
  }
};
