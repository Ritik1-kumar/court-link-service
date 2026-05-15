// netlify/functions/get-invoice-pdf.js
// Serves the stored invoice PDF (or regenerates it) — no Xero dependency
import { createClient } from "@supabase/supabase-js";
import { ServerLogger, injectLogsIntoResponse } from "./logger.js";
import { generateInvoicePDF } from "./invoiceGenerator.js";

let supabase = null;
const getSupabase = () => {
  if (!supabase && process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
};

export const handler = async (event) => {
  const logger = new ServerLogger();
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") {
    return injectLogsIntoResponse({ statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) }, logger);
  }

  try {
    const { invoiceId, caseId } = JSON.parse(event.body);
    if (!invoiceId && !caseId) {
      return injectLogsIntoResponse({ statusCode: 400, headers, body: JSON.stringify({ error: "invoiceId or caseId is required" }) }, logger);
    }

    const supabaseClient = getSupabase();

    // Fetch invoice record
    let query = supabaseClient.from("invoices").select("*");
    if (invoiceId) query = query.eq("id", invoiceId);
    else           query = query.eq("case_id", caseId).order("created_at", { ascending: false });

    const { data: invoice, error: invError } = await query.maybeSingle();
    if (invError || !invoice) {
      return injectLogsIntoResponse({ statusCode: 404, headers, body: JSON.stringify({ error: "Invoice not found" }) }, logger);
    }

    // If already have PDF stored, return it
    if (invoice.invoice_pdf_base64) {
      logger.success("✅ Returning stored invoice PDF");
      return injectLogsIntoResponse({
        statusCode: 200, headers,
        body: JSON.stringify({ success: true, invoicePdfBase64: invoice.invoice_pdf_base64 }),
      }, logger);
    }

    // Otherwise regenerate it
    logger.info("🔄 PDF not stored, regenerating...");
    const { data: caseData } = await supabaseClient.from("case_submissions").select("*").eq("id", invoice.case_id).single();
    const { data: userProfile } = await supabaseClient.from("profiles").select("*").eq("id", invoice.user_id).single();

    if (!caseData || !userProfile) {
      return injectLogsIntoResponse({ statusCode: 404, headers, body: JSON.stringify({ error: "Associated case or profile not found" }) }, logger);
    }

    const pdfBase64 = await generateInvoicePDF(invoice, caseData, userProfile);

    // Cache it back
    await supabaseClient.from("invoices").update({ invoice_pdf_base64: pdfBase64 }).eq("id", invoice.id).catch(() => {});

    logger.success("✅ PDF regenerated successfully");
    return injectLogsIntoResponse({
      statusCode: 200, headers,
      body: JSON.stringify({ success: true, invoicePdfBase64: pdfBase64 }),
    }, logger);

  } catch (error) {
    logger.error("❌ Error fetching invoice PDF:", error);
    return injectLogsIntoResponse({ statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }, logger);
  }
};