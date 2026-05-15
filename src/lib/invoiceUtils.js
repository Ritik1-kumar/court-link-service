// src/lib/invoiceUtils.js
// Replaces xeroAuthUtils.js — no Xero dependency

import { supabase } from "./supabase";

/**
 * Create an invoice for a case after payment succeeds.
 *
 * Guards against the race condition where both the Stripe webhook and the
 * client-side handlePaymentSuccess call this simultaneously, which previously
 * caused a duplicate key violation on "invoices_invoice_number_key".
 *
 * Strategy:
 *   1. Check the DB first — if an invoice already exists, return early.
 *   2. If the server still returns a duplicate error, catch it gracefully.
 *
 * @param {string} caseId
 * @returns {Promise<{success, invoiceNumber, invoiceId, invoicePdfBase64, alreadyExists, error}>}
 */
export const createInvoiceForCase = async (caseId) => {
  try {
    // ── Guard: check for an existing invoice before hitting the server ──────
    const { data: existing, error: lookupError } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("case_id", caseId)
      .maybeSingle();

    if (lookupError) {
      // Non-fatal — log and fall through; let the server decide
      console.warn(
        "⚠️ Could not check for existing invoice:",
        lookupError.message,
      );
    } else if (existing) {
      return {
        success: false,
        alreadyExists: true,
        invoiceNumber: existing.invoice_number,
        invoiceId: existing.id,
      };
    }
    // ────────────────────────────────────────────────────────────────────────

    const baseUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3001/.netlify/functions"
        : `${window.location.origin}/.netlify/functions`;

    const response = await fetch(`${baseUrl}/create-invoice-for-case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId }),
    });

    const result = await response.json();

    if (!response.ok) {
      // The webhook may have beaten us to it — treat any duplicate as a soft error
      if (
        result.invoiceNumber ||
        result.error?.includes("duplicate key") ||
        result.error?.includes("unique constraint")
      ) {
        return { success: false, alreadyExists: true, ...result };
      }
      throw new Error(result.error || "Failed to create invoice");
    }

    return { success: true, ...result };
  } catch (error) {
    // Last-resort: the unique constraint bubbled up from the Netlify function
    if (
      error.message?.includes("duplicate key") ||
      error.message?.includes("unique constraint") ||
      error.message?.includes("invoices_invoice_number_key")
    ) {
      return { success: false, alreadyExists: true, error: error.message };
    }

    console.error("❌ Error creating invoice:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Fetch the PDF for an existing invoice
 * @param {string} invoiceId - DB invoice id
 * @param {string} caseId    - Alternatively look up by caseId
 * @returns {Promise<{success, invoicePdfBase64, error}>}
 */
export const getInvoicePdf = async (invoiceId = null, caseId = null) => {
  try {
    const baseUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:3001/.netlify/functions"
        : `${window.location.origin}/.netlify/functions`;

    const response = await fetch(`${baseUrl}/get-invoice-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, caseId }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to fetch PDF");

    return { success: true, invoicePdfBase64: result.invoicePdfBase64 };
  } catch (error) {
    console.error("❌ Error fetching invoice PDF:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all invoices for the current logged-in user
 * @returns {Promise<Array>}
 */
export const getUserInvoices = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      reference,
      invoice_status,
      invoice_date,
      due_date,
      subtotal,
      total_tax,
      total,
      amount_paid,
      amount_due,
      currency_code,
      created_at,
      case_id
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  return data ?? [];
};

/**
 * Download an invoice PDF and trigger a browser download
 * @param {string} invoiceId
 * @param {string} invoiceNumber - used as filename
 */
export const downloadInvoicePdf = async (invoiceId, invoiceNumber) => {
  const { success, invoicePdfBase64, error } = await getInvoicePdf(invoiceId);
  if (!success) throw new Error(error || "Could not load PDF");

  const byteChars = atob(invoicePdfBase64);
  const byteNums = new Uint8Array(byteChars.length).map((_, i) =>
    byteChars.charCodeAt(i),
  );
  const blob = new Blob([byteNums], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoiceNumber || "invoice"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
