// src/components/CaseStatusSidebar.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, FileDown, Trash2, CheckCircle } from "lucide-react";
import { formatDate, getStatusLabel } from "@/lib/caseUtils";

const StatusMessage = ({ status, caseData }) => {
  const messages = {
    draft: {
      text: "Your case is saved as a draft. Complete payment to submit it for review.",
      bgColor: "bg-gray-50",
      textColor: "text-gray-600",
    },
    submitted: {
      text: "Your case has been submitted and is awaiting admin review. You can still update Case Details if needed.",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    returned: {
      text: "Your case has been returned and needs attention. Please review the admin's notes and resubmit.",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
    },
    approved: {
      text: "Your case has been approved and sent to the assigned HCEO.",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    writ_received: {
      text: "Sealed writ received - HCEO can now proceed with enforcement.",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    hceo_completed: {
      text: "Enforcement has been completed by the HCEO. Your case is now fully resolved.",
      bgColor: "bg-teal-50",
      textColor: "text-teal-600",
    },
    closed: {
      text: "This case has been closed.",
      bgColor: "bg-slate-50",
      textColor: "text-slate-600",
    },
  };

  const message = messages[status];
  if (!message) return null;

  return (
    <div
      className={`text-sm p-3 ${message.bgColor} ${message.textColor} rounded space-y-2`}
    >
      <p>{message.text}</p>

      {/* Show returned reason if status is returned */}
      {status === "returned" && caseData?.returned_reason && (
        <div className="mt-3 pt-3 border-t border-orange-200">
          <p className="font-semibold">Reason for Return:</p>
          <p className="mt-1 text-sm">{caseData.returned_reason}</p>
        </div>
      )}

      {/* Show admin note if status is approved */}
      {status === "approved" && caseData?.admin_note && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="font-semibold">Admin Note:</p>
          <p className="mt-1 text-sm">{caseData.admin_note}</p>
        </div>
      )}
    </div>
  );
};

const CaseStatusSidebar = ({
  caseData,
  onEdit,
  onDownloadPDF,
  onDelete,
  onResubmit,
  onEditInline,
  loading,
  resubmitting,
}) => {
  // Check if case can be edited (draft or submitted only - not returned)
  const canEdit =
    caseData.status === "draft" || caseData.status === "submitted";

  const getStatusColor = () => {
    const colors = {
      draft: "text-gray-600",
      submitted: "text-blue-600",
      returned: "text-orange-600",
      approved: "text-green-600",
      writ_received: "text-purple-600",
      hceo_completed: "text-teal-600",
      closed: "text-slate-600",
    };
    return colors[caseData.status] || "text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Case Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Current Status
            </p>
            <p className={`font-semibold ${getStatusColor()}`}>
              {getStatusLabel(caseData.status)}
            </p>
          </div>

          <StatusMessage status={caseData.status} caseData={caseData} />

          <div className="flex pt-2 border-t">
            <div className="flex justify-between w-full">
              <span className="text-gray-500 text-sm">Last Updated:</span>
              <span className="font-medium text-gray-900 text-sm">
                {formatDate(caseData.updated_at)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Show resubmit button for returned cases */}
          {caseData.status === "returned" && onResubmit && (
            <Button
              onClick={onResubmit}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={resubmitting || loading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {resubmitting ? "Resubmitting..." : "Resubmit for Review"}
            </Button>
          )}

          {/* Show edit inline button for returned cases */}
          {caseData.status === "returned" && onEditInline && (
            <Button onClick={onEditInline} variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Edit Case Details
            </Button>
          )}

          {/* Show edit button for draft and submitted cases (navigates to edit form) */}
          {canEdit && onEdit && (
            <Button onClick={onEdit} className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              {caseData.status === "submitted" ? "Update Case" : "Edit Case"}
            </Button>
          )}

          {onDownloadPDF && (
            <Button
              onClick={onDownloadPDF}
              variant="outline"
              className="w-full"
            >
              <FileDown className="w-4 h-4 mr-2" />
              View Case Report
            </Button>
          )}

          {(caseData.status === "draft" ||
            caseData.status === "submitted" ||
            caseData.status === "returned") &&
            onDelete && (
              <Button
                onClick={onDelete}
                variant="destructive"
                className="w-full"
                disabled={loading || resubmitting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {loading ? "Deleting..." : "Delete Case"}
              </Button>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseStatusSidebar;
