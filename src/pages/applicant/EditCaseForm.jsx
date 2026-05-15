// src/pages/applicant/EditCaseForm.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import CaseForm from "@/components/case/CaseForm";
import ApplicantSignatureStep from "@/components/case/ApplicantSignatureStep";
import PaymentForm from "@/components/case/PaymentForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  updateCaseInDatabase,
  canEditCase,
  createPaymentIntent,
  calculateFees,
  getHCEOWithLeastCases,
} from "@/lib/caseUtils";
import { addCaseHistory } from "@/lib/caseHistory";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const EditCaseForm = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Signature and payment flow states
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [formData, setFormData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId = null;
    const fetchCaseData = async () => {
      if (!user?.id || !caseId) return;

      try {
        setLoading(true);
        setError("");

        timeoutId = setTimeout(() => {
          if (mounted) {
            setError("Request timed out. Please refresh the page.");
            setLoading(false);
          }
        }, 20000);

        const { data, error: fetchError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("id", caseId)
          .eq("user_id", user.id)
          .single();

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (!mounted) return;

        if (fetchError) {
          if (
            fetchError.message?.includes("JWT") ||
            fetchError.message?.includes("session")
          ) {
            const { error: refreshError } =
              await supabase.auth.refreshSession();
            if (!refreshError) {
              return fetchCaseData();
            }
          }
          throw fetchError;
        }

        if (!data) throw new Error("Case not found");

        if (!canEditCase(data)) {
          throw new Error(
            "This case cannot be edited. Only draft and submitted cases can be modified.",
          );
        }

        let paymentsReceived = [];
        try {
          if (typeof data.payments_received === "string") {
            paymentsReceived = JSON.parse(data.payments_received);
          } else if (Array.isArray(data.payments_received)) {
            paymentsReceived = data.payments_received;
          }
        } catch (e) {
          console.error("Error parsing payments_received:", e);
          paymentsReceived = [];
        }

        setCaseData(data);

        const formDataToSet = {
          claimantName: data.claimant_name || "",
          claimantRef: data.claimant_ref || "",
          claimantAddress: data.claimant_address || "",
          defendantName: data.defendant_name || "",
          defendantRef: data.defendant_ref || "",
          defendantAddressOnJudgment: data.defendant_address_on_judgment || "",
          defendantMoved: data.defendant_moved || false,
          defendantCurrentAddress: data.defendant_current_address || "",
          judgmentAmount: data.judgment_amount?.toString() || "",
          judgmentDate: data.judgment_date || "",
          claimNumber: data.claim_number || "",
          courtMakingJudgment: data.court_making_judgment || "",
          claimingFixedCosts: data.claiming_fixed_costs || "",
          court: data.court || "",
          hceoChoice: data.hceo_choice || "",
          interestRecovery: data.interest_recovery ? "yes" : "no",
          amountOfDebt: data.amount_of_debt?.toString() || "",
          amountOfCosts: data.amount_of_costs?.toString() || "",
          paymentsReceived: paymentsReceived,
          hceoExtraDetails: data.hceo_extra_details || "",
          judgmentFiles: [],
          assignedUserName: data.assigned_user_name || data.hceo_choice || "",
          assignedUserEmail: data.assigned_user_email || "",
        };

        setFormData(formDataToSet);

        if (data.applicant_signature) {
          setSignatureData(data.applicant_signature);
        } else if (profile?.signature) {
          setSignatureData(profile.signature);
        }
      } catch (err) {
        console.error("Error fetching case details:", err);
        if (mounted) {
          setError(err.message || "Failed to load case details");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCaseData();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [caseId, user?.id]);

  // Update case as draft (no payment)
  const handleSaveDraft = async (data) => {
    try {
      setSaving(true);
      setError("");

      await updateCaseInDatabase(
        caseId,
        data,
        user,
        caseData.judgment_file_paths,
        caseData.status === "submitted",
      );

      alert(
        caseData.status === "submitted"
          ? "Case updated successfully!"
          : "Draft updated successfully!",
      );
      navigate(`/case-details/${caseId}`);
    } catch (err) {
      console.error("Error updating case:", err);
      setError(err.message || "Failed to update case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Submit case with payment (for draft cases only) - now goes to signature first
  const handleSubmitWithPayment = async (data) => {
    if (caseData.status !== "draft" && !caseData.is_draft) {
      setError(
        "Payment is only required for draft cases. Use 'Save Changes' to update submitted cases.",
      );
      return;
    }

    try {
      setSaving(true);
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

      await updateCaseInDatabase(
        caseId,
        processedData,
        user,
        caseData.judgment_file_paths,
        false,
      );

      setFormData(processedData);
      setShowSignature(true);
    } catch (err) {
      console.error("Error preparing case update:", err);
      setError(err.message || "Failed to update case. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle signature completion - then goes to payment
  const handleSignatureComplete = async ({ signatureData, saveForFuture }) => {
    try {
      setSaving(true);
      setError("");

      const { error: updateCaseError } = await supabase
        .from("case_submissions")
        .update({ applicant_signature: signatureData })
        .eq("id", caseId)
        .eq("user_id", user.id);

      if (updateCaseError) {
        throw updateCaseError;
      }

      if (saveForFuture) {
        const { error: updateProfileError } = await supabase
          .from("profiles")
          .update({ signature: signatureData })
          .eq("id", user.id);

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

      const fees = calculateFees();
      const secret = await createPaymentIntent(fees.totalFees, formData, user);

      setClientSecret(secret);
      setShowSignature(false);
      setShowPayment(true);
    } catch (err) {
      console.error("Error saving signature:", err);
      setError(err.message || "Failed to save signature. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Handle back from signature to form
  const handleBackToForm = () => {
    setShowSignature(false);
    setShowPayment(false);
    setClientSecret("");
  };

  // Handle successful payment
  const handlePaymentSuccess = async (paymentIntentId) => {
    try {
      setSaving(true);
      setError("");

      const fees = calculateFees();

      const updatePayload = {
        is_draft: false,
        status: "submitted",
        payment_intent_id: paymentIntentId,
        payment_status: "succeeded",
        payment_amount: fees.totalFees,
        court_fee: fees.courtFee,
        service_fee: fees.serviceFee,
        vat_amount: fees.vat,
        updated_at: new Date().toISOString(),
      };

      const { data: updatedCase, error: updateError } = await supabase
        .from("case_submissions")
        .update(updatePayload)
        .eq("id", caseId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating case:", updateError);
        throw updateError;
      }

      const { data: profile } = await supabase
        .from("profiles_public")
        .select("email, full_name, role")
        .eq("id", user.id)
        .single();

      await addCaseHistory({
        caseId: updatedCase.id,
        userId: user.id,
        userEmail: profile?.email || user.email,
        userName: profile?.full_name || "User",
        userRole: profile?.role || "applicant",
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

      // Poll for Xero invoice creation (check every 2 seconds for up to 10 seconds)
      let xeroInvoiceChecks = 0;
      const maxChecks = 5;
      const checkInterval = 2000;
      let fallbackAttempted = false;
      let invoicePdfBase64 = null;

      const checkXeroInvoice = async () => {
        xeroInvoiceChecks++;

        try {
          const { data: xeroInvoice, error: xeroError } = await supabase
            .from("xero_invoices")
            .select("*")
            .eq("case_id", updatedCase.id)
            .maybeSingle();

          if (xeroError) {
            console.error("❌ Error querying xero_invoices:", xeroError);
          }

          if (xeroInvoice) {
            // Fetch invoice PDF for potential future use
            if (!invoicePdfBase64 && xeroInvoice.xero_invoice_id) {
              try {
                const isLocalhost =
                  window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1";
                const apiUrl = isLocalhost
                  ? import.meta.env.VITE_API_URL || "http://localhost:3001"
                  : window.location.origin;
                const endpoint = isLocalhost
                  ? `${apiUrl}/api/xero-get-invoice-pdf`
                  : `/.netlify/functions/xero-get-invoice-pdf`;

                const pdfResponse = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    invoiceId: xeroInvoice.xero_invoice_id,
                  }),
                });

                if (pdfResponse.ok) {
                  const pdfData = await pdfResponse.json();
                  if (pdfData.invoicePdfBase64) {
                    const cleanedBase64 = pdfData.invoicePdfBase64.replace(
                      /\s/g,
                      "",
                    );
                    if (
                      cleanedBase64.length > 0 &&
                      /^[A-Za-z0-9+/]*={0,2}$/.test(cleanedBase64)
                    ) {
                      invoicePdfBase64 = cleanedBase64;
                    } else {
                      console.warn("⚠️ Invalid base64 PDF data received");
                    }
                  }
                } else {
                  const errorText = await pdfResponse
                    .text()
                    .catch(() => "Unknown error");
                  console.warn("⚠️ Could not fetch invoice PDF:", errorText);
                }
              } catch (pdfError) {
                console.warn("⚠️ Error fetching invoice PDF:", pdfError);
              }
            }

            return true; // Invoice found!
          } else {
          }

          const { data: syncLog } = await supabase
            .from("xero_sync_logs")
            .select("*")
            .eq("case_id", updatedCase.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (syncLog && syncLog.status === "failed") {
            console.error("❌❌❌ XERO INVOICE CREATION FAILED ❌❌❌");
            console.error("❌ Error Message:", syncLog.error_message);
            console.error("📋 Request Data:", syncLog.request_data);
            console.error(
              "⏰ Failed At:",
              new Date(syncLog.created_at).toLocaleString(),
            );

            let errorDetails = "";
            try {
              const errorObj = JSON.parse(syncLog.error_message);
              if (errorObj.response?.body?.Elements) {
                console.error("🔍 Xero API Validation Errors:");
                const errors = [];
                errorObj.response.body.Elements.forEach((el) => {
                  if (el.ValidationErrors) {
                    el.ValidationErrors.forEach((ve) => {
                      console.error(`   - ${ve.Message}`);
                      errors.push(ve.Message);
                    });
                  }
                });
                errorDetails = errors.join("; ");
              }
            } catch (e) {
              errorDetails =
                syncLog.error_message?.substring(0, 200) || "Unknown error";
            }

            alert(
              "⚠️ Payment Successful but Invoice Creation Failed\n\n" +
                "Your case has been submitted and payment processed successfully.\n\n" +
                "However, the automatic Xero invoice could not be created:\n" +
                errorDetails +
                "\n\n" +
                "An administrator will create the invoice manually.\n" +
                "Check browser console (F12) for details.",
            );

            if (
              syncLog.error_message?.includes("tokens not available") ||
              syncLog.error_message?.includes("Xero tokens")
            ) {
              console.error("\n🔐 ACTION REQUIRED:");
              console.error("1. Xero authentication is missing or expired");
              console.error("2. Admin needs to visit: /api/xero-auth");
              console.error("3. Complete Xero authorization");
              console.error("4. Try submitting a new case");
            } else if (
              syncLog.error_message?.includes("currency") ||
              syncLog.error_message?.includes("Currency")
            ) {
              console.error("\n💱 CURRENCY MISMATCH:");
              console.error(
                "The Xero organization currency doesn't match the payment currency",
              );
              console.error(
                "Contact your administrator to configure the correct currency",
              );
            } else if (
              syncLog.error_message?.includes("TaxType") ||
              syncLog.error_message?.includes("tax")
            ) {
              console.error("\n📋 TAX CONFIGURATION ERROR:");
              console.error(
                "The tax type is not configured correctly for this Xero account",
              );
              console.error(
                "Contact your administrator to update XERO_DEFAULT_TAX_TYPE",
              );
            }

            return true; // Error found, stop checking
          }

          if (xeroInvoiceChecks >= maxChecks && !fallbackAttempted) {
            fallbackAttempted = true;
            console.warn(
              "⚠️ Xero invoice creation is taking longer than expected",
            );
            console.warn(
              "🔄 Attempting to create invoice directly as fallback (one-time attempt)...",
            );

            try {
              const isLocalhost =
                window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1";
              const apiUrl = isLocalhost
                ? import.meta.env.VITE_API_URL || "http://localhost:3001"
                : window.location.origin;
              const endpoint = isLocalhost
                ? `${apiUrl}/api/create-invoice-for-case`
                : `/.netlify/functions/create-invoice-for-case`;

              const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseId: updatedCase.id }),
              });

              if (response.ok) {
                const result = await response.json();

                if (result.invoicePdfBase64) {
                  const cleanedBase64 = result.invoicePdfBase64.replace(
                    /\s/g,
                    "",
                  );
                  if (
                    cleanedBase64.length > 0 &&
                    /^[A-Za-z0-9+/]*={0,2}$/.test(cleanedBase64)
                  ) {
                    invoicePdfBase64 = cleanedBase64;
                  } else {
                    console.warn(
                      "⚠️ Invalid base64 PDF data from fallback API",
                    );
                  }
                }

                await new Promise((resolve) => setTimeout(resolve, 2000));

                const { data: newInvoice } = await supabase
                  .from("xero_invoices")
                  .select("*")
                  .eq("case_id", updatedCase.id)
                  .maybeSingle();

                return true; // Stop polling
              } else {
                const errorData = await response
                  .json()
                  .catch(() => ({ error: "Unknown error" }));
                console.error(
                  "❌ Failed to create invoice via fallback:",
                  errorData,
                );

                if (
                  errorData.error &&
                  errorData.error.includes("already exists")
                ) {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  const { data: existingInvoice } = await supabase
                    .from("xero_invoices")
                    .select("*")
                    .eq("case_id", updatedCase.id)
                    .maybeSingle();
                  if (existingInvoice) {
                    return true;
                  }
                }

                try {
                  await supabase.from("xero_sync_logs").insert({
                    case_id: updatedCase.id,
                    action: "create",
                    status: "failed",
                    request_data: {
                      case_id: updatedCase.id,
                      fallback_attempt: true,
                    },
                    error_message: JSON.stringify(errorData),
                  });
                } catch (logError) {
                  console.error("Failed to log error:", logError);
                }

                return true;
              }
            } catch (fallbackError) {
              console.error(
                "❌ Error calling invoice creation API:",
                fallbackError,
              );

              try {
                await supabase.from("xero_sync_logs").insert({
                  case_id: updatedCase.id,
                  action: "create",
                  status: "failed",
                  request_data: {
                    case_id: updatedCase.id,
                    fallback_attempt: true,
                  },
                  error_message: fallbackError.message || String(fallbackError),
                });
              } catch (logError) {
                console.error("Failed to log error:", logError);
              }

              return true;
            }
          }

          if (fallbackAttempted) {
            return true;
          }

          return false;
        } catch (error) {
          console.error("Error checking Xero invoice status:", error);
          return xeroInvoiceChecks >= maxChecks;
        }
      };

      const initialResult = await checkXeroInvoice();

      if (!initialResult && !fallbackAttempted) {
        let pollInterval = null;
        pollInterval = setInterval(async () => {
          if (fallbackAttempted) {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          }

          const shouldStop = await checkXeroInvoice();
          if (shouldStop || fallbackAttempted) {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        }, checkInterval);

        setTimeout(
          () => {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            if (!fallbackAttempted) {
              console.warn("⏱️ Polling timeout reached - stopping checks");
            }
          },
          maxChecks * checkInterval + 2000,
        );
      } else {
        console.log("🧾 ================================================\n");
      }

      setPaymentSuccess(true);
    } catch (err) {
      console.error("Error updating case after payment:", err);
      setError(
        `Payment succeeded but failed to update case: ${err.message}. Please contact support.`,
      );
    } finally {
      setSaving(false);
    }
  };

  // Handle payment error
  const handlePaymentError = (err) => {
    setError(err.message || "Payment failed. Please try again.");
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading case data..." />
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            showBackButton
            backTo="/applicant/dashboard"
            title="Error"
          />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Payment success screen
  if (paymentSuccess) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            showBackButton
            backTo="/applicant/dashboard"
            title="Payment Successful"
          />

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
                  Your case has been updated and payment processed.
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
                  onClick={() => navigate(`/case-details/${caseId}`)}
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          showBackButton
          backTo={`/case-details/${caseId}`}
          title={
            showSignature
              ? "Sign Your Application"
              : showPayment
                ? "Complete Payment"
                : "Edit Case"
          }
          subtitle={
            showSignature
              ? "Sign your application forms"
              : showPayment
                ? "Complete payment to submit your case"
                : caseData?.status === "submitted"
                  ? `Update details for case ${caseId.substring(0, 8).toUpperCase()} (Already Submitted)`
                  : `Modify details for case ${caseId.substring(0, 8).toUpperCase()}`
          }
        />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Edit Form */}
        {!showSignature && !showPayment && (
          <>
            {caseData?.status === "submitted" ? (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Update Submitted Case:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    <li>You can update the Case Details below</li>
                    <li>No additional payment is required</li>
                    <li>Click "Save Changes" to update the case</li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Two Options:</strong>
                  <ul className="mt-2 ml-4 list-disc">
                    <li>
                      <strong>Save as Draft:</strong> Update your case
                      information without payment
                    </li>
                    <li>
                      <strong>Submit Case:</strong> Complete payment (£108) and
                      submit your case for review
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <CaseForm
              mode="edit"
              initialData={caseData}
              onSubmit={
                caseData?.status === "submitted"
                  ? handleSaveDraft
                  : handleSubmitWithPayment
              }
              onSaveDraft={
                caseData?.status === "submitted" ? null : handleSaveDraft
              }
              loading={saving}
              submitButtonText={
                caseData?.status === "submitted"
                  ? "Save Changes"
                  : "Submit with Payment"
              }
            />
          </>
        )}

        {/* Step 2: Signature */}
        {showSignature && (
          <ApplicantSignatureStep
            onContinue={handleSignatureComplete}
            onBack={handleBackToForm}
            existingSignature={signatureData}
            loading={saving}
          />
        )}

        {/* Step 3: Payment */}
        {showPayment && clientSecret && formData && (
          <div className="space-y-4">
            <button
              onClick={() => navigate("/applicant/dashboard")}
              className="text-blue-600 hover:underline text-sm mb-4"
            >
              ← Back to case details
            </button>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                amount={parseFloat(formData.judgmentAmount)}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                clientSecret={clientSecret}
                formData={formData}
              />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditCaseForm;
