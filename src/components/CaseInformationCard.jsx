// src/components/CaseInformationCard.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  User,
  PoundSterlingIcon,
  Calendar,
  Building,
  Scale,
  FileText,
  MapPin,
  Hash,
} from "lucide-react";
import { formatAmount, formatDate } from "@/lib/caseUtils";

const InfoItem = ({
  icon: Icon,
  label,
  value,
  iconColor,
  fullWidth = false,
}) => (
  <div
    className={`flex items-start space-x-3 ${fullWidth ? "col-span-2" : ""}`}
  >
    <Icon className={`w-5 h-5 ${iconColor} mt-1 flex-shrink-0`} />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-gray-900 whitespace-pre-line">{value}</p>
    </div>
  </div>
);

const CaseInformationCard = ({ caseData }) => {
  // Parse payments received if it's a string
  const paymentsReceived = (() => {
    try {
      if (typeof caseData.payments_received === "string") {
        return JSON.parse(caseData.payments_received);
      }
      return caseData.payments_received || [];
    } catch {
      return [];
    }
  })();

  // Calculate total payments
  const totalPayments = paymentsReceived.reduce((sum, payment) => {
    return sum + (parseFloat(payment.amount) || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Claimant Information */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Claimant Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={User}
              label="Claimant Name"
              value={caseData.claimant_name}
              iconColor="text-blue-600"
            />
            {caseData.claimant_ref && (
              <InfoItem
                icon={Hash}
                label="Claimant Reference"
                value={caseData.claimant_ref}
                iconColor="text-blue-500"
              />
            )}
            {caseData.claimant_address && (
              <InfoItem
                icon={MapPin}
                label="Claimant Address"
                value={caseData.claimant_address}
                iconColor="text-blue-400"
                fullWidth
              />
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Defendant Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={User}
              label="Defendant Name"
              value={caseData.defendant_name}
              iconColor="text-red-600"
            />
            {caseData.defendant_ref && (
              <InfoItem
                icon={Hash}
                label="Defendant Reference"
                value={caseData.defendant_ref}
                iconColor="text-red-500"
              />
            )}
            {caseData.defendant_address_on_judgment && (
              <InfoItem
                icon={MapPin}
                label="Address on Judgment"
                value={caseData.defendant_address_on_judgment}
                iconColor="text-red-400"
                fullWidth
              />
            )}
            {caseData.defendant_moved && caseData.defendant_current_address && (
              <InfoItem
                icon={MapPin}
                label="Current Address (Moved)"
                value={caseData.defendant_current_address}
                iconColor="text-orange-500"
                fullWidth
              />
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Case Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.claim_number && (
              <InfoItem
                icon={FileText}
                label="Claim Number"
                value={caseData.claim_number}
                iconColor="text-indigo-600"
              />
            )}
            <InfoItem
              icon={Building}
              label="Court Making Judgment"
              value={caseData.court_making_judgment || caseData.court}
              iconColor="text-indigo-600"
            />
            <InfoItem
              icon={Calendar}
              label="Judgment Date"
              value={formatDate(caseData.judgment_date)}
              iconColor="text-purple-600"
            />
            {caseData.claiming_fixed_costs && (
              <InfoItem
                icon={Scale}
                label="Claiming Fixed Costs"
                value={caseData.claiming_fixed_costs === "yes" ? "Yes" : "No"}
                iconColor="text-purple-500"
              />
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Hceo Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem
              icon={Scale}
              label="HCEO Organization"
              value={caseData.organization}
              iconColor="text-orange-600"
            />
            <InfoItem
              icon={Scale}
              label="HCEO Officer"
              value={caseData.hceo_choice}
              iconColor="text-orange-600"
            />
            {caseData.hceo_extra_details && (
              <InfoItem
                icon={FileText}
                label="Extra Details for HCEO Officer"
                value={caseData.hceo_extra_details}
                iconColor="text-gray-600"
                fullWidth
              />
            )}
          </div>
        </div>
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Judgment Amount
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.amount_of_debt && (
              <InfoItem
                icon={PoundSterlingIcon}
                label="Amount of Debt (including interest)"
                value={
                  <span className="text-lg font-semibold">
                    {formatAmount(caseData.amount_of_debt)}
                  </span>
                }
                iconColor="text-green-600"
              />
            )}
            {caseData.amount_of_costs && (
              <InfoItem
                icon={PoundSterlingIcon}
                label="Amount of Costs"
                value={
                  <span className="text-lg font-semibold">
                    {formatAmount(caseData.amount_of_costs)}
                  </span>
                }
                iconColor="text-green-500"
              />
            )}
            <InfoItem
              icon={PoundSterlingIcon}
              label="Total Judgment Amount"
              value={
                <span className="text-xl font-bold text-green-700">
                  {formatAmount(caseData.judgment_amount)}
                </span>
              }
              iconColor="text-green-700"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CaseInformationCard;
