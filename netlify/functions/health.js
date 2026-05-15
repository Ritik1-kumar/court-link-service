// netlify/functions/health.js
export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "ok",
      message: "Server is running",
      timestamp: new Date().toISOString(),
      stripe: !!process.env.STRIPE_SECRET_KEY,
      supabase: !!process.env.VITE_SUPABASE_URL,
    }),
  };
};
