// netlify/functions/stripe-webhook.js
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV || "production",
});
// PDF optional
let generateInvoicePDF = null;
try {
  const mod = await import("./invoiceGenerator.js");
  generateInvoicePDF = mod.generateInvoicePDF;
} catch (e) {
  console.warn("⚠️ invoiceGenerator not available:", e.message);
}

let _stripe;
let _supabase;

const getStripe = () => {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _supabase;
};

const generateInvoiceNumber = async () => {
  const { count } = await getSupabase()
    .from("invoices")
    .select("*", { count: "exact", head: true });
  return `INV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
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

const createInvoiceForCase = async (caseData, paymentIntentId) => {
  try {
    const sb = getSupabase();

    // Duplicate check
    const { data: existing } = await sb
      .from("invoices")
      .select("id, invoice_number")
      .eq("case_id", caseData.id)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // Fetch profile
    const { data: userProfile } = await sb
      .from("profiles")
      .select("*")
      .eq("id", caseData.user_id)
      .single();

    if (!userProfile)
      throw new Error("User profile not found: " + caseData.user_id);

    // Amounts
    let total = parseFloat(caseData.payment_amount || 0);
    let vatAmount = parseFloat(caseData.vat_amount || 0);
    let subtotal = total - vatAmount;
    if (total === 0) {
      const sf = parseFloat(caseData.service_fee || 0);
      const cf = parseFloat(caseData.court_fee || 0);
      subtotal = sf + cf;
      vatAmount = parseFloat(caseData.vat_amount || 0) || subtotal * 0.2;
      total = subtotal + vatAmount;
    }
    subtotal = parseFloat(subtotal.toFixed(2));
    vatAmount = parseFloat(vatAmount.toFixed(2));
    total = parseFloat(total.toFixed(2));

    const reference = generateCaseReference(
      caseData.id,
      userProfile.company_name,
    );
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
        unitAmount: subtotal,
      });

    const invoiceNumber = await generateInvoiceNumber();
    const today = new Date().toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const invoiceRecord = {
      case_id: caseData.id,
      user_id: caseData.user_id,
      invoice_number: invoiceNumber,
      reference,
      invoice_status: "paid",
      invoice_date: today,
      due_date: dueDate,
      currency_code: "GBP",
      subtotal,
      total_tax: vatAmount,
      total,
      amount_paid: total,
      amount_due: 0,
      payment_intent_id: paymentIntentId || caseData.payment_intent_id,
      payment_method: caseData.payment_method || "card",
      line_items: lineItems,
    };

    // PDF (optional)
    let pdfBase64 = null;
    if (generateInvoicePDF) {
      try {
        pdfBase64 = await generateInvoicePDF(
          invoiceRecord,
          caseData,
          userProfile,
        );
      } catch (e) {
        console.warn("⚠️ PDF failed:", e.message);
      }
    }

    // Save
    const { data: savedInvoice, error: insertError } = await sb
      .from("invoices")
      .insert({ ...invoiceRecord, invoice_pdf_base64: pdfBase64 })
      .select()
      .single();

    if (insertError)
      throw new Error("DB insert failed: " + insertError.message);

    // Sync log
    try {
      await sb.from("invoice_sync_logs").insert({
        case_id: caseData.id,
        invoice_id: savedInvoice.id,
        action: "create",
        status: "success",
        request_data: {
          triggered_by: "stripe_webhook",
          payment_intent_id: paymentIntentId,
        },
        response_data: { invoice_number: invoiceNumber },
      });
    } catch (_) {}

    return savedInvoice;
  } catch (err) {
    Sentry.captureException(err, {
      extra: {
        area: "create_invoice",
        caseId: caseData?.id,
        paymentIntentId: paymentIntentId,
      },
    });
    console.error("❌ Invoice creation failed:", err.message);

    try {
      await getSupabase()
        .from("invoice_sync_logs")
        .insert({
          case_id: caseData.id,
          action: "create",
          status: "failed",
          error_message: err.message,
          request_data: {
            triggered_by: "stripe_webhook",
            payment_intent_id: paymentIntentId,
          },
        });
    } catch (_) {}

    return null;
  }
};

// ─── Netlify handler ──────────────────────────────────────────────────────────
export const handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    stripeEvent = getStripe().webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    Sentry.captureException(err, {
      extra: { area: "stripe_webhook_signature" },
    });
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const sb = getSupabase();

  // Log webhook
  let webhookLog = null;
  try {
    const { data } = await sb
      .from("stripe_webhooks")
      .insert([
        {
          stripe_event_id: stripeEvent.id,
          event_type: stripeEvent.type,
          payment_intent_id: stripeEvent.data.object.id,
          data: stripeEvent.data.object,
          processed: false,
        },
      ])
      .select()
      .single();
    webhookLog = data;
  } catch (e) {
    console.error("Error logging webhook:", e.message);
  }

  switch (stripeEvent.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = stripeEvent.data.object;

      try {
        let caseData = null;

        // Primary lookup: find case by payment_intent_id (should always match if
        // payment_intent_id is written to the case record before payment is initiated)
        const { data: found, error: findError } = await sb
          .from("case_submissions")
          .select("*")
          .eq("payment_intent_id", paymentIntent.id)
          .single();

        if (!findError && found) {
          const { data: updated } = await sb
            .from("case_submissions")
            .update({
              payment_status: "succeeded",
              status: "submitted",
              is_draft: false,
              updated_at: new Date().toISOString(),
            })
            .eq("payment_intent_id", paymentIntent.id)
            .select()
            .single();
          caseData = updated || found;
        } else {
          // ── Fallback: require BOTH caseId AND userId from Stripe metadata ──
          // Never fall back to "most recent draft by user_id" — that causes
          // payments to be applied to the wrong case when a user has multiple
          // drafts in flight at the same time.
          const userId =
            paymentIntent.metadata?.userId || paymentIntent.metadata?.user_id;
          const caseId =
            paymentIntent.metadata?.caseId || paymentIntent.metadata?.case_id;

          if (!userId || !caseId) {
            // Not enough information to make a safe association — log and bail.
            // Root fix: ensure payment_intent_id is written to case_submissions
            // *before* the client_secret is returned to the frontend, and that
            // both caseId + userId are always included in PaymentIntent metadata.
            console.error(
              "⚠️ Cannot associate payment: missing caseId or userId in metadata.",
              {
                paymentIntentId: paymentIntent.id,
                metadata: paymentIntent.metadata,
              },
            );
            break;
          }

          // Require an exact match on both case ID and owner — no ambiguity.
          const { data: draftCase } = await sb
            .from("case_submissions")
            .select("*")
            .eq("id", caseId) // exact case match
            .eq("user_id", userId) // ownership check
            .eq("is_draft", true)
            .maybeSingle();

          if (!draftCase) {
            console.error("⚠️ No matching draft found for caseId/userId:", {
              caseId,
              userId,
              paymentIntentId: paymentIntent.id,
            });
            break;
          }

          const { data: updated } = await sb
            .from("case_submissions")
            .update({
              payment_intent_id: paymentIntent.id,
              payment_status: "succeeded",
              status: "submitted",
              is_draft: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", draftCase.id)
            .select()
            .single();

          caseData = updated || draftCase;
        }

        if (caseData) {
          await createInvoiceForCase(caseData, paymentIntent.id);
        } else {
          console.warn(
            "⚠️ No case found for payment intent:",
            paymentIntent.id,
          );
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: {
            area: "payment_intent_succeeded",
            paymentIntentId: paymentIntent.id,
          },
        });
        console.error("Error processing payment success:", error);
      }
      if (webhookLog) {
        try {
          await sb
            .from("stripe_webhooks")
            .update({ processed: true })
            .eq("id", webhookLog.id);
        } catch (_) {}
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const failedPayment = stripeEvent.data.object;

      try {
        await sb
          .from("case_submissions")
          .update({
            payment_status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", failedPayment.id);
      } catch (_) {}

      if (webhookLog) {
        try {
          await sb
            .from("stripe_webhooks")
            .update({ processed: true })
            .eq("id", webhookLog.id);
        } catch (_) {}
      }
      break;
    }

    default:
      console.log("Unhandled event type:", stripeEvent.type);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
