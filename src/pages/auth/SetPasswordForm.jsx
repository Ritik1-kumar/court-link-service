// src/pages/auth/SetPasswordForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { validatePassword } from "../../utils/passwordValidator.jsx";

// ─── Password strength indicator (mirrors RegisterForm) ───────────────────────

const RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Number", test: (p) => /[0-9]/.test(p) },
  { label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const passed = RULES.filter((r) => r.test(password)).length;
  const pct = (passed / RULES.length) * 100;

  const color =
    passed <= 2
      ? "bg-red-500"
      : passed <= 3
        ? "bg-yellow-500"
        : passed <= 4
          ? "bg-blue-500"
          : "bg-green-500";

  const label =
    passed <= 2
      ? "Weak"
      : passed <= 3
        ? "Fair"
        : passed <= 4
          ? "Good"
          : "Strong";

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span
          className={`text-xs font-medium ${
            passed <= 2
              ? "text-red-600"
              : passed <= 3
                ? "text-yellow-600"
                : passed <= 4
                  ? "text-blue-600"
                  : "text-green-600"
          }`}
        >
          {label}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1 text-xs ${ok ? "text-green-700" : "text-gray-400"}`}
            >
              <span>{ok ? "✓" : "○"}</span>
              <span>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── SetPasswordForm ──────────────────────────────────────────────────────────

export default function SetPasswordForm() {
  const navigate = useNavigate();
  const { clearInviteSession } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userFullName, setUserFullName] = useState("");

  const sessionRef = useRef(null);
  const hasRunRef = useRef(false);
  const resolvedRef = useRef(false);

  // ─── Success: clear invite session, sign out, then redirect ───────────────
  useEffect(() => {
    if (!success) return;

    let cancelled = false;

    const signOutAndRedirect = async () => {
      clearInviteSession();

      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("signOut error (ignored):", err);
      }

      if (!cancelled) {
        navigate("/login", {
          replace: true,
          state: {
            message:
              "Password set successfully! Please sign in with your new password.",
            email: userEmail,
          },
        });
      }
    };

    const timer = setTimeout(signOutAndRedirect, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [success, navigate, userEmail, clearInviteSession]);

  // ─── Check invite session from URL ────────────────────────────────────────
  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    let isMounted = true;
    let authListener;
    const timeoutIds = [];
    const maxAttempts = 5;

    const cleanInviteUrl = () => {
      if (window.location.hash || window.location.search) {
        const url = new URL(window.location.href);
        url.hash = "";
        url.searchParams.delete("code");
        url.searchParams.delete("access_token");
        url.searchParams.delete("refresh_token");
        url.searchParams.delete("type");
        const cleanSearch = url.searchParams.toString();
        window.history.replaceState(
          null,
          "",
          url.pathname + (cleanSearch ? `?${cleanSearch}` : ""),
        );
      }
    };

    const checkInviteSession = async () => {
      try {
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken =
          hashParams.get("access_token") || searchParams.get("access_token");
        const code = searchParams.get("code") || hashParams.get("code");
        const type = hashParams.get("type") || searchParams.get("type");
        const refreshToken =
          hashParams.get("refresh_token") || searchParams.get("refresh_token");
        const hasTokenInUrl = !!accessToken || !!code;
        authListener = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
              if (session?.user && isMounted) {
                sessionRef.current = session;
                resolvedRef.current = true;
                setUserEmail(session.user.email || "");
                setUserFullName(session.user.user_metadata?.full_name || "");
                setIsValidLink(true);
                setError("");
                setCheckingLink(false);
                cleanInviteUrl();
              }
            }
          },
        );

        const {
          data: { session: initialSession },
          error: initialError,
        } = await supabase.auth.getSession();

        if (initialError) console.error("Initial session error:", initialError);

        if (initialSession?.user) {
          sessionRef.current = initialSession;
          resolvedRef.current = true;
          if (isMounted) {
            setUserEmail(initialSession.user.email || "");
            setUserFullName(initialSession.user.user_metadata?.full_name || "");
            setIsValidLink(true);
            setError("");
            setCheckingLink(false);
            cleanInviteUrl();
          }
          return;
        }

        if (code) {
          try {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error(
                "❌ Error exchanging code for session:",
                exchangeError,
              );
            } else if (exchangeData?.session?.user) {
              sessionRef.current = exchangeData.session;
              resolvedRef.current = true;
              if (isMounted) {
                setUserEmail(exchangeData.session.user.email || "");
                setUserFullName(
                  exchangeData.session.user.user_metadata?.full_name || "",
                );
                setIsValidLink(true);
                setError("");
                setCheckingLink(false);
                cleanInviteUrl();
              }
              return;
            }
          } catch (err) {
            console.error("❌ Failed to exchange code for session:", err);
          }
        }

        if (accessToken && refreshToken) {
          try {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (sessionError) {
              console.error("❌ Error setting session manually:", sessionError);
            } else if (sessionData?.session?.user) {
              sessionRef.current = sessionData.session;
              resolvedRef.current = true;
              if (isMounted) {
                setUserEmail(sessionData.session.user.email || "");
                setUserFullName(
                  sessionData.session.user.user_metadata?.full_name || "",
                );
                setIsValidLink(true);
                setError("");
                setCheckingLink(false);
                cleanInviteUrl();
              }
              return;
            }
          } catch (err) {
            console.error("❌ Failed to set session manually:", err);
          }
        }

        if (hasTokenInUrl) {
          const pollForSession = async (attemptNumber) => {
            if (!isMounted) return;

            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();
            if (error) console.error("Error getting session:", error);

            if (session?.user) {
              sessionRef.current = session;
              resolvedRef.current = true;
              if (isMounted) {
                setUserEmail(session.user.email || "");
                setUserFullName(session.user.user_metadata?.full_name || "");
                setIsValidLink(true);
                setError("");
                setCheckingLink(false);
                cleanInviteUrl();
              }
              return;
            }

            if (attemptNumber >= maxAttempts) {
              console.error("❌ Max attempts reached, token appears invalid");
              if (isMounted) {
                resolvedRef.current = true;
                setIsValidLink(false);
                setError(
                  "Invalid or expired invitation link. The link may have expired or already been used. Please contact your administrator.",
                );
                setCheckingLink(false);
              }
              return;
            }

            const delays = [1000, 2000, 3000, 4000];
            const delay = delays[attemptNumber - 1] || 5000;
            const id = setTimeout(
              () => pollForSession(attemptNumber + 1),
              delay,
            );
            timeoutIds.push(id);
          };

          pollForSession(1);
        } else {
          console.error("❌ No token in URL and no existing session");
          if (isMounted) {
            resolvedRef.current = true;
            setIsValidLink(false);
            setError(
              "Invalid or expired invitation link. Please use the link from your invitation email or contact your administrator.",
            );
            setCheckingLink(false);
          }
        }
      } catch (err) {
        console.error("❌ Error checking invite session:", err);
        if (isMounted) {
          resolvedRef.current = true;
          setIsValidLink(false);
          setError(
            "Invalid or expired invitation link. Please contact your administrator.",
          );
          setCheckingLink(false);
        }
      }
    };

    checkInviteSession();

    const safetyTimeout = setTimeout(() => {
      if (isMounted && !resolvedRef.current) {
        console.error("❌ Safety timeout reached - still checking link");
        resolvedRef.current = true;
        setIsValidLink(false);
        setError(
          "Unable to verify invitation link. Please try clicking the link again or contact your administrator.",
        );
        setCheckingLink(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (authListener) authListener.data.subscription.unsubscribe();
      timeoutIds.forEach((id) => clearTimeout(id));
      clearTimeout(safetyTimeout);
    };
  }, []);

  // ─── Handle password form submit ──────────────────────────────────────────
  const handlePasswordSetup = async (e) => {
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
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          sessionError?.message ||
            "Your session has expired. Please click the invitation link again.",
        );
      }

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn(
          "⚠️ Could not refresh session, proceeding anyway:",
          refreshError.message,
        );
      } else {
      }

      await new Promise((resolve, reject) => {
        let settled = false;

        const settle = (fn, value) => {
          if (settled) return;
          settled = true;
          listener?.data?.subscription?.unsubscribe();
          clearTimeout(timer);
          fn(value);
        };

        const listener = supabase.auth.onAuthStateChange((event) => {
          if (event === "USER_UPDATED") {
            settle(resolve, undefined);
          }
        });

        const timer = setTimeout(() => {
          settle(
            reject,
            new Error(
              "Request timed out. Please check your connection and try again.",
            ),
          );
        }, 30000);

        supabase.auth
          .updateUser({ password: newPassword })
          .then(({ error: updateError }) => {
            if (updateError) {
              settle(
                reject,
                new Error(updateError.message || JSON.stringify(updateError)),
              );
            } else {
              settle(resolve, undefined);
            }
          })
          .catch((err) => settle(reject, err));
      });

      setSuccess(true);
    } catch (err) {
      console.error("❌ Error setting password:", err);
      setError(
        err?.message ||
          "An unexpected error occurred. Please try refreshing and clicking the invite link again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert className="bg-green-50 text-green-900 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Password set successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidLink && !checkingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please contact your administrator to request a new invitation.
              </p>
              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set Your Password</CardTitle>
          <CardDescription>
            {userFullName && `Welcome, ${userFullName}! `}
            Create a password for your account
            {userEmail && ` (${userEmail})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password</Label>
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
                placeholder="Confirm your password"
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
              {loading ? (
                "Setting Password..."
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Set Password & Continue
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Already have a password? Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
