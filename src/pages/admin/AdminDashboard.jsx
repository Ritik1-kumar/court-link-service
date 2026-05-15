// src/pages/admin/AdminDashboard.jsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle } from "lucide-react";
import {
  formatAmount,
  calculateStats,
  deleteCaseFromDatabase,
  getStatusLabel,
  generateCompanyCaseId,
} from "@/lib/caseUtils";
import { supabase } from "@/lib/supabase";
import { useDashboard } from "@/hooks/useDashboard";
import { useDebounce } from "@/hooks/useDebounce";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import AdminCaseFilters from "@/components/admin/AdminCaseFilters";
import AdminCaseTable from "@/components/admin/AdminCaseTable";
import Pagination from "@/components/Pagination";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { addCaseHistory } from "@/lib/caseHistory";
import { generateCaseDetailsPDF } from "@/lib/pdfUtils";

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedCases, setSelectedCases] = useState([]);
  const [clientPage, setClientPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    caseIds: [],
    caseNames: [],
  });
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const ITEMS_PER_PAGE = 10;

  const hasActiveFilters = useMemo(() => {
    return (
      (debouncedSearchTerm && debouncedSearchTerm.trim() !== "") ||
      statusFilter !== "all" ||
      dateFilter !== "all"
    );
  }, [debouncedSearchTerm, statusFilter, dateFilter]);

  const fetchQuery = useCallback(
    async (supabaseClient, { from, to, filters }) => {
      try {
        const { statusFilter: status, dateFilter: date, hasFilters } = filters;

        let query = supabaseClient
          .from("case_submissions")
          .select("*", { count: "exact" })
          .eq("is_draft", false);

        if (status && status !== "all") {
          query = query.eq("status", status);
        }

        if (date && date !== "all") {
          const now = new Date();
          let startDate;

          switch (date) {
            case "today":
              startDate = new Date(now.setHours(0, 0, 0, 0));
              break;
            case "week":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "month":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
          }

          if (startDate) {
            query = query.gte("created_at", startDate.toISOString());
          }
        }

        query = query.order(sortBy, { ascending: sortOrder === "asc" });

        let casesData, casesError, count;
        if (!hasFilters) {
          const result = await query.range(from, to);
          casesData = result.data;
          casesError = result.error;
          count = result.count;
        } else {
          const result = await query;
          casesData = result.data;
          casesError = result.error;
          count = result.count;
        }

        if (casesError) {
          console.error("Cases fetch error:", casesError);
          throw casesError;
        }

        let casesWithProfiles = casesData || [];

        if (casesData && casesData.length > 0) {
          const userIds = [...new Set(casesData.map((c) => c.user_id))].filter(
            Boolean,
          );

          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } =
              await supabaseClient
                .from("profiles_public")
                .select("id, email, role, full_name, company_name")
                .in("id", userIds);

            if (!profilesError && profilesData) {
              casesWithProfiles = casesData.map((caseItem) => {
                const profile = profilesData.find(
                  (p) => p.id === caseItem.user_id,
                );
                return {
                  ...caseItem,
                  user_profile: profile || null,
                };
              });
            }
          }
        }

        return {
          data: casesWithProfiles,
          error: null,
          count: count || 0,
        };
      } catch (error) {
        console.error("Error in fetchQuery:", error);
        return {
          data: [],
          error: error,
          count: 0,
        };
      }
    },
    [sortBy, sortOrder],
  );

  const filters = useMemo(
    () => ({
      statusFilter,
      dateFilter,
      hasFilters: hasActiveFilters,
    }),
    [statusFilter, dateFilter, hasActiveFilters],
  );

  const {
    cases,
    loading,
    error,
    stats,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    refetch,
    goToPage,
    setError,
    clearError,
  } = useDashboard({
    userId: user?.id,
    fetchQuery,
    calculateStats,
    itemsPerPage: ITEMS_PER_PAGE,
    filters,
  });

  const statsConfig = [
    {
      title: "Total Cases",
      key: "totalCases",
      icon: FileText,
      iconBgColor: "bg-red-100",
      iconColor: "text-red-600",
    },
    {
      title: "Cases Pending Review",
      key: "pendingCases",
      icon: Clock,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      title: "Cases Completed",
      key: "completedCases",
      icon: CheckCircle,
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
    },
    {
      title: "Total Case Value",
      icon: FileText,
      iconBgColor: "bg-red-100",
      iconColor: "text-red-600",
      valueColor: "text-red-600",
      getValue: (stats) => formatAmount(stats.totalAmount),
    },
  ];

  const processedCases = useMemo(() => {
    if (!hasActiveFilters) {
      return cases;
    }

    let filtered = cases.filter((caseItem) => {
      const matchesSearch =
        !debouncedSearchTerm ||
        debouncedSearchTerm.trim() === "" ||
        [
          caseItem.claimant_name,
          caseItem.defendant_name,
          caseItem.claimant_ref,
          caseItem.defendant_ref,
          caseItem.claim_number,
          caseItem.user_profile?.email,
          caseItem.user_profile?.full_name,
          caseItem.id,
          generateCompanyCaseId(
            caseItem.id,
            caseItem.user_profile?.company_name,
          ),
        ].some((field) =>
          field?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
        );

      return matchesSearch;
    });

    return filtered;
  }, [cases, debouncedSearchTerm, hasActiveFilters]);

  const paginatedCases = useMemo(() => {
    if (!hasActiveFilters) {
      return processedCases;
    }

    const startIndex = (clientPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return processedCases.slice(startIndex, endIndex);
  }, [processedCases, clientPage, hasActiveFilters]);

  const paginationInfo = useMemo(() => {
    if (!hasActiveFilters) {
      return {
        currentPage: currentPage,
        totalPages: totalPages,
        totalCount: totalCount,
      };
    } else {
      return {
        currentPage: clientPage,
        totalPages: Math.ceil(processedCases.length / ITEMS_PER_PAGE),
        totalCount: processedCases.length,
      };
    }
  }, [
    hasActiveFilters,
    currentPage,
    totalPages,
    totalCount,
    clientPage,
    processedCases,
  ]);

  useEffect(() => {
    setClientPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter]);

  const handlePageChange = (newPage) => {
    if (!hasActiveFilters) {
      goToPage(newPage);
    } else {
      if (newPage >= 1 && newPage <= paginationInfo.totalPages) {
        setClientPage(newPage);
      }
    }
  };

  const handleCaseAction = useCallback(
    async (caseId, action) => {
      try {
        const caseToUpdate = cases.find((c) => c.id === caseId);
        if (!caseToUpdate) {
          throw new Error("Case not found");
        }
        const oldStatus = caseToUpdate.status;

        let updateData = { updated_at: new Date().toISOString() };
        let newStatus;

        switch (action) {
          case "approve":
            newStatus = "approved";
            updateData.status = newStatus;
            updateData.court_notified_date = new Date().toISOString();

            if (caseToUpdate.hceo_choice && !caseToUpdate.assigned_user_email) {
              const { data: hceoProfile, error: hceoError } = await supabase
                .from("profiles_public")
                .select("id, full_name, email")
                .eq("role", "hceo")
                .ilike("full_name", caseToUpdate.hceo_choice)
                .single();

              if (!hceoError && hceoProfile) {
                updateData.assigned_user_name = hceoProfile.full_name;
                updateData.assigned_user_email = hceoProfile.email;
              }
            }
            break;
          case "complete":
            newStatus = "writ_received";
            updateData.status = newStatus;
            break;
          default:
            return;
        }

        const { data, error } = await supabase
          .from("case_submissions")
          .update(updateData)
          .eq("id", caseId)
          .select()
          .single();

        if (error) throw error;

        const { data: profile } = await supabase
          .from("profiles_public")
          .select("email, full_name, role")
          .eq("id", user.id)
          .single();

        let actionDescription = "";
        let actionType = "status_change";

        if (action === "approve") {
          actionDescription = "Case approved and sent to court";
          actionType = "case_approved";
        } else {
          actionDescription = `Case status changed from ${getStatusLabel(
            oldStatus,
          )} to ${getStatusLabel(newStatus)}`;
        }

        await addCaseHistory({
          caseId: caseId,
          userId: user.id,
          userEmail: profile?.email || user.email,
          userName: profile?.full_name || "Admin",
          userRole: profile?.role || "admin",
          actionType: actionType,
          actionDescription: actionDescription,
          oldValue: getStatusLabel(oldStatus),
          newValue: getStatusLabel(newStatus),
        });

        await refetch();
      } catch (err) {
        console.error(`Error ${action}ing case:`, err);
        setError(`Failed to ${action} case: ${err.message}`);
      }
    },
    [cases, user, refetch, setError],
  );

  const handleDeleteCase = useCallback((caseItem) => {
    setDeleteDialog({
      isOpen: true,
      caseIds: [caseItem.id],
      caseNames: [caseItem.defendant_name],
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedCases.length === 0) return;

    const casesToDelete = cases.filter((c) => selectedCases.includes(c.id));
    setDeleteDialog({
      isOpen: true,
      caseIds: selectedCases,
      caseNames: casesToDelete.map((c) => c.defendant_name),
    });
  }, [selectedCases, cases]);

  const handleConfirmDelete = useCallback(async () => {
    try {
      const deletionPromises = deleteDialog.caseIds.map(async (caseId) => {
        const caseItem = cases.find((c) => c.id === caseId);
        if (!caseItem) return;

        await deleteCaseFromDatabase(
          caseId,
          user,
          caseItem.judgment_file_paths,
          true,
        );
      });

      await Promise.all(deletionPromises);
      await refetch();
      setSelectedCases([]);
      setDeleteDialog({ isOpen: false, caseIds: [], caseNames: [] });
    } catch (err) {
      console.error("Error deleting case(s):", err);
      setError(`Failed to delete case(s): ${err.message}`);
    }
  }, [deleteDialog.caseIds, cases, user, refetch, setError]);

  const handleCloseDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false, caseIds: [], caseNames: [] });
  }, []);

  const handleBulkAction = useCallback(
    async (action) => {
      if (selectedCases.length === 0) return;

      if (action === "delete") {
        handleBulkDelete();
        return;
      }

      try {
        for (const caseId of selectedCases) {
          await handleCaseAction(caseId, action);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        setSelectedCases([]);
      } catch (err) {
        console.error("Error with bulk action:", err);
        setError(`Failed to perform bulk action: ${err.message}`);
      }
    },
    [selectedCases, handleCaseAction, handleBulkDelete, setError],
  );

  const handleDownloadCaseReport = useCallback(
    async (caseItem) => {
      try {
        await generateCaseDetailsPDF(caseItem, "admin", {
          userProfile: caseItem.user_profile,
        });
      } catch (err) {
        console.error("Error generating case report:", err);
        setError(`Failed to generate case report: ${err.message}`);
      }
    },
    [setError],
  );

  const handleViewCase = useCallback(
    (caseId) => {
      navigate(`/admin/case/${caseId}`);
    },
    [navigate],
  );

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Manage and review all case submissions"
      loading={loading}
      error={error}
      onDismissError={clearError}
      bgColor="bg-blue-50"
    >
      <StatsGrid stats={stats} config={statsConfig} />

      <Card>
        <CardHeader>
          <CardTitle>Case Management</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminCaseFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onRefresh={refetch}
          />
          <AdminCaseTable
            cases={paginatedCases}
            selectedCases={selectedCases}
            setSelectedCases={setSelectedCases}
            onViewCase={handleViewCase}
            onCaseAction={handleCaseAction}
            onBulkAction={handleBulkAction}
            onDelete={handleDeleteCase}
            onError={setError}
            onDownloadCaseReport={handleDownloadCaseReport}
          />

          <Pagination
            currentPage={paginationInfo.currentPage}
            totalPages={paginationInfo.totalPages}
            totalCount={paginationInfo.totalCount}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        caseName={
          deleteDialog.caseNames.length === 1
            ? deleteDialog.caseNames[0]
            : `${deleteDialog.caseNames.length} cases`
        }
      />
    </DashboardLayout>
  );
};

export default AdminDashboard;
