// src/components/PaymentsReceivedSection.jsx
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";
import { formatAmount, formatDate } from "@/lib/caseUtils";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addCaseHistory } from "@/lib/caseHistory";

const PaymentsReceivedSection = ({
  caseData,
  isEditable = false,
  onUpdate,
  onHistoryRefresh,
}) => {
  const initialPayments = (() => {
    try {
      if (typeof caseData.payments_received === "string") {
        return JSON.parse(caseData.payments_received);
      }
      return caseData.payments_received || [];
    } catch {
      return [];
    }
  })();

  const [payments, setPayments] = useState(initialPayments);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const totalPayments = payments.reduce((sum, payment) => {
    return sum + (parseFloat(payment.amount) || 0);
  }, 0);

  const handleAddPayment = () => {
    setPayments([...payments, { date: "", amount: "" }]);
  };

  const handleRemovePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index, field, value) => {
    setPayments(
      payments.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      )
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess(false);

      const initialTotal = initialPayments.reduce(
        (sum, payment) => sum + (parseFloat(payment.amount) || 0),
        0
      );
      const newPaymentAmount = totalPayments - initialTotal;

      const { data, error: updateError } = await supabase
        .from("case_submissions")
        .update({
          payments_received: JSON.stringify(payments),
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSuccess(true);
      setIsEditing(false);

      // HISTORY ENTRY
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData?.session?.user;

      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("email, full_name, role")
          .eq("id", currentUser.id)
          .single();

        await addCaseHistory({
          caseId: caseData.id,
          userId: currentUser.id,
          userEmail: profile?.email || currentUser.email,
          userName: profile?.full_name || "User",
          userRole: profile?.role || "applicant",
          actionType: "payment_added",
          actionDescription: `${
            newPaymentAmount > 0 ? "Added" : "Updated"
          } payment${payments.length > 1 ? "s" : ""} received (${
            newPaymentAmount > 0 ? `New: £${newPaymentAmount.toFixed(2)}, ` : ""
          }Total: £${totalPayments.toFixed(2)})`,
          metadata: {
            new_payment_amount: newPaymentAmount,
            total_payments: totalPayments,
            payment_count: payments.length,
          },
        });

        if (onHistoryRefresh) {
          onHistoryRefresh();
        }
      }

      if (onUpdate) {
        onUpdate(data);
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving payments:", err);
      setError(err.message || "Failed to save payments");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPayments(initialPayments);
    setIsEditing(false);
    setError("");
  };

  if (!isEditable) {
    if (payments.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Payments Received Since Judgment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600 pb-2 border-b">
                <div>Date</div>
                <div className="text-right">Amount</div>
              </div>
              {payments.map((payment, index) => (
                <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-700">
                    {payment.date ? formatDate(payment.date) : "N/A"}
                  </div>
                  <div className="text-right font-medium text-gray-900">
                    {formatAmount(payment.amount)}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t font-semibold">
                <div className="text-gray-700">Total Payments:</div>
                <div className="text-right text-lg text-green-700">
                  {formatAmount(totalPayments)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payments Received Since Judgment</CardTitle>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            size="sm"
            variant="outline"
          >
            Edit Payments
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              Payments updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 font-semibold text-sm mb-2">
              <Label>Date</Label>
              <Label>Amount (£)</Label>
              <div className="w-10"></div>
            </div>

            {payments.map((payment, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center"
              >
                <Input
                  type="date"
                  value={payment.date}
                  onChange={(e) =>
                    handlePaymentChange(index, "date", e.target.value)
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(e) =>
                    handlePaymentChange(index, "amount", e.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePayment(index)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddPayment}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment
            </Button>

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="font-semibold">Total:</span>
              <span className="text-lg font-bold text-green-700">
                {formatAmount(totalPayments)}
              </span>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            {payments.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600 pb-2 border-b">
                  <div>Date</div>
                  <div className="text-right">Amount</div>
                </div>
                {payments.map((payment, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-700">
                      {payment.date ? formatDate(payment.date) : "N/A"}
                    </div>
                    <div className="text-right font-medium text-gray-900">
                      {formatAmount(payment.amount)}
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t font-semibold">
                  <div className="text-gray-700">Total Payments:</div>
                  <div className="text-right text-lg text-green-700">
                    {formatAmount(totalPayments)}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No payments received yet. Click "Edit Payments" to add payments.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentsReceivedSection;