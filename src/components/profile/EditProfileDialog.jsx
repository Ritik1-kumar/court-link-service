// src/components/profile/EditProfileDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Edit2, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const EditProfileDialog = () => {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    sortCode: "",
  });

  // Initialize form data when dialog opens OR profile changes
  useEffect(() => {
    if (open && profile) {
      setFormData({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        bankName: profile.bank_details?.bankName || "",
        accountHolderName: profile.bank_details?.accountHolderName || "",
        accountNumber: profile.bank_details?.accountNumber || "",
        sortCode: profile.bank_details?.sortCode || "",
      });
      setError("");
      setSuccess(false);
    }
  }, [open, profile]);

  // Refresh profile when dialog closes
  useEffect(() => {
    if (!open && refreshProfile) {
      refreshProfile();
    }
  }, [open, refreshProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Prepare bank details object
      const bankDetails = {
        bankName: formData.bankName.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        accountNumber: formData.accountNumber.trim(),
        sortCode: formData.sortCode.trim(),
      };

      // Only include bank_details if at least one field is filled
      const updateData = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim(),
        updated_at: new Date().toISOString(),
      };

      // Add bank_details only if any bank field has data
      if (
        bankDetails.bankName ||
        bankDetails.accountHolderName ||
        bankDetails.accountNumber ||
        bankDetails.sortCode
      ) {
        updateData.bank_details = bankDetails;
      }

      // Use the updateProfile method from AuthContext
      const { error: updateError } = await updateProfile(updateData);

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Personal Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700">
                Bank Details (Optional)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  placeholder="e.g., Barclays, HSBC"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleInputChange}
                  placeholder="Name on the account"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="12345678"
                    maxLength="8"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sortCode">Sort Code</Label>
                  <Input
                    id="sortCode"
                    name="sortCode"
                    value={formData.sortCode}
                    onChange={handleInputChange}
                    placeholder="12-34-56"
                    maxLength="8"
                  />
                </div>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Profile updated successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
