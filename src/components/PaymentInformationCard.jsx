// src/components/PaymentInformationCard.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CreditCard, PoundSterlingIcon, FileText } from "lucide-react";
import { formatAmount, getPaymentStatusColor } from "@/lib/caseUtils";

const PaymentInformationCard = ({ caseData }) => {
  if (!caseData.payment_amount && !caseData.service_fee) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <CreditCard className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-500">
                Payment Status
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(
                  caseData.payment_status
                )}`}
              >
                {caseData.payment_status?.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <PoundSterlingIcon className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-500">Total Paid</p>
              <p className="text-gray-900 text-lg font-semibold">
                {formatAmount(caseData.payment_amount)}
              </p>
            </div>
          </div>

          {caseData.service_fee && (
            <div className="flex items-start space-x-3">
              <PoundSterlingIcon className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Service Fee</p>
                <p className="text-gray-900">
                  {formatAmount(caseData.service_fee)}
                </p>
              </div>
            </div>
          )}

          {caseData.payment_intent_id && (
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-500">Payment ID</p>
                <p className="text-gray-900 font-mono text-sm">
                  {caseData.payment_intent_id}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentInformationCard;
