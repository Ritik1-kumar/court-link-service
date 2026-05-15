// src/pages/auth/RegisterForm.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { validatePassword } from "../../utils/passwordValidator.jsx";

// ─── Password strength indicator ─────────────────────────────────────────────

const RULES = [
  { label: "8+ characters",          test: (p) => p.length >= 8 },
  { label: "Uppercase letter",        test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter",        test: (p) => /[a-z]/.test(p) },
  { label: "Number",                  test: (p) => /[0-9]/.test(p) },
  { label: "Special character",       test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const passed = RULES.filter((r) => r.test(password)).length;
  const pct    = (passed / RULES.length) * 100;

  const color =
    passed <= 2 ? "bg-red-500" :
    passed <= 3 ? "bg-yellow-500" :
    passed <= 4 ? "bg-blue-500" :
                  "bg-green-500";

  const label =
    passed <= 2 ? "Weak" :
    passed <= 3 ? "Fair" :
    passed <= 4 ? "Good" :
                  "Strong";

  return (
    <div className="space-y-2 mt-1">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          passed <= 2 ? "text-red-600" :
          passed <= 3 ? "text-yellow-600" :
          passed <= 4 ? "text-blue-600" :
                        "text-green-600"
        }`}>
          {label}
        </span>
      </div>

      {/* Rule checklist */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className={`flex items-center gap-1 text-xs ${ok ? "text-green-700" : "text-gray-400"}`}>
              <span>{ok ? "✓" : "○"}</span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

export default function RegisterForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    accountType: "individual",
    companyName: "",
    useDifferentInvoiceEmail: false,
    invoiceEmail: "",
    bankDetails: {
      bankName: "",
      accountNumber: "",
      sortCode: "",
      accountHolderName: "",
    },
    vatReclaim: false,
    termsAccepted: false,
    marketingConsent: false,
    role: "applicant",
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.startsWith("bank.")) {
      const bankField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        bankDetails: { ...prev.bankDetails, [bankField]: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }

    if (!formData.fullName) {
      setError("Full name is required");
      return;
    }

    if (!formData.phone) {
      setError("Phone number is required");
      return;
    }

    if (formData.accountType === "company" && !formData.companyName) {
      setError("Company name is required when registering as a company");
      return;
    }

    // ── Password strength check ──────────────────────────────────────────────
    const { valid: passwordValid, errors: passwordErrors } = validatePassword(formData.password);
    if (!passwordValid) {
      setError(`Password must include: ${passwordErrors.join(", ").toLowerCase()}.`);
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (
      !formData.bankDetails.bankName ||
      !formData.bankDetails.accountHolderName ||
      !formData.bankDetails.accountNumber ||
      !formData.bankDetails.sortCode
    ) {
      setError("All bank details are required");
      return;
    }

    if (formData.useDifferentInvoiceEmail && !formData.invoiceEmail) {
      setError("Please enter an invoice email address or uncheck the option");
      return;
    }

    if (
      formData.useDifferentInvoiceEmail &&
      formData.invoiceEmail &&
      !formData.invoiceEmail.includes("@")
    ) {
      setError("Please enter a valid invoice email address");
      return;
    }

    if (!formData.termsAccepted) {
      setError("You must accept the terms and conditions");
      return;
    }

    setLoading(true);

    try {
      const bankDetailsObject = {
        bankName:          formData.bankDetails.bankName.trim(),
        accountNumber:     formData.bankDetails.accountNumber.trim(),
        sortCode:          formData.bankDetails.sortCode.trim(),
        accountHolderName: formData.bankDetails.accountHolderName.trim(),
      };

      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        {
          fullName:         formData.fullName.trim(),
          phone:            formData.phone.trim(),
          accountType:      formData.accountType,
          companyName:      formData.companyName.trim() || null,
          invoiceEmail:     formData.useDifferentInvoiceEmail ? formData.invoiceEmail.trim() : null,
          bankDetails:      bankDetailsObject,
          vatReclaim:       formData.vatReclaim,
          termsAccepted:    formData.termsAccepted,
          marketingConsent: formData.marketingConsent,
          role:             "applicant",
        }
      );

      if (signUpError) {
        setError(signUpError.message || "Registration failed");
      } else {
        setSuccess("Registration successful! Please check your email to verify your account.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.message || "An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join our authentication system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type */}
            <div className="space-y-2 pb-4 border-b">
              <Label>
                Are you registering as an individual or on behalf of a company? *
              </Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" value="individual"
                    checked={formData.accountType === "individual"}
                    onChange={handleInputChange} className="w-4 h-4" />
                  <span className="text-sm">Individual</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" value="company"
                    checked={formData.accountType === "company"}
                    onChange={handleInputChange} className="w-4 h-4" />
                  <span className="text-sm">Company</span>
                </label>
              </div>
            </div>

            {formData.accountType === "company" && (
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" name="companyName" type="text"
                  placeholder="Enter your company name"
                  value={formData.companyName} onChange={handleInputChange}
                  required={formData.accountType === "company"} />
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" name="fullName" type="text"
                  placeholder="John Doe" value={formData.fullName}
                  onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" name="phone" type="tel"
                  placeholder="+1234567890" value={formData.phone}
                  onChange={handleInputChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email"
                placeholder="john@example.com" value={formData.email}
                onChange={handleInputChange} required />
            </div>

            {/* Password with strength indicator */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password" name="password" type="password"
                placeholder="Min. 8 characters with mixed case, numbers & symbols"
                value={formData.password} onChange={handleInputChange}
                required minLength={8}
              />
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            {/* Invoice Email */}
            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" name="useDifferentInvoiceEmail"
                  checked={formData.useDifferentInvoiceEmail}
                  onChange={handleInputChange} className="mt-1 w-4 h-4" />
                <span className="text-sm font-medium">
                  Would you like invoices sent to a different email address?
                </span>
              </label>
              {formData.useDifferentInvoiceEmail && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="invoiceEmail">Invoice Email Address *</Label>
                  <Input id="invoiceEmail" name="invoiceEmail" type="email"
                    placeholder="invoices@example.com" value={formData.invoiceEmail}
                    onChange={handleInputChange}
                    required={formData.useDifferentInvoiceEmail} />
                  <p className="text-xs text-gray-500">
                    All invoices will be sent to this email address
                  </p>
                </div>
              )}
            </div>

            {/* Bank Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-sm">Bank Details *</h3>
              <p className="text-sm text-gray-500">
                Bank account to receive any recovered funds (not for payment collection)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank.bankName">Bank Name *</Label>
                  <Input id="bank.bankName" name="bank.bankName" type="text"
                    placeholder="Chase Bank" value={formData.bankDetails.bankName}
                    onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank.accountHolderName">Account Holder Name *</Label>
                  <Input id="bank.accountHolderName" name="bank.accountHolderName" type="text"
                    placeholder="John Doe" value={formData.bankDetails.accountHolderName}
                    onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank.accountNumber">Account Number *</Label>
                  <Input id="bank.accountNumber" name="bank.accountNumber" type="text"
                    placeholder="12345678" value={formData.bankDetails.accountNumber}
                    onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank.sortCode">Sort Code *</Label>
                  <Input id="bank.sortCode" name="bank.sortCode" type="text"
                    placeholder="12-34-56" value={formData.bankDetails.sortCode}
                    onChange={handleInputChange} required />
                </div>
              </div>
            </div>

            {/* VAT Reclaim */}
            <div className="space-y-2 pt-4 border-t">
              <Label>VAT Reclaim</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vatReclaim" value="true"
                    checked={formData.vatReclaim === true}
                    onChange={() => setFormData((prev) => ({ ...prev, vatReclaim: true }))}
                    className="w-4 h-4" />
                  <span className="text-sm">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="vatReclaim" value="false"
                    checked={formData.vatReclaim === false}
                    onChange={() => setFormData((prev) => ({ ...prev, vatReclaim: false }))}
                    className="w-4 h-4" />
                  <span className="text-sm">No</span>
                </label>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-4 border-t">
              <label className="flex items-start gap-2">
                <input type="checkbox" name="termsAccepted"
                  checked={formData.termsAccepted} onChange={handleInputChange}
                  required className="mt-1 w-4 h-4" />
                <span className="text-sm">I accept the terms and conditions *</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="marketingConsent"
                  checked={formData.marketingConsent} onChange={handleInputChange}
                  className="mt-1 w-4 h-4" />
                <span className="text-sm">I consent to receiving marketing communications</span>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </form>

          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="my-4 bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}