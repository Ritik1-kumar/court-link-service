// src/components/dashboard/DashboardLayout.jsx
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import PageHeader from "../PageHeader";
import LoadingSpinner from "../LoadingSpinner";

const DashboardLayout = ({
  title,
  subtitle,
  loading,
  error,
  onDismissError,
  children,
  headerAction,
  headerActionLabel,
  headerActionIcon,
  bgColor = "bg-blue-50",
}) => {
  if (loading) {
    return (
      <div className={`p-6 ${bgColor} min-h-screen`}>
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className={`p-6 ${bgColor} min-h-screen`}>
    

      <PageHeader
        title={title}
        subtitle={subtitle}
        action={headerAction}
        actionLabel={headerActionLabel}
        actionIcon={headerActionIcon}
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="ml-2 text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
};

export default DashboardLayout;
