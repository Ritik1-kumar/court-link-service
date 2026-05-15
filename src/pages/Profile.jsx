// src/pages/Profile.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import EditProfileDialog from "../components/profile/EditProfileDialog";
import DigitalSignatureModal from "../components/admin/DigitalSignatureModal";
import PageHeader from "@/components/PageHeader";
import { FileText, Pen } from "lucide-react";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);

  const handleSignatureSave = async (signatureData) => {
    setSavingSignature(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ signature: signatureData })
        .eq("id", user.id);

      if (error) throw error;

      // Refresh profile to show updated signature
      await refreshProfile();
      setShowSignatureModal(false);
    } catch (error) {
      console.error("Error saving signature:", error);
      alert("Failed to save signature. Please try again.");
    } finally {
      setSavingSignature(false);
    }
  };

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="pt-22 pl-12  max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-800">Profile</h1>
          <EditProfileDialog />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-600">Email</Label>
                <p className="font-medium">{user?.email || "N/A"}</p>
              </div>

              <div>
                <Label className="text-gray-600">Full Name</Label>
                <p className="font-medium">{profile?.full_name || "N/A"}</p>
              </div>

              <div>
                <Label className="text-gray-600">Phone</Label>
                <p className="font-medium">{profile?.phone || "N/A"}</p>
              </div>

              <div>
                <Label className="text-gray-600">Role</Label>
                <p className="font-medium capitalize">
                  {profile?.role?.replace("_", " ") || "N/A"}
                </p>
              </div>
              {profile?.account_type === "company" && (
                <div>
                  <Label className="text-gray-600">Company Name</Label>
                  <p className="font-medium capitalize">
                    {profile?.company_name?.replace("_", " ") || "N/A"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {profile?.bank_details && (
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>
                  Your registered bank account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-600">Bank Name</Label>
                  <p className="font-medium">
                    {profile.bank_details.bankName || "N/A"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-600">Account Holder</Label>
                  <p className="font-medium">
                    {profile.bank_details.accountHolderName || "N/A"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Account Number</Label>
                    <p className="font-medium">
                      {profile.bank_details.accountNumber || "N/A"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-gray-600">Sort Code</Label>
                    <p className="font-medium">
                      {profile.bank_details.sortCode || "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profile?.role === "applicant" && (
            <Card>
              <CardHeader>
                <CardTitle>Digital Signature</CardTitle>
                <CardDescription>
                  Your signature for legal documents and forms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile?.signature ? (
                  <div className="space-y-3">
                    <Label className="text-gray-600">Current Signature</Label>
                    <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                      <img
                        src={profile.signature}
                        alt="Your signature"
                        className="max-w-full h-auto max-h-32"
                      />
                    </div>
                    <Button
                      onClick={() => setShowSignatureModal(true)}
                      variant="outline"
                      className="w-full"
                      disabled={savingSignature}
                    >
                      <Pen className="w-4 h-4 mr-2" />
                      Edit Signature
                    </Button>
                    <p className="text-xs text-gray-500">
                      This signature will be automatically used when submitting new case applications.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        No signature saved
                      </p>
                    </div>
                    <Button
                      onClick={() => setShowSignatureModal(true)}
                      className="w-full"
                      disabled={savingSignature}
                    >
                      <Pen className="w-4 h-4 mr-2" />
                      Add Signature
                    </Button>
                    <p className="text-xs text-gray-500">
                      Add your signature to automatically use it when submitting cases. You can also sign during case submission.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Digital Signature Modal */}
        <DigitalSignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSignatureSave}
          existingSignature={profile?.signature}
        />
      </div>
    </div>
  );
}
