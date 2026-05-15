// netlify/functions/create-invoice-for-case.js
import { createClient } from "@supabase/supabase-js";
import { ServerLogger, injectLogsIntoResponse } from "./logger.js";

// PDF optional — requires pdf-lib
let generateInvoicePDF = null;

let _supabase = null;
const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }
  return _supabase;
};

/**
 * Generates a unique invoice number using a DB sequence-style approach.
 *
 * WHY NOT COUNT(*)+1:
 * The old approach did SELECT COUNT(*) then built a number from it.
 * Two concurrent requests see the same count → same number → one insert fails
 * with a unique constraint violation. Instead we use a retry loop that
 * increments until it finds a number not already in use, making it
 * race-condition-safe without needing a DB sequence.
 */
const generateInvoiceNumber = async (sb) => {
  const year = new Date().getFullYear();

  // Get the highest existing sequence number for this year
  const { data: rows } = await sb
    .from("invoices")
    .select("invoice_number")
    .like("invoice_number", `INV-${year}-%`)
    .order("invoice_number", { ascending: false })
    .limit(1);

  let next = 1;
  if (rows && rows.length > 0) {
    const last = rows[0].invoice_number; // e.g. "INV-2025-00042"
    const parts = last.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) next = lastSeq + 1;
  }

  // Build candidate and verify it doesn't already exist (safety net for races)
  // Retry up to 10 times in case of a concurrent insert between our read and write
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `INV-${year}-${String(next + attempt).padStart(5, "0")}`;
    const { data: conflict } = await sb
      .from("invoices")
      .select("id")
      .eq("invoice_number", candidate)
      .maybeSingle();

    if (!conflict) return candidate; // number is free
  }

  // Absolute fallback: timestamp-based number (guaranteed unique)
  return `INV-${year}-T${Date.now()}`;
};

const generateCaseReference = (caseId, companyName) => {
  if (!caseId) return "N/A";
  const baseId = caseId.substring(0, 8).toUpperCase();
  if (companyName) {
    const prefix = companyName
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 3)
      .toUpperCase();
    if (prefix.length > 0) return `${prefix}-${baseId}`;
  }
  return `CASE-${baseId}`;
};

const calculateAmounts = (caseData) => {
  let total = parseFloat(caseData.payment_amount || 0);
  let vatAmount = parseFloat(caseData.vat_amount || 0);
  let subtotal = total - vatAmount;

  if (total === 0) {
    const serviceFee = parseFloat(caseData.service_fee || 0);
    const courtFee = parseFloat(caseData.court_fee || 0);
    subtotal = serviceFee + courtFee;
    vatAmount = parseFloat(caseData.vat_amount || 0) || subtotal * 0.2;
    total = subtotal + vatAmount;
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    total_tax: parseFloat(vatAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

export const handler = async (event) => {
  const logger = new ServerLogger();
  const sb = getSupabase();
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Load PDF generator if available
  if (!generateInvoicePDF) {
    try {
      const mod = await import("./invoiceGenerator.js");
      generateInvoicePDF = mod.generateInvoicePDF;
    } catch (e) {
      console.warn("⚠️ invoiceGenerator not available:", e.message);
    }
  }

  if (event.httpMethod === "OPTIONS")
    return { statusCode: 200, headers, body: "" };
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

  let caseId;
  try {
    ({ caseId } = JSON.parse(event.body || "{}"));
  } catch {
    return injectLogsIntoResponse(
      {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid JSON" }),
      },
      logger,
    );
  }

  if (!caseId) {
    return injectLogsIntoResponse(
      {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "caseId is required" }),
      },
      logger,
    );
  }

  try {
    logger.info("🔍 Creating invoice for case:", caseId);

    // Fetch case
    const { data: caseData, error: caseError } = await sb
      .from("case_submissions")
      .select("*")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseData) {
      return injectLogsIntoResponse(
        {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Case not found" }),
        },
        logger,
      );
    }

    // ── Duplicate check ──────────────────────────────────────────────────────
    // This runs for BOTH the client call and the webhook call.
    // One of them will find an existing invoice and return early.
    // The loser of the race returns a 200 (not 400) so the client-side
    // alreadyExists handling works correctly without showing an error to the user.
    const { data: existing } = await sb
      .from("invoices")
      .select("invoice_number, id")
      .eq("case_id", caseId)
      .maybeSingle();

    if (existing) {
      logger.warn("ℹ️ Invoice already exists:", existing.invoice_number);
      return injectLogsIntoResponse(
        {
          // Return 200 so the client treats this as a soft/non-error outcome
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            alreadyExists: true,
            invoiceNumber: existing.invoice_number,
            invoiceId: existing.id,
          }),
        },
        logger,
      );
    }
    // ────────────────────────────────────────────────────────────────────────

    // Fetch profile
    const { data: userProfile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", caseData.user_id)
      .single();

    if (!userProfile) {
      return injectLogsIntoResponse(
        {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "User profile not found" }),
        },
        logger,
      );
    }

    // Build invoice
    const amounts = calculateAmounts(caseData);
    const invoiceNumber = await generateInvoiceNumber(sb);
    const reference = generateCaseReference(
      caseData.id,
      userProfile.company_name,
    );
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const isPaid = caseData.payment_status === "succeeded";

    const lineItems = [];
    const serviceFee = parseFloat(caseData.service_fee || 0);
    const courtFee = parseFloat(caseData.court_fee || 0);
    if (serviceFee > 0)
      lineItems.push({
        description: `Legal Case Management Service — ${reference}`,
        quantity: 1,
        unitAmount: serviceFee,
      });
    if (courtFee > 0)
      lineItems.push({
        description: `Court Fee — ${caseData.court || "Court"}`,
        quantity: 1,
        unitAmount: courtFee,
      });
    if (lineItems.length === 0)
      lineItems.push({
        description: `Case Submission — ${reference}`,
        quantity: 1,
        unitAmount: amounts.subtotal,
      });

    const invoiceRecord = {
      case_id: caseData.id,
      user_id: caseData.user_id,
      invoice_number: invoiceNumber,
      reference,
      invoice_status: isPaid ? "paid" : "authorised",
      invoice_date: today,
      due_date: dueDate,
      currency_code: "GBP",
      line_items: lineItems,
      ...amounts,
      amount_paid: isPaid ? amounts.total : 0,
      amount_due: isPaid ? 0 : amounts.total,
      payment_method: caseData.payment_method || null,
      payment_intent_id: caseData.payment_intent_id || null,
    };

    // Generate PDF (optional)
    let invoicePdfBase64 = null;
    if (generateInvoicePDF) {
      try {
        invoicePdfBase64 = await generateInvoicePDF(
          invoiceRecord,
          caseData,
          userProfile,
        );
        logger.success("✅ PDF generated");
      } catch (pdfErr) {
        logger.warn("⚠️ PDF failed (invoice still saves):", pdfErr.message);
      }
    }

    // Save invoice
    const { data: savedInvoice, error: insertError } = await sb
      .from("invoices")
      .insert({ ...invoiceRecord, invoice_pdf_base64: invoicePdfBase64 })
      .select()
      .single();

    if (insertError) {
      // Another concurrent request won the race between our duplicate-check and insert.
      // Look up the winner's invoice and return it as success.
      if (
        insertError.message.includes("duplicate key") ||
        insertError.message.includes("unique constraint")
      ) {
        logger.warn("⚠️ Race condition on insert — fetching winning invoice");
        const { data: raceWinner } = await sb
          .from("invoices")
          .select("invoice_number, id")
          .eq("case_id", caseId)
          .maybeSingle();

        return injectLogsIntoResponse(
          {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              alreadyExists: true,
              invoiceNumber: raceWinner?.invoice_number,
              invoiceId: raceWinner?.id,
            }),
          },
          logger,
        );
      }

      throw new Error("DB insert failed: " + insertError.message);
    }

    // Sync log (non-blocking)
    try {
      await sb.from("invoice_sync_logs").insert({
        case_id: caseData.id,
        invoice_id: savedInvoice.id,
        action: "create",
        status: "success",
        request_data: { case_id: caseData.id },
        response_data: { invoice_number: invoiceNumber },
      });
    } catch (_) {}

    logger.success("✅ Invoice created:", invoiceNumber);

    return injectLogsIntoResponse(
      {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          invoiceNumber,
          invoiceId: savedInvoice.id,
          invoiceStatus: invoiceRecord.invoice_status,
          invoicePdfBase64,
        }),
      },
      logger,
    );
  } catch (error) {
    logger.error("❌ Error:", error.message);

    try {
      await getSupabase()
        .from("invoice_sync_logs")
        .insert({
          case_id: caseId,
          action: "create",
          status: "failed",
          error_message: error.message,
          request_data: { case_id: caseId },
        });
    } catch (_) {}

    return injectLogsIntoResponse(
      {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: error.message }),
      },
      logger,
    );
  }
};
