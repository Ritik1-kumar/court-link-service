// src/pages/auth/LoginForm.jsx
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
import { AlertCircle } from "lucide-react";

export default function LoginForm() {
  const navigate = useNavigate();
  const { signIn, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (loading || authLoading) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        let errorMessage = "Login failed";

        if (typeof signInError === "string") {
          errorMessage = signInError;
        } else if (signInError?.message) {
          errorMessage = signInError.message;
        }

        if (errorMessage.toLowerCase().includes("invalid login credentials")) {
          errorMessage =
            "Invalid email or password. Please check your credentials.";
        }

        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data?.user) {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const isSubmitDisabled =
    loading || authLoading || !email.trim() || !password.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Welcome back! Please sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || authLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || authLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitDisabled}
            >
              {loading || authLoading ? "Signing In..." : "Sign In"}
            </Button>

            <div className="space-y-2 text-center text-sm">
              <Link
                to="/forgot-password"
                className="text-blue-600 hover:text-blue-700 block"
              >
                Forgot your password?
              </Link>
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
