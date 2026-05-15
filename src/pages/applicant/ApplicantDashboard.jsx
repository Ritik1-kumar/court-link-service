// src/pages/applicant/ApplicantDashboard.jsx
import React, { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  PoundSterlingIcon,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  calculateApplicantStats,
  deleteCaseFromDatabase,
  formatAmount,
} from "@/lib/caseUtils";
import { useDashboard } from "@/hooks/useDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import CasesTable from "@/components/CasesTable";
import Pagination from "@/components/Pagination";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { generateCaseDetailsPDF } from "@/lib/pdfUtils";

const ApplicantDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    caseItem: null,
  });

  // Fetch query for applicant cases WITH PAGINATION
  const fetchQuery = useCallback(
    async (supabase, { from, to }) => {
      try {
        const { data, error, count } = await supabase
          .from("case_submissions")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (error) {
          console.error("Fetch error:", error);
          throw error;
        }

        // Return with count - this is critical for pagination
        return {
          data: data || [],
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
    [user?.id],
  );

  // Use dashboard hook
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
    clearError,
    setError,
  } = useDashboard({
    userId: user?.id,
    fetchQuery,
    calculateStats: calculateApplicantStats,
    itemsPerPage: 10, // Entries per page
  });

  // Stats configuration
  const statsConfig = [
    {
      title: "Total Cases",
      key: "totalCases",
      icon: FileText,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Cases Pending Review",
      key: "pendingCases",
      icon: Clock,
      iconBgColor: "bg-yellow-100",
      iconColor: "text-yellow-600",
      valueColor: "text-yellow-600",
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
      icon: PoundSterlingIcon,
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
      getValue: (stats) => formatAmount(stats.totalAmount),
    },
  ];

  // Handle case deletion - Open dialog
  const handleDeleteCase = useCallback((caseItem) => {
    setDeleteDialog({
      isOpen: true,
      caseItem,
    });
  }, []);

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.caseItem) return;

    try {
      await deleteCaseFromDatabase(
        deleteDialog.caseItem.id,
        user,
        deleteDialog.caseItem.judgment_file_paths,
        false, // isAdmin flag - applicant
      );
      await refetch();
      setDeleteDialog({ isOpen: false, caseItem: null });
    } catch (err) {
      console.error("Error deleting case:", err);
      setError(`Failed to delete case: ${err.message}`);
      setDeleteDialog({ isOpen: false, caseItem: null });
    }
  }, [deleteDialog.caseItem, user, refetch, setError]);

  // Handle dialog close
  const handleCloseDialog = useCallback(() => {
    setDeleteDialog({ isOpen: false, caseItem: null });
  }, []);

  const handleDownloadCaseReport = useCallback(
    async (caseItem) => {
      try {
        await generateCaseDetailsPDF(caseItem, "applicant", {
          userProfile: profile, // Pass profile for correct company case ID
        });
      } catch (err) {
        console.error("Error generating case report:", err);
        setError(`Failed to generate case report: ${err.message}`);
      }
    },
    [setError, profile],
  );

  return (
    <DashboardLayout
      title="Applicant Dashboard"
      loading={loading}
      error={error}
      onDismissError={clearError}
      bgColor="bg-blue-50"
    >
      <StatsGrid stats={stats} config={statsConfig} />
      <CasesTable
        cases={cases}
        title="Your Cases"
        onDelete={handleDeleteCase}
        onDownloadCaseReport={handleDownloadCaseReport}
        userCompanyName={profile?.company_name}
      />

      {/* Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        caseName={deleteDialog.caseItem?.defendant_name || ""}
      />
    </DashboardLayout>
  );
};

export default ApplicantDashboard;
