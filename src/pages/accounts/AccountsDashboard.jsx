// src/pages/accounts/AccountsDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import { downloadInvoicePdf } from "@/lib/invoiceUtils";
import {
  Search,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  FileDown,
} from "lucide-react";

export default function AccountsDashboard() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalRevenue: 0,
  });

  // ── Fetch invoices ──────────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Step 1: fetch invoices + case_submissions join
      const { data: invoiceData, error: fetchError } = await supabase
        .from("invoices")
        .select(`
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
          payment_intent_id,
          created_at,
          case_id,
          user_id,
          case_submissions (
            claimant_name,
            defendant_name,
            claim_number
          )
        `)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Step 2: fetch profiles separately for all unique user_ids
      const userIds = [...new Set((invoiceData || []).map((i) => i.user_id).filter(Boolean))];
      let profilesMap = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email, company_name")
          .in("id", userIds);

        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      // Step 3: enrich invoices with profile data
      const enriched = (invoiceData || []).map((inv) => {
        const profile = profilesMap[inv.user_id] || {};
        return {
          ...inv,
          customer_name:  profile.full_name || profile.company_name || "N/A",
          customer_email: profile.email || "",
          claimant_name:  inv.case_submissions?.claimant_name || "",
          defendant_name: inv.case_submissions?.defendant_name || "",
          claim_number:   inv.case_submissions?.claim_number  || "",
        };
      });

      setInvoices(enriched);
      setFilteredInvoices(enriched);

      // Stats
      const paid    = enriched.filter((i) => i.invoice_status === "paid");
      const revenue = paid.reduce((s, i) => s + parseFloat(i.amount_paid || 0), 0);
      setStats({
        totalInvoices:  enriched.length,
        paidInvoices:   paid.length,
        unpaidInvoices: enriched.length - paid.length,
        totalRevenue:   revenue,
      });
    } catch (err) {
      console.error("Error fetching invoices:", err);
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInvoices(invoices);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredInvoices(
      invoices.filter(
        (inv) =>
          inv.reference?.toLowerCase().includes(term) ||
          inv.invoice_number?.toLowerCase().includes(term) ||
          inv.claimant_name?.toLowerCase().includes(term) ||
          inv.defendant_name?.toLowerCase().includes(term) ||
          inv.customer_email?.toLowerCase().includes(term) ||
          inv.customer_name?.toLowerCase().includes(term) ||
          inv.claim_number?.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, invoices]);

  // ── Download PDF ────────────────────────────────────────────────────────────
  const handleDownloadPdf = async (invoice) => {
    setDownloadingId(invoice.id);
    try {
      await downloadInvoicePdf(invoice.id, invoice.invoice_number);
    } catch (err) {
      alert("Could not download PDF: " + err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const headers = [
      "Invoice #", "Case Ref", "Claim #", "Customer", "Email",
      "Claimant", "Defendant", "Total", "Paid", "Due",
      "Status", "Invoice Date", "Due Date",
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number || "N/A",
      inv.reference || "N/A",
      inv.claim_number || "N/A",
      inv.customer_name || "N/A",
      inv.customer_email || "N/A",
      inv.claimant_name || "N/A",
      inv.defendant_name || "N/A",
      `£${parseFloat(inv.total || 0).toFixed(2)}`,
      `£${parseFloat(inv.amount_paid || 0).toFixed(2)}`,
      `£${parseFloat(inv.amount_due || 0).toFixed(2)}`,
      inv.invoice_status || "N/A",
      inv.invoice_date || "N/A",
      inv.due_date || "N/A",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `invoices_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const fmt = (n) => `£${parseFloat(n || 0).toFixed(2)}`;
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "N/A";

  const statusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":       return "bg-green-100 text-green-800";
      case "authorised": return "bg-blue-100 text-blue-800";
      case "draft":      return "bg-gray-100 text-gray-700";
      case "voided":     return "bg-red-100 text-red-800";
      default:           return "bg-yellow-100 text-yellow-800";
    }
  };

  // ── Stats config ────────────────────────────────────────────────────────────
  const statsConfig = [
    {
      title: "Total Invoices",
      key: "totalInvoices",
      icon: FileText,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Paid",
      key: "paidInvoices",
      icon: CheckCircle,
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
    {
      title: "Unpaid",
      key: "unpaidInvoices",
      icon: AlertTriangle,
      iconBgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      valueColor: "text-yellow-600",
    },
    {
      title: "Total Revenue",
      icon: DollarSign,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
      getValue: (s) => fmt(s.totalRevenue),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title="Accounts Dashboard"
      subtitle="Manage invoices and financial reports"
      loading={loading}
      error={error}
      onDismissError={() => setError("")}
      bgColor="bg-blue-50"
    >
      <StatsGrid stats={stats} config={statsConfig} />

      <Card>
        <CardHeader>
          <CardTitle>Invoice Management</CardTitle>
        </CardHeader>
        <CardContent>

          {/* Search + Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search by invoice #, case ref, customer, claimant…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={fetchInvoices}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={handleExportCsv}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden border rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {[
                      "Invoice #", "Case Ref", "Customer",
                      "Claimant / Defendant", "Amount",
                      "Status", "Date", "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        {searchTerm
                          ? "No invoices match your search."
                          : "No invoices yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50 transition-colors">

                        {/* Invoice # */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {inv.invoice_number || "N/A"}
                          </span>
                        </td>

                        {/* Case Ref */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-600">
                            {inv.reference || "N/A"}
                          </span>
                          {inv.claim_number && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              {inv.claim_number}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{inv.customer_name}</div>
                          <div className="text-xs text-gray-500">{inv.customer_email}</div>
                        </td>

                        {/* Claimant / Defendant */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-800">{inv.claimant_name || "—"}</div>
                          <div className="text-xs text-gray-500">v {inv.defendant_name || "—"}</div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {fmt(inv.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Paid: {fmt(inv.amount_paid)}
                          </div>
                          {parseFloat(inv.amount_due) > 0 && (
                            <div className="text-xs text-red-500">
                              Due: {fmt(inv.amount_due)}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${statusStyle(inv.invoice_status)}`}>
                            {inv.invoice_status || "unknown"}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>{fmtDate(inv.invoice_date)}</div>
                          <div className="text-xs text-gray-400">
                            Due: {fmtDate(inv.due_date)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPdf(inv)}
                            disabled={downloadingId === inv.id}
                            className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <FileDown className="h-3 w-3" />
                            {downloadingId === inv.id ? "…" : "INVOICE"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Showing {filteredInvoices.length} of {invoices.length} invoice
            {invoices.length !== 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}