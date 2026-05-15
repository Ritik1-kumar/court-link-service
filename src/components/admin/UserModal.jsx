// src/components/admin/UserModal.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  generateCompanyCaseId,
  formatAmount,
} from "../../lib/caseUtils";

const UserModal = ({ user, cases, onClose, onViewCase }) => {
  if (!user) return null;

  const userCases = cases.filter(
    (c) => c.assigned_user_email === user.email || c.user_id === user.id
  );

  const totalAmount = userCases.reduce(
    (sum, c) => sum + (parseFloat(c.judgment_amount) || 0),
    0
  );

  // Calculate completed cases based on user role
  const completedCases = (() => {
    if (user.role === "hceo") {
      // For HCEO: only count cases completed by HCEO
      return userCases.filter((c) => c.status === "hceo_completed").length;
    } else if (user.role === "admin") {
      // For Admin: count cases approved or writ_received
      return userCases.filter(
        (c) =>
          c.status === "approved" || c.status === "writ_received"
      ).length;
    } else if (user.role === "applicant") {
      // For Applicant: count all non-draft cases (submitted and beyond)
      return userCases.filter((c) => c.status !== "draft").length;
    } else {
      // Default: count all non-draft cases
      return userCases.filter((c) => c.status !== "draft").length;
    }
  })();

  const formatBankDetails = (bankDetails) => {
    if (!bankDetails) return "N/A";

    if (typeof bankDetails === "string") {
      try {
        const parsed = JSON.parse(bankDetails);
        return Object.entries(parsed)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n");
      } catch {
        return bankDetails;
      }
    }

    if (typeof bankDetails === "object") {
      return Object.entries(bankDetails)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
    }

    return String(bankDetails);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b p-3 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">User Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* User Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Profile Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    User ID
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Full Name
                  </label>
                  <p className="text-gray-900">{user.full_name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Email
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Phone
                  </label>
                  <p className="text-gray-900">{user.phone || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Role
                  </label>
                  <p className="text-gray-900">{user.role || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Joined
                  </label>
                  <p className="text-gray-900">
                    {formatDateTime(user.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Sign In
                  </label>
                  <p className="text-gray-900">
                    {user.last_sign_in_at
                      ? formatDateTime(user.last_sign_in_at)
                      : "Never"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <p className="text-gray-900">
                    {user.is_active || user.last_sign_in_at
                      ? "Active"
                      : "Inactive"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Activity & Settings
              </h3>
              <div className="space-y-3">
                {(user.role === "hceo" || user.role === "applicant") && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Total Cases
                      </span>
                      <span className="text-gray-900">{userCases.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Completed Cases
                      </span>
                      <span className="text-gray-900">{completedCases}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Total Case Value
                      </span>
                      <span className="text-gray-900">
                        £{totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">
                        Success Rate
                      </span>
                      <span className="text-gray-900">
                        {userCases.length > 0
                          ? Math.round(
                              (completedCases / userCases.length) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Terms Accepted
                  </span>
                  <span className="text-gray-900">
                    {user.terms_accepted ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    Marketing Consent
                  </span>
                  <span className="text-gray-900">
                    {user.marketing_consent ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">
                    VAT Reclaim
                  </span>
                  <span className="text-gray-900">
                    {user.vat_reclaim ? "Yes" : "No"}
                  </span>
                </div>
                {user.bank_details && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Bank Details
                    </span>
                    <pre className="text-gray-900 text-sm mt-1 whitespace-pre-line bg-gray-50 p-2 rounded">
                      {formatBankDetails(user.bank_details)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Cases */}
          {userCases.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Cases
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Case ID
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Parties
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {userCases.slice(0, 5).map((caseItem) => (
                      <tr key={caseItem.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {generateCompanyCaseId(caseItem.id, user.company_name)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {caseItem.claimant_name} vs {caseItem.defendant_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatAmount(caseItem.judgment_amount)}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              caseItem.status === "hceo_completed"
                                ? "bg-teal-100 text-teal-800"
                                : caseItem.status === "writ_received"
                                ? "bg-purple-100 text-purple-800"
                                : caseItem.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : caseItem.status === "submitted"
                                ? "bg-blue-100 text-blue-800"
                                : caseItem.status === "returned"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {caseItem.status || caseItem.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {formatDate(caseItem.created_at)}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewCase(caseItem.id)}
                            title="View Case Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {userCases.length > 5 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Showing 5 of {userCases.length} cases
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserModal;
