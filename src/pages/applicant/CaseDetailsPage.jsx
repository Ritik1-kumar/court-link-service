// src/pages/applicant/CaseDetailsPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { AlertCircle } from "lucide-react";
import {
  generateCompanyCaseId,
  formatDateTime,
  getStatusColor,
  getStatusIcon,
  deleteCaseFromDatabase,
} from "../../lib/caseUtils";
import { generateCaseDetailsPDF } from "../../lib/pdfUtils";
import PageHeader from "../../components/PageHeader";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import CaseInformationCard from "../../components/CaseInformationCard";
import PaymentInformationCard from "../../components/PaymentInformationCard";
import PaymentsReceivedSection from "@/components/PaymentsReceivedSection";
import DocumentList from "../../components/DocumentList";
import CaseStatusSidebar from "../../components/CaseStatusSidebar";
import { Alert, AlertDescription } from "../../components/ui/alert";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import CaseHistory from "@/components/CaseHistory";
import EditCaseModal from "@/components/applicant/EditCaseModal";
import { addCaseHistory } from "@/lib/caseHistory";

const CaseDetailsPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    caseData: null,
  });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const fetchCaseDetails = async () => {
      if (!user?.id || !caseId) return;

      try {
        setLoading(true);
        setError("");

        timeoutId = setTimeout(() => {
          if (mounted) {
            setError("Request timed out. Please refresh the page.");
            setLoading(false);
          }
        }, 20000);

        const { data, error: fetchError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("id", caseId)
          .eq("user_id", user.id)
          .single();

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!mounted) return;

        if (fetchError) {
          if (
            fetchError.message?.includes("JWT") ||
            fetchError.message?.includes("session")
          ) {
            const { error: refreshError } =
              await supabase.auth.refreshSession();
            if (!refreshError) {
              return fetchCaseDetails();
            }
          }
          throw fetchError;
        }

        if (!data) throw new Error("Case not found or access denied");

        setCaseData(data);
      } catch (err) {
        console.error("Error fetching case details:", err);
        if (mounted) {
          setError(err.message || "Failed to load case details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCaseDetails();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [caseId, user?.id]);

  const handleEditCase = () => {
    navigate(`/edit-case/${caseData.id}`);
  };

  const handleDeleteCase = () => {
    setDeleteDialog({
      isOpen: true,
      caseData: caseData,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteCaseFromDatabase(
        caseData.id,
        user,
        caseData.judgment_file_paths,
        false,
      );
      navigate("/dashboard");
    } catch (err) {
      console.error("Error deleting case:", err);
      setError(`Failed to delete case: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialog({ isOpen: false, caseData: null });
  };

  const handleDownloadPDF = async () => {
    try {
      await generateCaseDetailsPDF(caseData, "applicant", {
        userProfile: profile,
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleResubmit = async () => {
    if (caseData.status !== "returned") return;

    try {
      setResubmitting(true);

      const { data, error } = await supabase
        .from("case_submissions")
        .update({
          status: "submitted",
          returned_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setCaseData(data);

      // Add case history entry for resubmission
      try {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("email, full_name, role")
          .eq("id", user.id)
          .single();

        await addCaseHistory({
          caseId: data.id,
          userId: user.id,
          userEmail: profile?.email || user.email,
          userName: profile?.full_name || "User",
          userRole: profile?.role || "applicant",
          actionType: "status_change",
          actionDescription: "Case resubmitted by applicant",
          oldValue: "returned",
          newValue: "submitted",
          metadata: {
            resubmitted: true,
          },
        });
      } catch (historyError) {
        console.error("Failed to add case history:", historyError);
      }

      setHistoryRefresh((prev) => prev + 1);

      alert(
        "Case resubmitted successfully! It will be reviewed by admin again.",
      );
    } catch (err) {
      console.error("Error resubmitting case:", err);
      setError(`Failed to resubmit case: ${err.message}`);
    } finally {
      setResubmitting(false);
    }
  };

  const handleEditInline = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = (updatedCase) => {
    setCaseData(updatedCase);
    setHistoryRefresh((prev) => prev + 1);
    alert("Case details updated successfully!");
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading case details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader showBackButton backTo="/dashboard" title="Error" />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            showBackButton
            backTo="/dashboard"
            title="Case Not Found"
            subtitle="The requested case could not be found."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          showBackButton
          backTo="/dashboard"
          title={`Case: ${generateCompanyCaseId(
            caseData.id,
            profile?.company_name,
          )}`}
          subtitle={`Submitted on ${formatDateTime(caseData.created_at)}`}
        />

        {/* Status Badge */}
        <div className="mb-6">
          <StatusBadge status={caseData.status} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary Details */}
          <div className="lg:col-span-2 space-y-6">
            <CaseInformationCard caseData={caseData} />

            {/* Editable Payments Section for Applicants */}
            <PaymentsReceivedSection
              caseData={caseData}
              isEditable={true}
              onUpdate={(updatedCase) => setCaseData(updatedCase)}
              onHistoryRefresh={() => setHistoryRefresh((prev) => prev + 1)}
            />

            <PaymentInformationCard caseData={caseData} />

            <DocumentList
              documents={caseData.judgment_file_paths}
              title="Documents"
              caseId={caseData.id}
              variant="default"
            />

            <DocumentList
              documents={caseData.hceo_file_paths}
              title="HCEO Documents"
              caseId={caseData.id}
              variant="hceo"
            />

            <CaseHistory caseId={caseData.id} refreshTrigger={historyRefresh} />
          </div>

          {/* Sidebar */}
          <div>
            <CaseStatusSidebar
              caseData={caseData}
              onEdit={handleEditCase}
              onDownloadPDF={handleDownloadPDF}
              onDelete={handleDeleteCase}
              onResubmit={handleResubmit}
              onEditInline={handleEditInline}
              loading={deleting}
              resubmitting={resubmitting}
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleCloseDialog}
          onConfirm={handleConfirmDelete}
          caseName={caseData?.defendant_name || ""}
        />

        {/* Edit Case Modal */}
        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          caseData={caseData}
          onSuccess={handleEditSuccess}
        />
      </div>
    </div>
  );
};

export default CaseDetailsPage;
