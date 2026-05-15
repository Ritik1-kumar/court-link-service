// src/components/admin/AdminActionModal.jsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, FileEdit, ArrowLeft, AlertCircle } from "lucide-react";

const AdminActionModal = ({ isOpen, onClose, onAction, caseData }) => {
  const [selectedAction, setSelectedAction] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const actions = [
    {
      id: "approve",
      title: "Approve Case",
      description: "Case is correct, send to court",
      icon: CheckCircle,
      color: "bg-green-100 text-green-800 hover:bg-green-200",
      status: "approved",
    },
    {
      id: "approve_with_note",
      title: "Approve with Note",
      description: "Case needed minor amendment, send with explanation",
      icon: FileEdit,
      color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
      status: "approved",
    },
    {
      id: "return",
      title: "Return to Applicant",
      description: "Cannot proceed, applicant must fix",
      icon: ArrowLeft,
      color: "bg-orange-100 text-orange-800 hover:bg-orange-200",
      status: "returned",
    },
  ];

  const handleSubmit = async () => {
    if (!selectedAction) return;

    // Validation
    if (selectedAction === "approve_with_note" && !adminNote.trim()) {
      setError("Please provide a covering note");
      return;
    }

    if (selectedAction === "return" && !returnReason.trim()) {
      setError("Please provide a reason for returning the case");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const action = actions.find((a) => a.id === selectedAction);
      await onAction({
        actionType: selectedAction,
        status: action.status,
        adminNote: selectedAction === "approve_with_note" ? adminNote : null,
        returnReason: selectedAction === "return" ? returnReason : null,
      });

      // Reset and close
      setSelectedAction(null);
      setAdminNote("");
      setReturnReason("");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to process action");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setAdminNote("");
    setReturnReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Admin Case Action</DialogTitle>
          <DialogDescription>
            Choose an action for case: {caseData?.claimant_name} vs{" "}
            {caseData?.defendant_name}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!selectedAction ? (
          // Action Selection
          <div className="space-y-3">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`w-full p-4 rounded-lg border-2 border-gray-200 ${action.color} transition-all text-left hover:border-gray-400`}
              >
                <div className="flex items-start space-x-3">
                  <action.icon className="w-6 h-6 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg">{action.title}</h3>
                    <p className="text-sm mt-1 opacity-80">
                      {action.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          // Action Details
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Selected Action:</strong>{" "}
                {actions.find((a) => a.id === selectedAction)?.title}
              </AlertDescription>
            </Alert>

            {selectedAction === "approve_with_note" && (
              <div className="space-y-2">
                <Label htmlFor="adminNote">
                  Covering Note for Court{" "}
                  <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Explain any amendments made to the case..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  This note will be included in the court notification email
                </p>
              </div>
            )}

            {selectedAction === "return" && (
              <div className="space-y-2">
                <Label htmlFor="returnReason">
                  Reason for Return <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Explain what needs to be fixed..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-sm text-gray-500">
                  The applicant will receive this reason via email and can
                  resubmit after fixing
                </p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => setSelectedAction(null)}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Action"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdminActionModal;
