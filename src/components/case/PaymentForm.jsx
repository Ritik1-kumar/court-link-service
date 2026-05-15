// src/components/case/PaymentForm.jsx
import React, { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import {
  formatAmount,
  CARD_NUMBER_ELEMENT_OPTIONS,
  CARD_EXPIRY_ELEMENT_OPTIONS,
  CARD_CVC_ELEMENT_OPTIONS,
  calculateFees,
} from "@/lib/caseUtils";
import { Checkbox } from "@radix-ui/react-checkbox";

const PaymentForm = ({
  amount,
  serviceFee,
  totalAmount,
  onPaymentSuccess,
  onPaymentError,
  clientSecret,
  formData,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [postCode, setPostCode] = useState("");
  const [postCodeError, setPostCodeError] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  // Calculate actual fees
  const fees = calculateFees();

  // UK postcode validation regex
  const validatePostCode = (code) => {
    const ukPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
    return ukPostcodeRegex.test(code.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate postcode
    if (!postCode.trim()) {
      setPostCodeError("Post code is required");
      return;
    }

    if (!validatePostCode(postCode)) {
      setPostCodeError("Please enter a valid UK post code (e.g., HG4 1BY)");
      return;
    }

    setProcessing(true);
    setError("");
    setPostCodeError("");

    try {
      const cardNumberElement = elements.getElement(CardNumberElement);

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: formData.claimantName,
              address: {
                postal_code: postCode.trim().toUpperCase(),
              },
            },
          },
        });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent.status === "succeeded") {
        setSuccess(true);
        onPaymentSuccess(paymentIntent.id);
      }
    } catch (err) {
      console.error("Payment error:", err);
      setError(err.message || "Payment failed. Please try again.");
      onPaymentError(err);
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Payment Successful!
              </h3>
              <p className="text-gray-600">
                Your case has been submitted successfully.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Court Fee:</span>
            <span className="font-medium">{formatAmount(fees.courtFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service Fee:</span>
            <span className="font-medium">{formatAmount(fees.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">VAT (20% on service fee):</span>
            <span className="font-medium">{formatAmount(fees.vat)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="text-lg font-semibold">Total Amount:</span>
            <span className="text-lg font-bold text-blue-600">
              {formatAmount(fees.totalFees)}
            </span>
          </div>
          <Alert className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Fixed fee structure: £66 court fee + £35 service fee + £7 VAT =
              £108 total
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Card Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Card Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Number */}
          <div>
            <Label
              htmlFor="cardNumber"
              className="text-sm font-medium mb-2 block"
            >
              Card Number
            </Label>
            <div className="p-3 border rounded-lg bg-gray-50">
              <CardNumberElement
                id="cardNumber"
                options={CARD_NUMBER_ELEMENT_OPTIONS}
              />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="cardExpiry"
                className="text-sm font-medium mb-2 block"
              >
                Expiry Date
              </Label>
              <div className="p-3 border rounded-lg bg-gray-50">
                <CardExpiryElement
                  id="cardExpiry"
                  options={CARD_EXPIRY_ELEMENT_OPTIONS}
                />
              </div>
            </div>
            <div>
              <Label
                htmlFor="cardCvc"
                className="text-sm font-medium mb-2 block"
              >
                CVC
              </Label>
              <div className="p-3 border rounded-lg bg-gray-50">
                <CardCvcElement
                  id="cardCvc"
                  options={CARD_CVC_ELEMENT_OPTIONS}
                />
              </div>
            </div>
          </div>

          {/* Post Code */}
          <div>
            <Label
              htmlFor="postCode"
              className="text-sm font-medium mb-2 block"
            >
              Post Code
            </Label>
            <Input
              id="postCode"
              type="text"
              placeholder="e.g., HG4 1BY"
              value={postCode}
              onChange={(e) => {
                setPostCode(e.target.value);
                setPostCodeError("");
              }}
              className={postCodeError ? "border-red-500" : ""}
            />
            {postCodeError && (
              <p className="text-sm text-red-600 mt-1">{postCodeError}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Your payment is secure and encrypted
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Checkbox */}
      <Card>
        <CardContent className="flex gap-2 p-4">
          <input
            type="checkbox"
            id="confirmationCheck"
            checked={confirmationChecked}
            onChange={(e) => setConfirmationChecked(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 flex-shrink-0 mt-1 cursor-pointer"
          />
          <label
            htmlFor="confirmationCheck"
            className="text-sm font-normal cursor-pointer"
          >
            I confirm that all information entered matches my judgment document
            exactly. I understand that errors may result in rejection by the
            court.
            <span className="text-red-500 ml-1">*</span>
          </label>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || processing || !confirmationChecked}
        size="lg"
      >
        {processing ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Processing Payment...
          </>
        ) : (
          `Pay ${formatAmount(fees.totalFees)}`
        )}
      </Button>

      {/* Security Notice */}
      <p className="text-xs text-center text-gray-500">
        By completing this payment, you agree to our terms and conditions.
        <br />
        Payments are processed securely by Stripe.
      </p>
    </form>
  );
};

export default PaymentForm;
