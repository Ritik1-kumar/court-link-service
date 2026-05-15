// src/pages/hceo/HceoDashboard.jsx
import React, { useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Clock,
  CheckCircle,
  PoundSterlingIcon,
  Scale,
  User,
  Building,
  Calendar,
  FileDown,
} from "lucide-react";
import {
  generateCompanyCaseId,
  formatAmount,
  formatDate,
  calculateHCEOStats,
} from "@/lib/caseUtils";
import { useDashboard } from "@/hooks/useDashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatsGrid from "@/components/dashboard/StatsGrid";
import DashboardTable from "@/components/dashboard/DashboardTable";
import Pagination from "@/components/Pagination";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { generateCaseDetailsPDF } from "@/lib/pdfUtils";

const HceoDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Custom fetch query for HCEO WITH PAGINATION
  const fetchQuery = useCallback(
    async (supabaseClient, { from, to }) => {
      try {
        // First get the HCEO's profile
        const { data: profile, error: profileError } = await supabaseClient
          .from("profiles_public")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          throw profileError;
        }

        // Fetch all cases where this HCEO is assigned
        // Build OR condition: match by email OR by name
        let query = supabaseClient
          .from("case_submissions")
          .select("*", { count: "exact" })
          .or(
            `assigned_user_email.eq.${user.email},assigned_user_name.eq.${profile.full_name},hceo_choice.eq.${profile.full_name}`,
          );

        // Exclude draft cases (HCEOs don't need to see drafts)
        query = query.neq("status", "draft");

        // Order and paginate
        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data: paginatedCases, error: fetchError, count } = await query;

        if (fetchError) {
          console.error("❌ Cases fetch error:", fetchError);
          throw fetchError;
        }

        // Fetch user profiles to get company names
        let casesWithProfiles = paginatedCases || [];
        if (paginatedCases && paginatedCases.length > 0) {
          const userIds = [
            ...new Set(paginatedCases.map((c) => c.user_id)),
          ].filter(Boolean);

          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } =
              await supabaseClient
                .from("profiles_public")
                .select("id, email, role, full_name, company_name")
                .in("id", userIds);

            if (!profilesError && profilesData) {
              casesWithProfiles = paginatedCases.map((caseItem) => {
                const userProfile = profilesData.find(
                  (p) => p.id === caseItem.user_id,
                );
                return {
                  ...caseItem,
                  user_profile: userProfile || null,
                };
              });
            }
          }
        }

        // Return with count - this is critical for pagination
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
    [user?.id, user?.email],
  );

  // Use dashboard hook with pagination
  const {
    cases,
    loading,
    error,
    stats,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    goToPage,
    clearError,
  } = useDashboard({
    userId: user?.id,
    fetchQuery,
    calculateStats: calculateHCEOStats,
    itemsPerPage: 10, // Entries per page
  });

  // Stats configuration
  const statsConfig = [
    {
      title: "Total Cases",
      key: "totalCases",
      icon: Scale,
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
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
      iconBgColor: "bg-green-100",
      iconColor: "text-green-600",
      valueColor: "text-green-600",
      getValue: (stats) => formatAmount(stats.totalAmount),
    },
  ];

  // Table columns configuration
  const columns = [
    { header: "Case ID" },
    { header: "Claimant" },
    { header: "Defendant" },
    { header: "Amount" },
    { header: "Court" },
    { header: "Status" },
    { header: "Judgment Date" },
    { header: "Actions" },
  ];

  // Handle view case
  const handleViewCase = useCallback(
    (caseItem) => {
      navigate(`/hceo/case/${caseItem.id}`);
    },
    [navigate],
  );

  const handleDownloadCaseReport = useCallback(
    async (caseItem) => {
      try {
        await generateCaseDetailsPDF(caseItem, "hceo", {
          hceoEmail: user?.email,
          userProfile: caseItem.user_profile, // Pass userProfile for correct company case ID
        });
      } catch (err) {
        console.error("Error generating case report:", err);
        alert(`Failed to generate case report: ${err.message}`);
      }
    },
    [user?.email],
  );

  // Render table row
  const renderRow = useCallback(
    (caseItem) => (
      <tr key={caseItem.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {generateCompanyCaseId(
            caseItem.id,
            caseItem.user_profile?.company_name,
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center">
            <User className="w-4 h-4 text-blue-500 mr-2" />
            {caseItem.claimant_name || "N/A"}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <div className="flex items-center">
            <User className="w-4 h-4 text-red-500 mr-2" />
            {caseItem.defendant_name || "N/A"}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
          {formatAmount(caseItem.judgment_amount)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex items-center">
            <Building className="w-4 h-4 text-purple-500 mr-2" />
            <span
              className="truncate max-w-32"
              title={caseItem.court_making_judgment || caseItem.court}
            >
              {caseItem.court_making_judgment || caseItem.court}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <StatusBadge status={caseItem.status} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
            {formatDate(caseItem.judgment_date)}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewCase(caseItem)}
              className="text-green-600 hover:text-green-900"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadCaseReport(caseItem)}
              title="Download Case Report"
            >
              <FileDown className="w-4 h-4 text-gray-600" />
            </Button>
          </div>
        </td>
      </tr>
    ),
    [handleViewCase, handleDownloadCaseReport],
  );

  // Empty state
  const emptyState = (
    <div className="p-8 text-center">
      <div className="text-gray-400 mb-4">
        <Scale className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No cases assigned yet
      </h3>
      <p className="text-gray-500">Cases assigned to you will appear here.</p>
    </div>
  );

  return (
    <DashboardLayout
      title="HCEO Dashboard"
      subtitle={`Welcome back, ${user?.email || "HCEO"}`}
      loading={loading}
      error={error}
      onDismissError={clearError}
      bgColor="bg-gray-50"
    >
      <StatsGrid stats={stats} config={statsConfig} />
      <DashboardTable
        title="Assigned Cases"
        columns={columns}
        data={cases}
        renderRow={renderRow}
        emptyState={emptyState}
      />

      {/* Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={goToPage}
      />
    </DashboardLayout>
  );
};

export default HceoDashboard;
