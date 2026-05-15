// src/components/CaseHistory.jsx
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  FileText,
  RefreshCw,
  UserCheck,
  PoundSterling,
  Upload,
  Edit,
  Trash2,
  Activity,
  Clock,
  Shield,
} from "lucide-react";
import { fetchCaseHistory, formatHistoryEntry } from "@/lib/caseHistory";
import { Alert, AlertDescription } from "@/components/ui/alert";

const iconComponents = {
  FileText,
  RefreshCw,
  UserCheck,
  PoundSterling,
  Upload,
  Edit,
  Trash2,
  Activity,
};

const CaseHistory = ({ caseId, refreshTrigger }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      if (!caseId) return;

      try {
        setLoading(true);
        setError("");

        const {
          success,
          data,
          error: fetchError,
        } = await fetchCaseHistory(caseId);

        if (!success) throw fetchError;

        const formattedHistory = data.map(formatHistoryEntry);
        setHistory(formattedHistory);

        // DEBUG: Log the metadata to console
        formattedHistory.forEach((entry, idx) => {
          if (entry.metadata?.changedFields) {
            // console.log(
            //   `Entry ${idx} - Changed Fields:`,
            //   entry.metadata.changedFields
            // );
          }
        });
      } catch (err) {
        console.error("Error loading case history:", err);
        setError(err.message || "Failed to load case history");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [caseId, refreshTrigger]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case History</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Case History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No history available for this case yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Case History ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => {
            const IconComponent = iconComponents[entry.icon] || Activity;

            return (
              <div
                key={entry.id}
                className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${entry.color}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {entry.action_description}
                    </p>
                    <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                      {entry.formattedDate}
                    </p>
                  </div>

                  {/* User info */}
                  <p className="text-xs text-gray-600 mb-2">
                    By: {entry.user_name || entry.user_email || "System"} (
                    {entry.user_role || "System"})
                  </p>

                  {/* Admin Note - Display First if Present */}
                  {entry.metadata?.adminNote && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">
                        📝 Reason for Edit:
                      </p>
                      <p className="text-xs text-blue-800 italic">
                        "{entry.metadata.adminNote}"
                      </p>
                    </div>
                  )}

                  {/* Changed Fields - Main Display */}
                  {entry.metadata?.changedFields &&
                    Array.isArray(entry.metadata.changedFields) &&
                    entry.metadata.changedFields.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                          <span className="mr-1">📋</span>
                          Changes Made ({entry.metadata.changedFields.length}):
                        </p>

                        {entry.metadata.changedFields.map((change, idx) => (
                          <div
                            key={`change-${entry.id}-${idx}`}
                            className="bg-white p-3 rounded border border-gray-200"
                          >
                            {/* Field Name */}
                            <p className="font-semibold text-gray-900 text-xs mb-2">
                              {change.field}
                            </p>

                            {/* Old → New Values */}
                            <div className="flex items-center gap-2">
                              {/* Old Value */}
                              <div className="flex-1">
                                <span className="block text-red-700 bg-red-50 px-2 py-1.5 rounded text-xs font-mono border border-red-200">
                                  {change.oldValue || "(empty)"}
                                </span>
                              </div>

                              {/* Arrow */}
                              <span className="text-gray-400 font-bold">→</span>

                              {/* New Value */}
                              <div className="flex-1">
                                <span className="block text-green-700 bg-green-50 px-2 py-1.5 rounded text-xs font-mono border border-green-200">
                                  {change.newValue || "(empty)"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Edited By Badge */}
                        {entry.metadata.editedBy && (
                          <div className="mt-3 inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded border border-purple-200">
                            <span className="mr-1">👤</span>
                            Edited by: {entry.metadata.editedBy}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Legacy Old/New Values (for backwards compatibility) */}
                  {!entry.metadata?.changedFields &&
                    (entry.old_value || entry.new_value) && (
                      <div className="text-xs text-gray-600 space-y-1 mt-2">
                        {entry.old_value && (
                          <p>
                            <span className="font-medium">From:</span>{" "}
                            {entry.old_value}
                          </p>
                        )}
                        {entry.new_value && (
                          <p>
                            <span className="font-medium">To:</span>{" "}
                            {entry.new_value}
                          </p>
                        )}
                      </div>
                    )}

                  {/* Other Metadata (exclude already displayed fields) */}
                  {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                    <div className="mt-2">
                      {Object.entries(entry.metadata)
                        .filter(
                          ([key]) =>
                            key !== "adminNote" &&
                            key !== "editedBy" &&
                            key !== "changedFields" &&
                            key !== "fieldsUpdated",
                        )
                        .map(([key, value]) => (
                          <p key={key} className="text-xs text-gray-500">
                            <span className="font-medium capitalize">
                              {key.replace(/_/g, " ")}:
                            </span>{" "}
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CaseHistory;
