// src/pages/applicant/CaseSubmission.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import PreSubmissionChecklist from "@/components/case/PreSubmissionChecklist";
import CaseForm from "@/components/case/CaseForm";
import ApplicantSignatureStep from "@/components/case/ApplicantSignatureStep";
import PaymentForm from "@/components/case/PaymentForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  saveCaseToDatabase,
  createPaymentIntent,
  calculateFees,
  getHCEOWithLeastCases,
} from "@/lib/caseUtils";
import { supabase } from "@/lib/supabase";
import { addCaseHistory } from "@/lib/caseHistory";
import { createInvoiceForCase } from "@/lib/invoiceUtils";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/**
 * Retry wrapper for transient network/Supabase errors
 */
const withRetry = async (fn, retries = 3, delayMs = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError =
        err?.message?.includes("Failed to fetch") || err?.code === "";
      if (isNetworkError && i < retries - 1) {
        console.warn(
          `Network error, retrying in ${delayMs * (i + 1)}ms... (attempt ${i + 1}/${retries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      } else {
        throw err;
      }
    }
  }
};

const CaseSubmission = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0); // 0: Checklist, 1: Form, 2: Signature, 3: Payment, 4: Success
  const [formData, setFormData] = useState(null);
  const [signatureData, setSignatureData] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedCaseId, setSavedCaseId] = useState(null);

  // Load existing signature from profile if available
  useEffect(() => {
    if (profile?.signature) {
      setSignatureData(profile.signature);
    }
  }, [profile]);

  // Step 0: Handle checklist continue
  const handleChecklistContinue = () => {
    setStep(1);
  };

  // Step 1: Handle form submission (save as draft first, then move to signature)
  const handleFormSubmit = async (data) => {
    try {
      setLoading(true);
      setError("");

      let processedData = { ...data };

      if (data.hceoChoice === "Random Assignment") {
        const assignedHCEO = await getHCEOWithLeastCases();
        if (assignedHCEO) {
          processedData.hceoChoice = assignedHCEO.name;
          processedData.assignedUserName = assignedHCEO.name;
          processedData.assignedUserEmail = assignedHCEO.email;
        } else {
          console.warn("Could not find HCEO for automatic assignment");
        }
      }

      const savedCase = await saveCaseToDatabase(processedData, user, true);

      setSavedCaseId(savedCase.id);
      setFormData(processedData);
      setStep(2);
    } catch (err) {
      console.error("Error in form submission:", err);
      setError(err.message || "Failed to save case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle signature completion
  const handleSignatureComplete = async ({ signatureData, saveForFuture }) => {
    try {
      setLoading(true);
      setError("");

      // Save signature to case
      const { error: updateCaseError } = await withRetry(() =>
        supabase
          .from("case_submissions")
          .update({ applicant_signature: signatureData })
          .eq("id", savedCaseId)
          .eq("user_id", user.id),
      );
      if (updateCaseError) throw updateCaseError;

      // Save signature to profile if requested
      if (saveForFuture) {
        const { error: updateProfileError } = await withRetry(() =>
          supabase
            .from("profiles")
            .update({ signature: signatureData })
            .eq("id", user.id),
        );
        if (updateProfileError) {
          console.error(
            "Error saving signature to profile:",
            updateProfileError,
          );
        } else {
          console.log("✅ Signature saved to profile for future use");
        }
      }

      setSignatureData(signatureData);

      // Create payment intent
      const fees = calculateFees();
      const formDataWithCaseId = {
        ...formData,
        caseId: savedCaseId,
        id: savedCaseId,
      };
      const paymentResponse = await createPaymentIntent(
        fees.totalFees,
        formDataWithCaseId,
        user,
      );

      // Handle both string (legacy) and object responses
      let clientSecret, paymentIntentId;
      if (typeof paymentResponse === "string") {
        clientSecret = paymentResponse;
        paymentIntentId = clientSecret.split("_secret_")[0] || null;
      } else {
        clientSecret = paymentResponse.clientSecret;
        paymentIntentId = paymentResponse.paymentIntentId;
      }

      // Store payment_intent_id on case record
      if (paymentIntentId) {
        const { error: updatePaymentIdError } = await withRetry(() =>
          supabase
            .from("case_submissions")
            .update({
              payment_intent_id: paymentIntentId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", savedCaseId)
            .eq("user_id", user.id),
        );
        if (updatePaymentIdError) {
          console.error(
            "❌ Error updating payment_intent_id:",
            updatePaymentIdError,
          );
        } else {
          console.log("✅ payment_intent_id stored on case record");
        }
      } else {
        console.warn("⚠️ Could not extract payment_intent_id");
      }

      setClientSecret(clientSecret);
      setStep(3);
    } catch (err) {
      console.error("Error saving signature:", err);
      setError(err.message || "Failed to save signature. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle save as draft
  const handleSaveDraft = async (data) => {
    try {
      setLoading(true);
      setError("");
      const savedCase = await saveCaseToDatabase(data, user, true);
      setSavedCaseId(savedCase.id);
      alert("Case saved as draft successfully!");
      navigate("/drafts");
    } catch (err) {
      console.error("Error saving draft:", err);
      setError(err.message || "Failed to save draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Handle successful payment
  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      setLoading(true);
      setError("");

      if (!savedCaseId) {
        throw new Error("No case ID found. Please contact support.");
      }

      const fees = calculateFees();

      // Update case to submitted
      const { data: updatedCase, error: updateError } = await supabase
        .from("case_submissions")
        .update({
          is_draft: false,
          status: "submitted",
          payment_intent_id: paymentIntentId,
          payment_status: "succeeded",
          payment_amount: fees.totalFees,
          court_fee: fees.courtFee,
          service_fee: fees.serviceFee,
          vat_amount: fees.vat,
          updated_at: new Date().toISOString(),
        })
        .eq("id", savedCaseId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Add history entry
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name, role")
        .eq("id", user.id)
        .single();

      await addCaseHistory({
        caseId: updatedCase.id,
        userId: user.id,
        userEmail: userProfile?.email || user.email,
        userName: userProfile?.full_name || "User",
        userRole: userProfile?.role || "applicant",
        actionType: "status_change",
        actionDescription: "Case submitted successfully with payment",
        oldValue: "draft",
        newValue: "submitted",
        metadata: {
          payment_intent_id: paymentIntentId,
          payment_amount: fees.totalFees,
          judgment_amount: updatedCase.judgment_amount,
        },
      });

      // ── Create invoice (custom system, no Xero) ──────────────────────────
      try {
        const invoiceResult = await createInvoiceForCase(savedCaseId);

        if (invoiceResult.success) {
          console.log("✅ Invoice created:");
        } else if (invoiceResult.alreadyExists) {
          // Webhook already created it — that's fine
          console.log("ℹ️ Invoice already exists:");
        } else {
          console.warn(
            "⚠️ Invoice creation failed (admin can create manually):",
            invoiceResult.error,
          );
        }
      } catch (invoiceErr) {
        // Non-fatal — case is still submitted successfully
        console.warn(
          "⚠️ Invoice creation error (non-fatal):",
          invoiceErr.message,
        );
      }
      // ────────────────────────────────────────────────────────────────────

      setStep(4);
    } catch (err) {
      console.error("Error updating case after payment:", err);

      if (err.message.includes("row-level security")) {
        setError(
          "Payment succeeded but failed to update case due to permissions. Please contact support with your payment confirmation.",
        );
      } else {
        setError(
          `Payment succeeded (ID: ${paymentIntentId.substring(0, 15)}...) but failed to update case: ${err.message}. Please contact support with case ID: ${savedCaseId}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle payment error
  const handlePaymentError = (err) => {
    setError(err.message || "Payment failed. Please try again.");
  };

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          showBackButton
          backTo="/applicant/dashboard"
          title="New Case Application"
          subtitle={
            step === 0
              ? "Please confirm eligibility requirements"
              : step === 1
                ? "Fill in the case details"
                : step === 2
                  ? "Sign your application forms"
                  : step === 3
                    ? "Complete payment to submit your case"
                    : "Case submitted successfully"
          }
        />

        {/* Progress Indicator */}
        {step > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2">
              {[
                { label: "Case Details", num: 1, activeStep: 1 },
                { label: "Signature", num: 2, activeStep: 2 },
                { label: "Payment", num: 3, activeStep: 3 },
                { label: "Confirmation", num: 4, activeStep: 4 },
              ].map((s, i, arr) => (
                <React.Fragment key={s.num}>
                  <div
                    className={`flex items-center ${step >= s.activeStep ? (s.num === 4 ? "text-green-600" : "text-blue-600") : "text-gray-400"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full leading-none flex items-center justify-center ${
                        step >= s.activeStep
                          ? s.num === 4
                            ? "bg-green-600 text-white"
                            : "bg-blue-600 text-white"
                          : "bg-gray-300"
                      }`}
                    >
                      {s.num}
                    </div>
                    <span className="ml-2 font-medium hidden sm:inline">
                      {s.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-300" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 0: Pre-submission Checklist */}
        {step === 0 && (
          <PreSubmissionChecklist onContinue={handleChecklistContinue} />
        )}

        {/* Step 1: Case Form */}
        {step === 1 && (
          <CaseForm
            mode="create"
            onSubmit={handleFormSubmit}
            onSaveDraft={handleSaveDraft}
            loading={loading}
          />
        )}

        {/* Step 2: Signature */}
        {step === 2 && (
          <ApplicantSignatureStep
            onContinue={handleSignatureComplete}
            onBack={() => setStep(1)}
            existingSignature={signatureData}
            loading={loading}
          />
        )}

        {/* Step 3: Payment */}
        {step === 3 && clientSecret && formData && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              amount={parseFloat(formData.judgmentAmount)}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              clientSecret={clientSecret}
              formData={formData}
            />
          </Elements>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Case Submitted Successfully!
                </h2>
                <p className="text-gray-600">
                  Your case has been submitted and payment processed.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Status:{" "}
                  <span className="font-semibold text-blue-600">Submitted</span>
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What happens next?
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="mr-2">1.</span>
                    <span>
                      Your case will be reviewed by our admin team within 24-48
                      hours
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">2.</span>
                    <span>
                      Once approved, legal forms will be prepared and sent to
                      the HCEO
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">3.</span>
                    <span>
                      You'll receive email updates at each stage of the process
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => navigate(`/case-details/${savedCaseId}`)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Case Details
                </button>
                <button
                  onClick={() => navigate("/applicant/dashboard")}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseSubmission;
