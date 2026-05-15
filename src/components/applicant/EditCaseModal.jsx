// src/components/applicant/EditCaseModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { addCaseHistory } from "@/lib/caseHistory";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { COURTS } from "@/lib/caseUtils";

const EditCaseModal = ({ isOpen, onClose, caseData, onSuccess }) => {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (caseData) {
      // Parse payments_received
      let paymentsReceived = [];
      try {
        if (typeof caseData.payments_received === "string") {
          paymentsReceived = JSON.parse(caseData.payments_received);
        } else if (Array.isArray(caseData.payments_received)) {
          paymentsReceived = caseData.payments_received;
        }
      } catch (e) {
        console.error("Error parsing payments_received:", e);
        paymentsReceived = [];
      }

      setFormData({
        claimant_name: caseData.claimant_name || "",
        claimant_ref: caseData.claimant_ref || "",
        claimant_address: caseData.claimant_address || "",
        defendant_name: caseData.defendant_name || "",
        defendant_ref: caseData.defendant_ref || "",
        defendant_address_on_judgment:
          caseData.defendant_address_on_judgment || "",
        defendant_moved: caseData.defendant_moved || false,
        defendant_current_address: caseData.defendant_current_address || "",
        claim_number: caseData.claim_number || "",
        court_making_judgment: caseData.court_making_judgment || "",
        judgment_date: caseData.judgment_date || "",
        amount_of_debt: caseData.amount_of_debt || "",
        amount_of_costs: caseData.amount_of_costs || "",
        interest_recovery: caseData.interest_recovery || false,
        payments_received: paymentsReceived,
        hceo_extra_details: caseData.hceo_extra_details || "",
      });
    }
  }, [caseData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddPayment = () => {
    setFormData((prev) => ({
      ...prev,
      payments_received: [
        ...(prev.payments_received || []),
        { date: "", amount: "" },
      ],
    }));
  };

  const handlePaymentChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      payments_received: prev.payments_received.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment
      ),
    }));
  };

  const handleRemovePayment = (index) => {
    setFormData((prev) => ({
      ...prev,
      payments_received: prev.payments_received.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");

      // Calculate judgment amount
      const judgmentAmount =
        parseFloat(formData.amount_of_debt || 0) +
        parseFloat(formData.amount_of_costs || 0);

      // Track only changed fields
      const changedFields = [];
      const fieldLabels = {
        claimant_name: "Claimant Name",
        claimant_ref: "Claimant Reference",
        claimant_address: "Claimant Address",
        defendant_name: "Defendant Name",
        defendant_ref: "Defendant Reference",
        defendant_address_on_judgment: "Defendant Address on Judgment",
        defendant_moved: "Defendant Moved",
        defendant_current_address: "Defendant Current Address",
        claim_number: "Claim Number",
        court_making_judgment: "Court Making Judgment",
        judgment_date: "Judgment Date",
        amount_of_debt: "Amount of Debt",
        amount_of_costs: "Amount of Costs",
        interest_recovery: "Interest Recovery",
        payments_received: "Payments Received",
        hceo_extra_details: "HCEO Extra Details",
      };

      Object.keys(formData).forEach((key) => {
        const oldVal = caseData[key];
        const newVal = formData[key];

        // Special handling for payments_received (compare as JSON)
        if (key === "payments_received") {
          const oldPayments = JSON.stringify(oldVal || []);
          const newPayments = JSON.stringify(newVal || []);
          if (oldPayments !== newPayments) {
            changedFields.push({
              field: fieldLabels[key] || key,
              oldValue: oldVal?.length ? `${oldVal.length} payment(s)` : "None",
              newValue: newVal?.length ? `${newVal.length} payment(s)` : "None",
            });
          }
          return;
        }

        // For other fields, compare values
        const oldValue = oldVal ?? "";
        const newValue = newVal ?? "";

        if (String(oldValue) !== String(newValue)) {
          changedFields.push({
            field: fieldLabels[key] || key,
            oldValue: oldValue === "" ? "(empty)" : String(oldValue),
            newValue: newValue === "" ? "(empty)" : String(newValue),
          });
        }
      });

      // Only update if there are changes
      if (changedFields.length === 0) {
        setError("No changes detected");
        setLoading(false);
        return;
      }

      // Update case in database
      const { data, error: updateError } = await supabase
        .from("case_submissions")
        .update({
          ...formData,
          judgment_amount: judgmentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create description with field names
      const fieldNames = changedFields.map((change) => change.field).join(", ");

      // Build action description
      let actionDescription = `Updated ${changedFields.length} field(s): ${fieldNames}`;
      if (adminNote.trim()) {
        actionDescription += `. Reason: ${adminNote}`;
      }

      // Add case history entry
      await addCaseHistory({
        caseId: caseData.id,
        userId: user?.id,
        userEmail: user?.email,
        userName: profile?.full_name || user?.email,
        userRole: profile?.role || "applicant",
        actionType: "case_updated",
        actionDescription: actionDescription,
        oldValue: null,
        newValue: null,
        metadata: {
          changedFields: changedFields,
          fieldsUpdated: changedFields.length,
          adminNote: adminNote.trim() || null,
          editedBy: profile?.role || "applicant",
        },
      });

      onSuccess(data, adminNote);
      onClose();
    } catch (err) {
      console.error("Error updating case:", err);
      setError(err.message || "Failed to update case");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Case Details</DialogTitle>
          <DialogDescription>
            Update the case information and click Save Changes
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Claimant Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Claimant Information</h3>

            <div>
              <Label htmlFor="claimant_name">Claimant Name *</Label>
              <Input
                id="claimant_name"
                name="claimant_name"
                value={formData.claimant_name || ""}
                onChange={handleChange}
                placeholder="Enter claimant name"
              />
            </div>

            <div>
              <Label htmlFor="claimant_ref">Claimant Reference *</Label>
              <Input
                id="claimant_ref"
                name="claimant_ref"
                value={formData.claimant_ref || ""}
                onChange={handleChange}
                placeholder="Enter reference number"
              />
            </div>

            <div>
              <Label htmlFor="claimant_address">Claimant Address *</Label>
              <Textarea
                id="claimant_address"
                name="claimant_address"
                value={formData.claimant_address || ""}
                onChange={handleChange}
                placeholder="Enter full address"
                rows={3}
              />
            </div>
          </div>

          {/* Defendant Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Defendant Information</h3>

            <div>
              <Label htmlFor="defendant_name">Defendant Name *</Label>
              <Input
                id="defendant_name"
                name="defendant_name"
                value={formData.defendant_name || ""}
                onChange={handleChange}
                placeholder="Enter defendant name"
              />
            </div>

            <div>
              <Label htmlFor="defendant_ref">Defendant Reference</Label>
              <Input
                id="defendant_ref"
                name="defendant_ref"
                value={formData.defendant_ref || ""}
                onChange={handleChange}
                placeholder="Enter reference (if any)"
              />
            </div>

            <div>
              <Label htmlFor="defendant_address_on_judgment">
                Defendant Address on Judgment *
              </Label>
              <Textarea
                id="defendant_address_on_judgment"
                name="defendant_address_on_judgment"
                value={formData.defendant_address_on_judgment || ""}
                onChange={handleChange}
                placeholder="Enter address as shown on judgment"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="defendant_moved"
                name="defendant_moved"
                checked={formData.defendant_moved || false}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, defendant_moved: checked }))
                }
              />
              <Label htmlFor="defendant_moved" className="cursor-pointer">
                Defendant has moved to a different address
              </Label>
            </div>

            {formData.defendant_moved && (
              <div>
                <Label htmlFor="defendant_current_address">
                  Defendant Current Address *
                </Label>
                <Textarea
                  id="defendant_current_address"
                  name="defendant_current_address"
                  value={formData.defendant_current_address || ""}
                  onChange={handleChange}
                  placeholder="Enter current address"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Case Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Case Information</h3>

            <div>
              <Label htmlFor="claim_number">Claim Number *</Label>
              <Input
                id="claim_number"
                name="claim_number"
                value={formData.claim_number || ""}
                onChange={handleChange}
                placeholder="Enter claim number"
              />
            </div>

            <div>
              <Label htmlFor="court_making_judgment">
                Court Making Judgment *
              </Label>
              <Select
                value={formData.court_making_judgment || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    court_making_judgment: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Court" />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.filter((c) => c !== "Select Court...").map(
                    (court) => (
                      <SelectItem key={court} value={court}>
                        {court}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="judgment_date">Judgment Date *</Label>
              <Input
                id="judgment_date"
                name="judgment_date"
                type="date"
                value={formData.judgment_date || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {profile?.role === "applicant" && (
            <>
              {/* Judgement Amount */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Judgement Amount</h3>

                <div>
                  <Label htmlFor="amount_of_debt">Amount of Debt (£) *</Label>
                  <Input
                    id="amount_of_debt"
                    name="amount_of_debt"
                    type="number"
                    step="0.01"
                    value={formData.amount_of_debt || ""}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="amount_of_costs">Amount of Costs (£) *</Label>
                  <Input
                    id="amount_of_costs"
                    name="amount_of_costs"
                    type="number"
                    step="0.01"
                    value={formData.amount_of_costs || ""}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm font-medium">
                    Total Judgment Amount: £
                    {(
                      parseFloat(formData.amount_of_debt || 0) +
                      parseFloat(formData.amount_of_costs || 0)
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Additional Details */}
          <div>
            <Label htmlFor="hceo_extra_details">
              Additional Details for HCEO
            </Label>
            <Textarea
              id="hceo_extra_details"
              name="hceo_extra_details"
              value={formData.hceo_extra_details || ""}
              onChange={handleChange}
              placeholder="Any additional information for the HCEO officer"
              rows={3}
            />
          </div>
        </div>

        {profile?.role === "admin" && (
          <div className="space-y-2 pt-3 border-t">
            <label className="text-sm font-medium">
              Reason for Edit (Optional)
            </label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Explain why you're making these changes..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        )}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCaseModal;
