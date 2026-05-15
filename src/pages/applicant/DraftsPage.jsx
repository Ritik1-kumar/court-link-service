// src/pages/applicant/DraftsPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteCaseFromDatabase } from "../../lib/caseUtils";
import PageHeader from "../../components/PageHeader";
import StatsCard from "../../components/StatsCard";
import CasesTable from "../../components/CasesTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Alert } from "@/components/ui/alert";

const DraftsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draftCases, setDraftCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;

    const fetchDraftCases = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError("");

        // Set a timeout for the request
        timeoutId = setTimeout(() => {
          if (mounted) {
            setError("Request timed out. Please refresh the page.");
            setLoading(false);
          }
        }, 20000); // 20 second timeout

        const { data, error: fetchError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("user_id", user.id)
          .or("status.eq.draft,is_draft.eq.true")
          .order("updated_at", { ascending: false });

        // Clear timeout if request completes
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!mounted) return;

        if (fetchError) {
          // Handle auth errors
          if (
            fetchError.message?.includes("JWT") ||
            fetchError.message?.includes("session")
          ) {
            const { error: refreshError } =
              await supabase.auth.refreshSession();
            if (!refreshError) {
              // Retry after refresh
              return fetchDraftCases();
            }
          }
          throw fetchError;
        }

        setDraftCases(data || []);
      } catch (err) {
        console.error("Error fetching draft cases:", err);
        if (mounted) {
          setError(
            err.message ||
              "Failed to load draft cases. Please refresh the page to try again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDraftCases();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user?.id]);

  const handleDeleteCase = async (caseItem) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the draft case for ${caseItem.defendant_name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteCaseFromDatabase(
        caseItem.id,
        user,
        caseItem.judgment_file_paths
      );

      setDraftCases((prev) => prev.filter((c) => c.id !== caseItem.id));
      setError("");
    } catch (err) {
      console.error("Error deleting case:", err);
      setError(`Failed to delete case: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading your draft cases..." />
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <PageHeader
        showBackButton
        backTo="/dashboard"
        title="Draft Cases"
        subtitle="Continue working on your saved draft cases"
        // action={() => navigate("/case-submission")}
        // actionLabel="New Case"
        // actionIcon={Plus}
      />

      {error && <Alert variant="destructive" message={error} />}

      {/* Summary Stats */}
      <div className="mb-8">
        <StatsCard
          title="Total Draft Cases"
          value={draftCases.length}
          icon={FileText}
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
        />
      </div>

      {/* Draft Cases Table */}
      <CasesTable
        cases={draftCases}
        title={`Your Draft Cases (${draftCases.length})`}
        onDelete={handleDeleteCase}
        emptyMessage="No Draft Cases"
        emptyDescription="You don't have any saved draft cases yet. Start by creating a new case and save it as a draft."
      />
    </div>
  );
};

export default DraftsPage;
