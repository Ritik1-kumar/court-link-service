// netlify/functions/update-profile-bank-details.js
import { createClient } from "@supabase/supabase-js";
import { ServerLogger, injectLogsIntoResponse } from "./logger.js";

// Initialize Supabase Admin client (server-side only, bypasses RLS)
let supabaseAdmin = null;
const getSupabaseAdmin = () => {
  if (!supabaseAdmin && process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return supabaseAdmin;
};

export const handler = async (event) => {
  const logger = new ServerLogger();

  const headers = {
    "Access-Control-Allow-Origin": process.env.CLIENT_URL ,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return injectLogsIntoResponse({
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    }, logger);
  }

  try {
    // Check environment configuration
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error("❌ Missing Supabase environment variables");
      return injectLogsIntoResponse({
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: "Server configuration error. Missing Supabase credentials.",
        }),
      }, logger);
    }

    const { userId, bankDetails, phone, vatReclaim, termsAccepted, marketingConsent } = JSON.parse(event.body);

    // Validation
    if (!userId) {
      logger.error("❌ Missing userId in request");
      return injectLogsIntoResponse({
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: "userId is required"
        }),
      }, logger);
    }

    logger.info(`📝 Updating profile bank details for user: ${userId}`);

    // Get admin client
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase admin client");
    }

    // Prepare update data
    const updateData = {
      bank_details: bankDetails || null,
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (phone !== undefined) updateData.phone = phone;
    if (vatReclaim !== undefined) updateData.vat_reclaim = vatReclaim;
    if (termsAccepted !== undefined) updateData.terms_accepted = termsAccepted;
    if (marketingConsent !== undefined) updateData.marketing_consent = marketingConsent;

    logger.info("Update data:", updateData);

    // Update profile using admin client (bypasses RLS)
    const { data, error } = await supabase
  .from("profiles")
  .update(updateData)
  .eq("id", userId)
  .select()
  .maybeSingle(); // ← returns null instead of erroring when no row exists

    if (error) {
      logger.error("❌ Error updating profile:", error);
      return injectLogsIntoResponse({
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message || "Failed to update profile"
        }),
      }, logger);
    }

    logger.success(`✅ Profile updated successfully for user: ${userId}`);

    return injectLogsIntoResponse({
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data
      }),
    }, logger);

  } catch (error) {
    logger.error("❌ Exception in update-profile-bank-details:", error);
    return injectLogsIntoResponse({
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || "Internal server error"
      }),
    }, logger);
  }
};
