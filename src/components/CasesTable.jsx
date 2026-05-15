// src/components/CasesTable.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Plus, FileText, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import {
  generateCompanyCaseId,
  formatAmount,
  formatDate,
  canEditCase,
  canDeleteCase,
} from "@/lib/caseUtils";

const CasesTable = ({
  cases,
  title = "Your Cases",
  showActions = true,
  onView,
  onEdit,
  onDelete,
  emptyMessage = "No cases yet",
  emptyDescription = "Get started by submitting your first case.",
  showNewButton = true,
  onDownloadCaseReport,
  userCompanyName = null,
}) => {
  const navigate = useNavigate();

  const handleView = (caseItem) => {
    if (onView) {
      onView(caseItem);
    } else {
      navigate(`/case-details/${caseItem.id}`);
    }
  };

  const handleEdit = (caseItem) => {
    if (onEdit) {
      onEdit(caseItem);
    } else {
      navigate(`/edit-case/${caseItem.id}`);
    }
  };

  const handleDelete = (caseItem) => {
    if (onDelete) {
      onDelete(caseItem);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {showNewButton && (
          <Button onClick={() => navigate("/case-submission")}>
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {cases.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Case ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Defendant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    {showActions && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.map((caseItem) => (
                    <tr key={caseItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {generateCompanyCaseId(caseItem.id, userCompanyName || caseItem.user_profile?.company_name)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {caseItem.defendant_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatAmount(caseItem.judgment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={caseItem.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(caseItem.judgment_date)}
                      </td>
                      {showActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(caseItem)}
                            >
                              <Eye className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownloadCaseReport?.(caseItem)}
                              title="Download Case Report"
                            >
                              <FileDown className="w-4 h-4 text-gray-600" />
                            </Button>
                            {canEditCase(caseItem) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(caseItem)}
                              >
                                <Edit className="w-4 h-4 text-blue-800" />
                              </Button>
                            )}
                            {canDeleteCase(caseItem) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(caseItem)}
                              >
                                <Trash2 className="w-4 h-4 text-red-700" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <FileText className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-500 mb-4">{emptyDescription}</p>
            {showNewButton && (
              <Button onClick={() => navigate("/case-submission")}>
                <Plus className="w-4 h-4 mr-2" />
                New Case Application
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CasesTable;
