// src/hooks/useInvoice.js
// Replaces useXeroTokenRefresh.js — handles invoice creation & PDF download

import { useState, useCallback } from "react";
import {
  createInvoiceForCase,
  getInvoicePdf,
  getUserInvoices,
  downloadInvoicePdf,
} from "@/lib/invoiceUtils";

/**
 * Hook for managing invoice creation and retrieval
 *
 * Usage:
 *   const { createInvoice, loading, error, invoiceNumber } = useInvoice();
 *   await createInvoice(caseId); // call after payment succeeds
 */
export const useInvoice = () => {
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [invoiceId,     setInvoiceId]     = useState(null);
  const [pdfBase64,     setPdfBase64]     = useState(null);

  /** Create an invoice for a case (call once payment_status = 'succeeded') */
  const createInvoice = useCallback(async (caseId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createInvoiceForCase(caseId);

      if (result.alreadyExists) {
        console.warn("Invoice already exists:", result.invoiceNumber);
        setInvoiceNumber(result.invoiceNumber);
        setInvoiceId(result.invoiceId);
        return result;
      }

      if (!result.success) throw new Error(result.error || "Invoice creation failed");

      setInvoiceNumber(result.invoiceNumber);
      setInvoiceId(result.invoiceId);
      if (result.invoicePdfBase64) setPdfBase64(result.invoicePdfBase64);

      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch the PDF for an already-created invoice */
  const fetchPdf = useCallback(async (id = invoiceId, caseId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getInvoicePdf(id, caseId);
      if (!result.success) throw new Error(result.error);
      setPdfBase64(result.invoicePdfBase64);
      return result.invoicePdfBase64;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  /** Trigger a browser file download for the invoice PDF */
  const downloadPdf = useCallback(async (id = invoiceId, number = invoiceNumber) => {
    setLoading(true);
    setError(null);
    try {
      await downloadInvoicePdf(id, number);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, invoiceNumber]);

  return {
    loading,
    error,
    invoiceNumber,
    invoiceId,
    pdfBase64,
    createInvoice,
    fetchPdf,
    downloadPdf,
  };
};

/**
 * Hook for displaying a user's invoice history
 *
 * Usage:
 *   const { invoices, loading, refresh } = useInvoiceList();
 */
export const useInvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserInvoices();
      setInvoices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on first call
  const load = useCallback(() => {
    if (invoices.length === 0 && !loading) refresh();
  }, [invoices.length, loading, refresh]);

  return { invoices, loading, error, refresh, load };
};