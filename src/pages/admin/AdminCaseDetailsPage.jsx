// src/pages/admin/AdminCaseDetailsPage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Mail,
  Shield,
  FilePlus,
  FileDown,
  FileCheck,
  Upload,
  X,
} from "lucide-react";
import {
  generateCompanyCaseId,
  formatDateTime,
  formatDate,
  deleteCaseFromDatabase,
  updateCaseHCEO,
  getStatusLabel,
  viewDocumentInBrowser,
} from "../../lib/caseUtils";
import { generateCaseDetailsPDF } from "../../lib/pdfUtils";
import PaymentsReceivedSection from "@/components/PaymentsReceivedSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { generateForm53PDF, generateN293APDF } from "@/lib/formGenerate";
import PaymentInformationCard from "@/components/PaymentInformationCard";
import CaseInformationCard from "@/components/CaseInformationCard";
import DocumentList from "@/components/DocumentList";
import HceoModal from "@/components/admin/HceoModal";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import CaseHistory from "@/components/CaseHistory";
import { addCaseHistory } from "@/lib/caseHistory";
import EditCaseModal from "@/components/applicant/EditCaseModal";
import AdminActionModal from "@/components/admin/AdminActionModal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Info Item Component
const InfoItem = ({ icon: Icon, label, value, iconColor }) => (
  <div className="flex items-start space-x-3">
    <Icon className={`w-5 h-5 ${iconColor} mt-1 flex-shrink-0`} />
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="text-gray-900">{value}</div>
    </div>
  </div>
);

const AdminCaseDetailsPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdminActionModal, setShowAdminActionModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState({
    n293a: false,
    form53: false,
  });
  const [showHceoModal, setShowHceoModal] = useState(false);
  const [selectedHceo, setSelectedHceo] = useState("");
  const [hceoLoading, setHceoLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    caseData: null,
  });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [sealedWritFiles, setSealedWritFiles] = useState([]);
  const [uploadingSealedWrit, setUploadingSealedWrit] = useState(false);

  useEffect(() => {
    const fetchCaseDetails = async () => {
      if (!user?.id || !caseId) return;

      try {
        setLoading(true);
        setError("");

        const { data: caseResult, error: caseError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("id", caseId)
          .single();

        if (caseError) throw caseError;
        if (!caseResult) throw new Error("Case not found");

        setSelectedHceo(caseResult.hceo_choice || "");

        if (caseResult.user_id) {
          const { data: profileResult, error: profileError } = await supabase
            .from("profiles_public")
            .select("id, email, created_at, full_name, company_name")
            .eq("id", caseResult.user_id)
            .single();

          if (!profileError && profileResult) {
            setUserProfile(profileResult);
            setCaseData({ ...caseResult, user_profile: profileResult });
          } else {
            setCaseData(caseResult);
          }
        } else {
          setCaseData(caseResult);
        }
      } catch (err) {
        console.error("Error fetching admin case details:", err);
        setError(err.message || "Failed to load case details");
      } finally {
        setLoading(false);
      }
    };

    fetchCaseDetails();
  }, [caseId, user?.id]);

  const handleViewAllDocuments = async () => {
    if (
      !caseData.judgment_file_paths ||
      caseData.judgment_file_paths.length === 0
    ) {
      setError("No documents available to view");
      return;
    }

    try {
      for (const filePath of caseData.judgment_file_paths) {
        await viewDocumentInBrowser(filePath);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (err) {
      setError(`Error viewing documents: ${err.message}`);
    }
  };

  const handleDownloadCaseDetailsPDF = async () => {
    try {
      await generateCaseDetailsPDF(caseData, "admin", { userProfile });
    } catch (err) {
      console.error("Error generating case details PDF:", err);
      setError(`Failed to generate PDF: ${err.message}`);
    }
  };

  const handleAdminAction = async (actionData) => {
    if (!caseData) return;

    try {
      setActionLoading(true);
      const oldStatus = caseData.status;

      const updateData = {
        status: actionData.status,
        updated_at: new Date().toISOString(),
      };

      if (actionData.adminNote) {
        updateData.admin_note = actionData.adminNote;
      }
      if (actionData.returnReason) {
        updateData.returned_reason = actionData.returnReason;
      }
      if (actionData.status === "approved") {
        updateData.court_notified_date = new Date().toISOString();

        if (caseData.hceo_choice && !caseData.assigned_user_email) {
          const { data: hceoProfile, error: hceoError } = await supabase
            .from("profiles_public")
            .select("id, full_name, email")
            .eq("role", "hceo")
            .ilike("full_name", caseData.hceo_choice)
            .single();

          if (!hceoError && hceoProfile) {
            updateData.assigned_user_name = hceoProfile.full_name;
            updateData.assigned_user_email = hceoProfile.email;
          } else {
            console.warn(
              "⚠️ Could not find HCEO profile for:",
              caseData.hceo_choice,
            );
          }
        }
      }

      const { data, error } = await supabase
        .from("case_submissions")
        .update(updateData)
        .eq("id", caseData.id)
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles_public")
        .select("email, full_name, role")
        .eq("id", user.id)
        .single();

      let actionDescription = "";
      let actionType = "status_change";

      switch (actionData.actionType) {
        case "approve":
          actionDescription = "Case approved and sent to court";
          actionType = "case_approved";
          break;
        case "approve_with_note":
          actionDescription = `Case approved with admin note: "${actionData.adminNote}"`;
          actionType = "case_approved_with_note";
          break;
        case "return":
          actionDescription = `Case returned to applicant. Reason: "${actionData.returnReason}"`;
          actionType = "case_returned";
          break;
      }

      await addCaseHistory({
        caseId: data.id,
        userId: user.id,
        userEmail: profile?.email || user.email,
        userName: profile?.full_name || "Admin",
        userRole: profile?.role || "admin",
        actionType: actionType,
        actionDescription: actionDescription,
        oldValue: getStatusLabel(oldStatus),
        newValue: getStatusLabel(actionData.status),
        metadata: {
          admin_note: actionData.adminNote || null,
          return_reason: actionData.returnReason || null,
        },
      });

      setCaseData(data);
      setHistoryRefresh((prev) => prev + 1);
    } catch (err) {
      console.error("Error processing admin action:", err);
      setError(`Failed to process action: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const uploadSealedWritToSupabase = async (files, caseId) => {
    const uploadedPaths = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `sealed-writs/${caseId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("judgment-documents")
        .upload(fileName, file);

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      uploadedPaths.push(data.path);
    }

    return uploadedPaths;
  };

  const handleSealedWritUpload = async () => {
    if (!sealedWritFiles || sealedWritFiles.length === 0) {
      setError("Please select sealed writ document(s) to upload");
      return;
    }

    if (!caseData || !user) {
      setError("Case data or user information is missing");
      return;
    }

    try {
      setUploadingSealedWrit(true);
      setError("");

      const uploadedPaths = await uploadSealedWritToSupabase(
        sealedWritFiles,
        caseData.id,
      );

      const existingFiles = caseData.sealed_writ_file_paths || [];
      const allFiles = [...existingFiles, ...uploadedPaths];

      const { data, error } = await supabase
        .from("case_submissions")
        .update({
          sealed_writ_file_paths: allFiles,
          status: "writ_received",
          writ_received_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseData.id)
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles_public")
        .select("email, full_name, role")
        .eq("id", user.id)
        .single();

      await addCaseHistory({
        caseId: data.id,
        userId: user.id,
        userEmail: profile?.email || user.email,
        userName: profile?.full_name || "Admin",
        userRole: profile?.role || "admin",
        actionType: "writ_received",
        actionDescription: `Sealed writ uploaded from court - ${uploadedPaths.length} document(s)`,
        oldValue: getStatusLabel(caseData.status),
        newValue: "Writ Received",
        metadata: {
          file_count: uploadedPaths.length,
          file_names: sealedWritFiles.map((f) => f.name),
        },
      });

      setCaseData(data);
      setSealedWritFiles([]);
      setHistoryRefresh((prev) => prev + 1);

      alert(
        `Successfully uploaded sealed writ and status changed to "Writ Received"`,
      );
    } catch (err) {
      console.error("Error uploading sealed writ:", err);
      setError(`Failed to upload sealed writ: ${err.message}`);
    } finally {
      setUploadingSealedWrit(false);
    }
  };

  const handleSealedWritFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSealedWritFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveSealedWritFile = (index) => {
    setSealedWritFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleHceoUpdate = async (hceoOption) => {
    try {
      setHceoLoading(true);

      const newHceoName = hceoOption.name;

      const updatedCase = await updateCaseHCEO(caseData.id, newHceoName);

      setCaseData(updatedCase);
      setShowHceoModal(false);
      setSelectedHceo(newHceoName);

      setHistoryRefresh((prev) => prev + 1);
    } catch (err) {
      console.error("Error updating HCEO:", err);
      setError(`Failed to update HCEO: ${err.message}`);
    } finally {
      setHceoLoading(false);
    }
  };

  const handleEditCase = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = (updatedCase) => {
    setCaseData(updatedCase);
    setHistoryRefresh((prev) => prev + 1);
    alert("Case details updated successfully!");
  };

  const handleDeleteCase = () => {
    setDeleteDialog({
      isOpen: true,
      caseData: caseData,
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteCaseFromDatabase(
        caseData.id,
        user,
        caseData.judgment_file_paths,
        true,
      );
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Error deleting case:", err);
      setError(`Failed to delete case: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDialog = () => {
    setDeleteDialog({ isOpen: false, caseData: null });
  };

  if (loading) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <LoadingSpinner message="Loading case details..." />
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader showBackButton backTo="/admin/dashboard" title="Error" />
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6 bg-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            showBackButton
            backTo="/admin/dashboard"
            title="Case Not Found"
            subtitle="The requested case could not be found."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          showBackButton
          backTo="/admin/dashboard"
          title={
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-red-600" />
              <span>
                Case:{" "}
                {generateCompanyCaseId(caseData.id, userProfile?.company_name)}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                ADMIN VIEW
              </span>
            </div>
          }
          subtitle={`Submitted on ${formatDateTime(caseData.created_at)}`}
        />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError("")}
              className="ml-auto"
            >
              ×
            </Button>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile */}
            {userProfile && (
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem
                      icon={Mail}
                      label="Email"
                      value={userProfile.email}
                      iconColor="text-blue-600"
                    />
                    <InfoItem
                      icon={User}
                      label="Full Name"
                      value={userProfile.full_name || "Not provided"}
                      iconColor="text-green-600"
                    />
                    <InfoItem
                      icon={Calendar}
                      label="User Since"
                      value={formatDate(userProfile.created_at)}
                      iconColor="text-purple-600"
                    />
                    <InfoItem
                      icon={Shield}
                      label="User ID"
                      value={
                        <span className="font-mono text-sm">
                          {userProfile.id}
                        </span>
                      }
                      iconColor="text-red-600"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Case Details */}
            <CaseInformationCard caseData={caseData} />

            {/* Read-only Payments Section for Admins */}
            <PaymentsReceivedSection
              caseData={caseData}
              isEditable={false}
              onHistoryRefresh={() => setHistoryRefresh((prev) => prev + 1)}
            />

            {/* Payment Summary */}
            {(caseData.payment_amount || caseData.service_fee) && (
              <PaymentInformationCard caseData={caseData} />
            )}

            {/* Judgment Documents */}
            {caseData.judgment_file_paths &&
              caseData.judgment_file_paths.length > 0 && (
                <DocumentList
                  documents={caseData.judgment_file_paths}
                  title="Judgment Documents"
                  caseId={caseData.id}
                />
              )}

            {/* HCEO Documents */}
            {caseData.hceo_file_paths &&
              caseData.hceo_file_paths.length > 0 && (
                <DocumentList
                  documents={caseData.hceo_file_paths}
                  title="HCEO Documents"
                  caseId={caseData.id}
                  variant="hceo"
                />
              )}

            {/* Sealed Writ Upload Section - Only show when status is "approved" */}
            {caseData.status === "approved" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                    <span>Upload Sealed Writ from Court</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sealed-writ-upload">
                      Select Sealed Writ Document(s)
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <Input
                        id="sealed-writ-upload"
                        type="file"
                        onChange={handleSealedWritFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB
                      each)
                    </p>
                  </div>

                  {sealedWritFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        Selected files ({sealedWritFiles.length}):
                      </p>
                      {sealedWritFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                        >
                          <span className="text-sm text-gray-700 truncate flex-1">
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSealedWritFile(index)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleSealedWritUpload}
                    disabled={
                      uploadingSealedWrit || sealedWritFiles.length === 0
                    }
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingSealedWrit
                      ? "Uploading..."
                      : "Upload Sealed Writ"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Display Sealed Writ Documents if they exist */}
            {caseData.sealed_writ_file_paths &&
              caseData.sealed_writ_file_paths.length > 0 && (
                <DocumentList
                  documents={caseData.sealed_writ_file_paths}
                  title="Sealed Writ from Court"
                  caseId={caseData.id}
                  variant="sealed-writ"
                />
              )}

            <CaseHistory caseId={caseData.id} refreshTrigger={historyRefresh} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Case Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(caseData.updated_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">HCEO Organization:</span>
                  <span className="font-medium text-gray-900">
                    {caseData.organization}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">HCEO Officer:</span>
                  <span className="font-medium text-gray-900">
                    {caseData.assigned_user_name}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* HCEO Management */}
            <Card>
              <CardHeader>
                <CardTitle>HCEO Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Current HCEO:
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {caseData.hceo_choice || "Not assigned"}
                  </p>
                </div>

                <Button
                  onClick={() => setShowHceoModal(true)}
                  className="w-full"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {caseData.hceo_choice ? "Change HCEO" : "Assign HCEO"}
                </Button>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Select appropriate HCEO for enforcement</p>
                  <p>• Changes will update legal forms</p>
                  <p>• Notify HCEO of assignment changes</p>
                </div>
              </CardContent>
            </Card>

            {/* PDF Form Generation */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Legal Forms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => {
                    if (!caseData.applicant_signature) {
                      setError(
                        "Applicant signature not found. The applicant must sign during case submission before forms can be generated.",
                      );
                      return;
                    }
                    setPdfGenerating((prev) => ({ ...prev, n293a: true }));
                    generateN293APDF(
                      caseData,
                      null,
                      setError,
                      (isGenerating) => {
                        setPdfGenerating((prev) => ({
                          ...prev,
                          n293a: isGenerating,
                        }));
                      },
                    );
                  }}
                  disabled={
                    pdfGenerating.n293a || !caseData.applicant_signature
                  }
                  className="w-full"
                >
                  <FilePlus className="w-4 h-4 mr-2" />
                  {pdfGenerating.n293a
                    ? "Generating..."
                    : "Generate N293A Form"}
                </Button>
                <Button
                  onClick={() => {
                    if (!caseData.applicant_signature) {
                      setError(
                        "Applicant signature not found. The applicant must sign during case submission before forms can be generated.",
                      );
                      return;
                    }
                    setPdfGenerating((prev) => ({ ...prev, form53: true }));
                    generateForm53PDF(
                      caseData,
                      null,
                      setError,
                      (isGenerating) => {
                        setPdfGenerating((prev) => ({
                          ...prev,
                          form53: isGenerating,
                        }));
                      },
                    );
                  }}
                  disabled={
                    pdfGenerating.form53 || !caseData.applicant_signature
                  }
                  variant="secondary"
                  className="w-full"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {pdfGenerating.form53 ? "Generating..." : "Generate Form 53"}
                </Button>

                {caseData.applicant_signature && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800 font-medium">
                      ✓ Applicant signature available
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Forms will be generated with the applicant's signature
                      from case submission
                    </p>
                  </div>
                )}

                {!caseData.applicant_signature && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800 font-medium">
                      ⚠ No applicant signature
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      The applicant must sign during case submission. Forms
                      cannot be generated without their signature.
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• N293A: Third Party Debt Order</p>
                  <p>• Form 53: Warrant of Control</p>
                  <p>• Forms include current HCEO assignment</p>
                  <p>• Uses applicant's signature from submission</p>
                </div>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["draft", "submitted", "returned"].includes(
                  caseData.status,
                ) && (
                  <Button
                    onClick={handleEditCase}
                    variant="outline"
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Case Details
                  </Button>
                )}

                {caseData.status === "submitted" && (
                  <>
                    <Button
                      onClick={() => setShowAdminActionModal(true)}
                      disabled={actionLoading}
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Case
                    </Button>
                    <div className="text-xs text-gray-500 p-3 bg-blue-50 rounded">
                      <p>
                        <strong>Next Step:</strong> Review and choose action:
                      </p>
                      <p>• Approve - Send to court</p>
                      <p>• Approve with Note - Send with explanation</p>
                      <p>• Return - Send back to applicant</p>
                    </div>
                  </>
                )}

                {caseData.status === "returned" && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800 font-medium">
                      Status: Returned to Applicant
                    </p>
                    <p className="text-xs text-orange-600 mt-2">
                      <strong>Reason:</strong> {caseData.returned_reason}
                    </p>
                    <p className="text-xs text-orange-600 mt-2">
                      Waiting for applicant to resubmit with corrections
                    </p>
                  </div>
                )}

                {caseData.status === "approved" && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800 font-medium">
                      Status: Approved
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Court notified on{" "}
                      {formatDateTime(caseData.court_notified_date)}
                    </p>
                    {caseData.admin_note && (
                      <p className="text-xs text-green-600 mt-2">
                        <strong>Note to Court:</strong> {caseData.admin_note}
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      📄 Upload sealed writ below to automatically update status
                    </p>
                  </div>
                )}

                {caseData.status === "writ_received" && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-sm text-purple-800 font-medium">
                      Status: Writ Received
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Received on {formatDate(caseData.writ_received_date)}
                    </p>
                    <p className="text-xs text-purple-600 mt-2">
                      HCEO notified and ready for enforcement
                    </p>
                  </div>
                )}

                {caseData.status === "hceo_completed" && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded">
                    <p className="text-sm text-teal-800 font-medium">
                      Status: HCEO Completed
                    </p>
                    <p className="text-xs text-teal-600 mt-1">
                      Enforcement completed by HCEO
                    </p>
                  </div>
                )}

                {caseData.status === "closed" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-sm text-slate-800 font-medium">
                      Status: Closed
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Case is now closed
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleDownloadCaseDetailsPDF}
                  variant="outline"
                  className="w-full"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  View Case Report
                </Button>

                <Button
                  onClick={handleDeleteCase}
                  disabled={deleting}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete Case"}
                </Button>
              </CardContent>
            </Card>

            {/* Case Status Flow */}
            <Card>
              <CardHeader>
                <CardTitle>Case Status Flow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Draft → Applicant saves without payment
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Submitted → Applicant pays & submits
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Approved by Admin → Admin approves
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Completed by Admin → Documents sent
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                  <span className="text-gray-700">
                    Completed by HCEO → Enforcement done
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-3 p-3 bg-gray-50 rounded">
                  <p>
                    <strong>Process:</strong>
                  </p>
                  <p>1. Review submitted cases</p>
                  <p>2. Approve valid cases</p>
                  <p>3. Generate legal forms (N293A, Form 53)</p>
                  <p>4. Mark completed when sent to HCEO</p>
                  <p>5. HCEO confirms final completion</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* HCEO Modal */}
        <HceoModal
          isOpen={showHceoModal}
          onClose={() => setShowHceoModal(false)}
          currentHceo={caseData?.hceo_choice}
          onUpdate={handleHceoUpdate}
          hideRandomAssignment={true}
          hideSelectHceo={true}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          isOpen={deleteDialog.isOpen}
          onClose={handleCloseDialog}
          onConfirm={handleConfirmDelete}
          caseName={caseData?.defendant_name || ""}
        />

        <AdminActionModal
          isOpen={showAdminActionModal}
          onClose={() => setShowAdminActionModal(false)}
          onAction={handleAdminAction}
          caseData={caseData}
        />

        {/* Edit Case Modal */}
        <EditCaseModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          caseData={caseData}
          onSuccess={handleEditSuccess}
        />
      </div>
    </div>
  );
};

export default AdminCaseDetailsPage;
