// src/components/admin/AddUserModal.jsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, UserPlus, Mail } from "lucide-react";
import { inviteUser } from "@/lib/adminApi";
import { useAuth } from "@/context/AuthContext";

const AddUserModal = ({ open, onClose, onUserAdded }) => {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "applicant",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roles = [
    { value: "applicant", label: "Applicant" },
    { value: "admin", label: "Admin" },
    { value: "hceo", label: "HCEO" },
    { value: "accounts", label: "Accounts" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Get the site URL from environment or window location
      const siteUrl = import.meta.env.CLIENT_URL || window.location.origin;
      const redirectTo = `${siteUrl}/set-password`;

      // Invite user using admin client
      const inviteData = await inviteUser({
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        redirectTo: redirectTo,
      });

      setSuccess(
        `Invitation sent successfully to ${formData.email}. The user will receive an email to set their password.`,
      );

      // Wait a moment to show success message
      setTimeout(() => {
        // Refresh user list
        if (onUserAdded) {
          onUserAdded();
        }

        // Reset form
        setFormData({
          fullName: "",
          email: "",
          role: "applicant",
        });

        // Close modal after a delay
        setTimeout(() => {
          onClose();
          setSuccess("");
        }, 2000);
      }, 1500);
    } catch (err) {
      console.error("Error inviting user:", err);

      // Handle specific error cases
      if (err.message?.includes("already registered")) {
        setError("A user with this email already exists.");
      } else if (err.message?.includes("rate limit")) {
        setError("Too many invite requests. Please try again later.");
      } else {
        setError(err.message || "Failed to invite user. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        fullName: "",
        email: "",
        role: "applicant",
      });
      setError("");
      setSuccess("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to create a new user account. The user will
            set their own password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <Mail className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500">
              An invitation email will be sent to this address
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleChange("role", value)}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || success}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Invitation...
                </>
              ) : success ? (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Invitation Sent
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
