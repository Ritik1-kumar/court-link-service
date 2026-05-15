// src/components/case/CaseForm.jsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FileUpload from "@/components/FileUpload";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";
import {
  COURTS,
  HCEO_OPTIONS,
  validateForm,
  calculateFees,
  formatAmount,
} from "@/lib/caseUtils";
import PaymentRow from "./PaymentRow";
import HCEOSelector from "./HCEOSelector";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "../ui/checkbox";

const CaseForm = ({
  initialData = null,
  onSubmit,
  onSaveDraft,
  loading = false,
  mode = "create",
  submitButtonText,
}) => {
  // Initialize form data based on mode and initialData
  const getInitialFormData = () => {
    if (initialData && mode === "edit") {
      // Parse payments_received if it's a string
      let paymentsReceived = [];
      try {
        if (typeof initialData.payments_received === "string") {
          paymentsReceived = JSON.parse(initialData.payments_received);
        } else if (Array.isArray(initialData.payments_received)) {
          paymentsReceived = initialData.payments_received;
        }
      } catch (e) {
        console.error("Error parsing payments_received:", e);
        paymentsReceived = [];
      }

      return {
        claimantName: initialData.claimant_name || "",
        claimantRef: initialData.claimant_ref || "",
        claimantAddress: initialData.claimant_address || "",
        defendantName: initialData.defendant_name || "",
        defendantRef: initialData.defendant_ref || "",
        defendantAddressOnJudgment:
          initialData.defendant_address_on_judgment || "",
        defendantMoved: initialData.defendant_moved || false,
        defendantCurrentAddress: initialData.defendant_current_address || "",
        judgmentAmount: initialData.judgment_amount?.toString() || "",
        judgmentDate: initialData.judgment_date || "",
        claimNumber: initialData.claim_number || "",
        courtMakingJudgment: initialData.court_making_judgment || "",
        claimingFixedCosts: initialData.claiming_fixed_costs || "",
        court: initialData.court || "",
        hceoChoice: initialData.hceo_choice || "",
        organization: initialData.organization || "",
        hceoExtraDetails: initialData.hceo_extra_details || "",
        interestRecovery: initialData.interest_recovery ? "yes" : "no",
        amountOfDebt: initialData.amount_of_debt?.toString() || "",
        amountOfCosts: initialData.amount_of_costs?.toString() || "",
        paymentsReceived: paymentsReceived,
        judgmentFiles: [],
        assignedUserName:
          initialData.assigned_user_name || initialData.hceo_choice || "",
        assignedUserEmail: initialData.assigned_user_email || "",
      };
    }

    // Default empty form for create mode
    return {
      claimantName: "",
      claimantRef: "",
      claimantAddress: "",
      defendantName: "",
      defendantRef: "",
      defendantAddressOnJudgment: "",
      defendantMoved: false,
      defendantCurrentAddress: "",
      judgmentAmount: "",
      judgmentDate: "",
      claimNumber: "",
      courtMakingJudgment: "",
      claimingFixedCosts: "",
      court: "",
      hceoChoice: "",
      organization: "",
      hceoExtraDetails: "",
      interestRecovery: "",
      amountOfDebt: "",
      amountOfCosts: "",
      paymentsReceived: [],
      judgmentFiles: [],
      assignedUserName: "",
      assignedUserEmail: "",
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [hceoOptions, setHceoOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [fees, setFees] = useState({
    courtFee: 0,
    serviceFee: 0,
    vat: 0,
    totalFees: 0,
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData && mode === "edit") {
      setFormData(getInitialFormData());
    }
  }, [initialData, mode]);

  const handleAddPayment = () => {
    setFormData((prev) => ({
      ...prev,
      paymentsReceived: [...prev.paymentsReceived, { date: "", amount: "" }],
    }));
  };

  const handlePaymentChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      paymentsReceived: prev.paymentsReceived.map((payment, i) =>
        i === index ? { ...payment, [field]: value } : payment,
      ),
    }));
  };

  const handleRemovePayment = (index) => {
    setFormData((prev) => ({
      ...prev,
      paymentsReceived: prev.paymentsReceived.filter((_, i) => i !== index),
    }));
  };

  // Calculate total judgment amount
  const calculateTotalJudgment = () => {
    const debt = parseFloat(formData.amountOfDebt) || 0;
    const costs = parseFloat(formData.amountOfCosts) || 0;
    return debt + costs;
  };

  // Calculate total payments received
  const calculateTotalPayments = () => {
    return formData.paymentsReceived.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);
  };

  // Load HCEO options as objects
  useEffect(() => {
    const loadHCEOOptions = async () => {
      try {
        const options = await HCEO_OPTIONS();
        setHceoOptions(options);
      } catch (error) {
        console.error("Failed to load HCEO options:", error);
        setHceoOptions([]);
      }
    };
    loadHCEOOptions();
  }, []);

  // Calculate fees - now independent of judgment amount
  useEffect(() => {
    const calculatedFees = calculateFees();
    setFees(calculatedFees);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      judgmentFiles: [...prev.judgmentFiles, ...files],
    }));
    if (errors.judgmentFiles) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.judgmentFiles;
        return newErrors;
      });
    }
  };

  const handleFileRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      judgmentFiles: prev.judgmentFiles.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm(formData, mode === "create");

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Scroll to first error
      const firstErrorKey = Object.keys(validationErrors)[0];
      const errorElement = document.getElementById(firstErrorKey);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    await onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    await onSaveDraft(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Case Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Case Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-red-500 flex space-x-2">
            <AlertTriangle className="w-8 h-6" />
            <div>
              <span className="font-bold">Important:</span> This must match the
              High Court judgment EXACTLY – character for character, including
              spaces, punctuation, and abbreviations (e.g., "Limited" vs "Ltd").
              Mismatches will be rejected by the court and delay your
              application.
            </div>
          </div>
          {/* Claimant Information */}
          <div className="space-y-2">
            <Label htmlFor="claimantName">
              Claimant Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claimantName"
              name="claimantName"
              value={formData.claimantName}
              onChange={handleInputChange}
              className={errors.claimantName ? "border-red-500" : ""}
            />
            {errors.claimantName && (
              <p className="text-sm text-red-600">{errors.claimantName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimantRef">
              Claimant Ref <span className="text-red-500">*</span>
            </Label>
            <Input
              id="claimantRef"
              name="claimantRef"
              value={formData.claimantRef}
              onChange={handleInputChange}
              className={errors.claimantRef ? "border-red-500" : ""}
            />
            {errors.claimantRef && (
              <p className="text-sm text-red-600">{errors.claimantRef}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="claimantAddress">
              Claimant Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="claimantAddress"
              name="claimantAddress"
              value={formData.claimantAddress}
              onChange={handleInputChange}
              rows={3}
              className={errors.claimantAddress ? "border-red-500" : ""}
            />
            {errors.claimantAddress && (
              <p className="text-sm text-red-600">{errors.claimantAddress}</p>
            )}
          </div>

          {/* Defendant Information */}
          <div className="space-y-2">
            <Label htmlFor="defendantName">
              Defendant Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="defendantName"
              name="defendantName"
              value={formData.defendantName}
              onChange={handleInputChange}
              className={errors.defendantName ? "border-red-500" : ""}
            />
            {errors.defendantName && (
              <p className="text-sm text-red-600">{errors.defendantName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defendantRef">
              Defendant Ref <span className="text-red-500">*</span>
            </Label>
            <Input
              id="defendantRef"
              name="defendantRef"
              value={formData.defendantRef}
              onChange={handleInputChange}
              className={errors.defendantRef ? "border-red-500" : ""}
            />
            {errors.defendantRef && (
              <p className="text-sm text-red-600">{errors.defendantRef}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defendantAddressOnJudgment">
              Defendant Address on Judgment{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="defendantAddressOnJudgment"
              name="defendantAddressOnJudgment"
              value={formData.defendantAddressOnJudgment}
              onChange={handleInputChange}
              rows={3}
              className={
                errors.defendantAddressOnJudgment ? "border-red-500" : ""
              }
            />
            {errors.defendantAddressOnJudgment && (
              <p className="text-sm text-red-600">
                {errors.defendantAddressOnJudgment}
              </p>
            )}
          </div>

          {/* Defendant Moved Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="defendantMoved"
              checked={formData.defendantMoved}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, defendantMoved: checked }))
              }
            />
            <Label
              htmlFor="defendantMoved"
              className="font-normal cursor-pointer"
            >
              The defendant has moved since the Judgment
            </Label>
          </div>

          {formData.defendantMoved && (
            <div className="space-y-2 ml-6">
              <Label htmlFor="defendantCurrentAddress">
                Defendant Current Address{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="defendantCurrentAddress"
                name="defendantCurrentAddress"
                value={formData.defendantCurrentAddress}
                onChange={handleInputChange}
                rows={3}
                className="bg-gray-50"
              />
            </div>
          )}

          {/* Claim Number & Court */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="claimNumber">
                Claim Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="claimNumber"
                name="claimNumber"
                value={formData.claimNumber}
                onChange={handleInputChange}
                className={errors.claimNumber ? "border-red-500" : ""}
              />
              {errors.claimNumber && (
                <p className="text-sm text-red-600">{errors.claimNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courtMakingJudgment">
                Court Making Judgment <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.courtMakingJudgment}
                onValueChange={(value) =>
                  handleInputChange({
                    target: { name: "courtMakingJudgment", value },
                  })
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
                    ),
                  )}
                </SelectContent>
              </Select>

              {errors.courtMakingJudgment && (
                <p className="text-sm text-red-600">
                  {errors.courtMakingJudgment}
                </p>
              )}
            </div>
          </div>

          {/* Fixed Costs Radio */}
          <div className="space-y-2">
            <Label>
              Are you claiming legal fixed costs on this application?{" "}
              <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.claimingFixedCosts}
              onValueChange={(value) =>
                handleInputChange({
                  target: { name: "claimingFixedCosts", value },
                })
              }
              className={errors.claimingFixedCosts ? "border-red-500" : ""}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="fixedCostsYes" />
                  <Label
                    htmlFor="fixedCostsYes"
                    className="font-normal cursor-pointer"
                  >
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="fixedCostsNo" />
                  <Label
                    htmlFor="fixedCostsNo"
                    className="font-normal cursor-pointer"
                  >
                    No
                  </Label>
                </div>
              </div>
            </RadioGroup>
            {errors.claimingFixedCosts && (
              <p className="text-sm text-red-600">
                {errors.claimingFixedCosts}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Copy of Judgment Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Copy of Judgment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judgmentDate">
              Date of Judgment <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="judgmentDate"
                name="judgmentDate"
                type="date"
                value={formData.judgmentDate}
                onChange={handleInputChange}
                className={errors.judgmentDate ? "border-red-500" : ""}
              />
            </div>
            {errors.judgmentDate && (
              <p className="text-sm text-red-600">{errors.judgmentDate}</p>
            )}
          </div>

          <FileUpload
            label="Judgment"
            files={formData.judgmentFiles}
            onChange={handleFileChange}
            onRemove={handleFileRemove}
            error={errors.judgmentFiles}
            required={true}
            helperText="Click to Upload or Drag and Drop to Insert Judgment"
            className={errors.judgmentFiles ? "border-red-500" : ""}
          />
        </CardContent>
      </Card>

      {/* Judgment Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Judgment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amountOfDebt">
              Amount of Debt <span className="text-red-500">*</span>
              <span className="text-sm text-gray-500">
                (including interest)
              </span>
            </Label>
            <Input
              id="amountOfDebt"
              name="amountOfDebt"
              type="number"
              step="0.01"
              value={formData.amountOfDebt}
              onChange={handleInputChange}
              placeholder="0.00"
              className={errors.amountOfDebt ? "border-red-500" : ""}
            />
            {errors.amountOfDebt && (
              <p className="text-sm text-red-600">{errors.amountOfDebt}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountOfCosts">
              Amount of Costs <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amountOfCosts"
              name="amountOfCosts"
              type="number"
              step="0.01"
              value={formData.amountOfCosts}
              onChange={handleInputChange}
              placeholder="0.00"
              className={errors.amountOfCosts ? "border-red-500" : ""}
            />
            {errors.amountOfCosts && (
              <p className="text-sm text-red-600">{errors.amountOfCosts}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Total Amount of Judgment{" "}
              <span className="text-sm text-gray-500">
                (Including any costs)
              </span>
            </Label>
            <div className="bg-gray-100 p-3 rounded-md">
              <span className="text-lg font-semibold">
                £{calculateTotalJudgment().toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Received Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Payments Received Since Judgment
          </CardTitle>
          <p className="text-sm text-gray-600">
            Please enter any repayments into the table below. You can create a
            new payment by entering the details into the blank line.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 font-semibold text-sm">
              <div>Date</div>
              <div>Amount</div>
              <div className="w-10">Delete</div>
            </div>

            {formData.paymentsReceived.map((payment, index) => (
              <PaymentRow
                key={index}
                payment={payment}
                index={index}
                onChange={handlePaymentChange}
                onRemove={handleRemovePayment}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddPayment}
              className="w-full"
            >
              + Add Payment
            </Button>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold">Total:</span>
            <span className="text-lg font-bold">
              £{calculateTotalPayments().toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* HCEO Officer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">HCEO Officer</CardTitle>
        </CardHeader>
        <CardContent>
          <HCEOSelector
            value={{
              hceoChoice: formData.hceoChoice,
              assignedUserName: formData.assignedUserName,
              assignedUserEmail: formData.assignedUserEmail,
              organization: formData.organization,
              hceoExtraDetails: formData.hceoExtraDetails,
            }}
            onChange={(value) => {
              setFormData((prev) => ({
                ...prev,
                hceoChoice: value.hceoChoice,
                assignedUserName: value.assignedUserName,
                assignedUserEmail: value.assignedUserEmail,
                organization: value.organization,
                hceoExtraDetails: value.hceoExtraDetails,
              }));
            }}
            error={errors.hceoChoice}
          />
        </CardContent>
      </Card>

      {/* Payment Summary - only in create mode */}
      {mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Court Fee:</span>
                <span className="font-semibold">
                  {formatAmount(fees.courtFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee:</span>
                <span className="font-semibold">
                  {formatAmount(fees.serviceFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (20% on service fee):</span>
                <span className="font-semibold">{formatAmount(fees.vat)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-lg font-semibold">Total Fees:</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatAmount(fees.totalFees)}
                </span>
              </div>
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This is a fixed fee structure: £66 court fee + £35 service fee
                  + VAT on service fee.
                  <br />
                  The judgment amount does not affect the total fees.
                </AlertDescription>
              </Alert>
            </CardContent>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            Save as Draft
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? "Processing..."
            : mode === "edit"
              ? "Update Case"
              : "Submit Case"}
        </Button>
      </div>
    </form>
  );
};

export default CaseForm;
