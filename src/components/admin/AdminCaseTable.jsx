// src/components/admin/AdminCaseTable.jsx
import React from "react";
import { Eye, CheckCircle, FileText, FileDown, Trash2 } from "lucide-react";
import {
  generateCompanyCaseId,
  formatAmount,
  formatDateTime,
} from "../../lib/caseUtils";
import StatusBadge from "../StatusBadge";
import { Button } from "@/components/ui/button";

const AdminCaseTable = ({
  cases,
  selectedCases,
  setSelectedCases,
  onViewCase,
  onCaseAction,
  onBulkAction,
  onDelete,
  onError,
  onDownloadCaseReport,
}) => {
  const handleSelectAll = (checked) => {
    setSelectedCases(checked ? cases.map((c) => c.id) : []);
  };

  const handleSelectCase = (caseId, checked) => {
    setSelectedCases(
      checked
        ? [...selectedCases, caseId]
        : selectedCases.filter((id) => id !== caseId)
    );
  };

  if (cases.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No cases found</h3>
        <p className="text-gray-500">No cases match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Actions Bar */}
      {selectedCases.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-gray-600 font-medium">
            {selectedCases.length} selected
          </span>
          <Button onClick={() => onBulkAction("approve")} size="sm" variant="outline">
            Bulk Approve
          </Button>
          <Button onClick={() => onBulkAction("delete")} size="sm" variant="destructive">
            Bulk Delete
          </Button>
        </div>
      )}

      {/* ── Desktop Table (md+) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={selectedCases.length === cases.length && cases.length > 0}
                />
              </th>
              {["Case ID", "Parties", "Amount", "Status", "Submitted", "User", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <tr key={caseItem.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedCases.includes(caseItem.id)}
                    onChange={(e) => handleSelectCase(caseItem.id, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {generateCompanyCaseId(caseItem.id, caseItem.user_profile?.company_name)}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{caseItem.claimant_name}</div>
                    <div className="text-gray-500">vs {caseItem.defendant_name}</div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatAmount(caseItem.judgment_amount)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={caseItem.status} />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(caseItem.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {caseItem.user_profile?.email || "No email"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onViewCase(caseItem.id)} title="View Details">
                      <Eye className="w-4 h-4 text-blue-600" />
                    </Button>
                    {caseItem.status === "submitted" && (
                      <Button variant="ghost" size="sm" onClick={() => onCaseAction(caseItem.id, "approve")} title="Approve Case">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => onDownloadCaseReport(caseItem)} title="Download Report">
                      <FileDown className="w-4 h-4 text-gray-600" />
                    </Button>
                    {onDelete && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(caseItem)} title="Delete Case">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card List (below md) ── */}
      <div className="md:hidden divide-y divide-gray-200 border rounded-lg overflow-hidden">
        {/* Select All bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50">
          <input
            type="checkbox"
            onChange={(e) => handleSelectAll(e.target.checked)}
            checked={selectedCases.length === cases.length && cases.length > 0}
          />
          <span className="text-xs text-gray-500 uppercase font-medium">Select All</span>
        </div>

        {cases.map((caseItem) => (
          <div key={caseItem.id} className="bg-white p-4">
            {/* Top row: checkbox + case ID + status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedCases.includes(caseItem.id)}
                  onChange={(e) => handleSelectCase(caseItem.id, e.target.checked)}
                  className="shrink-0"
                />
                <span className="text-xs font-mono font-medium text-gray-700 truncate">
                  {generateCompanyCaseId(caseItem.id, caseItem.user_profile?.company_name)}
                </span>
              </div>
              <StatusBadge status={caseItem.status} />
            </div>

            {/* Parties */}
            <div className="mb-2 pl-6">
              <p className="text-sm font-medium text-gray-900 truncate">{caseItem.claimant_name}</p>
              <p className="text-sm text-gray-500 truncate">vs {caseItem.defendant_name}</p>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 mb-3">
              <span className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{formatAmount(caseItem.judgment_amount)}</span>
              </span>
              <span className="text-xs text-gray-400">{formatDateTime(caseItem.created_at)}</span>
              <span className="text-xs text-gray-400 truncate">{caseItem.user_profile?.email || "No email"}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 pl-4 border-t pt-2">
              <Button variant="ghost" size="sm" onClick={() => onViewCase(caseItem.id)} title="View Details">
                <Eye className="w-4 h-4 text-blue-600" />
              </Button>
              {caseItem.status === "submitted" && (
                <Button variant="ghost" size="sm" onClick={() => onCaseAction(caseItem.id, "approve")} title="Approve">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => onDownloadCaseReport(caseItem)} title="Download">
                <FileDown className="w-4 h-4 text-gray-600" />
              </Button>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(caseItem)} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCaseTable;