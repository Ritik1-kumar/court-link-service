// src/pages/auth/ResetPasswordForm.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
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
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import {
  validatePassword,
  PasswordStrengthIndicator,
} from "../../utils/passwordValidator.jsx";

// ─── ResetPasswordForm ────────────────────────────────────────────────────────

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const {
    updatePassword,
    resetPassword,
    recoverySession,
    clearRecoverySession,
  } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    let timeoutId;
    let attempts = 0;
    const maxAttempts = 6;

    const check = async () => {
      if (recoverySession) {
        setIsValidLink(true);
        setError("");
        setCheckingLink(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setIsValidLink(true);
          setError("");
          setCheckingLink(false);
          return;
        }
      } catch (err) {
        console.error("Error checking session:", err);
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.error("Max attempts reached, token appears invalid or expired");
        setIsValidLink(false);
        setError(
          "Invalid or expired reset link. The link may have expired or already been used. Please request a new password reset.",
        );
        setCheckingLink(false);
        return;
      }

      const delay = attempts * 800;
      timeoutId = setTimeout(check, delay);
    };

    check();
    return () => clearTimeout(timeoutId);
  }, [recoverySession]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields");
      return;
    }

    // ── Password strength check ──────────────────────────────────────────────
    const { valid: passwordValid, errors: passwordErrors } =
      validatePassword(newPassword);
    if (!passwordValid) {
      setError(
        `Password must include: ${passwordErrors.join(", ").toLowerCase()}.`,
      );
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await updatePassword(newPassword);

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        clearRecoverySession();
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetLink = async (e) => {
    e.preventDefault();

    if (!resendEmail) {
      setError("Please enter your email address");
      return;
    }

    setResendLoading(true);
    setError("");
    setResendMessage("");

    try {
      const { error } = await resetPassword(resendEmail);

      if (error) {
        setError(error.message);
      } else {
        setResendMessage(
          "Password reset link sent to your email! Please check your inbox.",
        );
        setResendEmail("");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Password updated successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Invalid link ──────────────────────────────────────────────────────────
  if (!isValidLink && !checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              The password reset link is invalid or has expired. Request a new
              one below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {resendMessage && (
              <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{resendMessage}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleResendResetLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resendEmail">Email Address</Label>
                <Input
                  id="resendEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={resendLoading}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={resendLoading || !resendEmail.trim()}
              >
                <Mail className="mr-2 h-4 w-4" />
                {resendLoading ? "Sending..." : "Resend Reset Link"}
              </Button>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Reset form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min. 8 characters with mixed case, numbers & symbols"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
