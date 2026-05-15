// src/pages/hceo/HceoCaseDetailsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  FileDown,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PaymentsReceivedSection from "@/components/PaymentsReceivedSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CaseInformationCard from "@/components/CaseInformationCard";
import PaymentInformationCard from "@/components/PaymentInformationCard";
import DocumentList from "@/components/DocumentList";
import {
  generateCompanyCaseId,
  formatDateTime,
  getStatusLabel,
} from "@/lib/caseUtils";
import { generateCaseDetailsPDF } from "@/lib/pdfUtils";
import CaseHistory from "@/components/CaseHistory";
import { addCaseHistory } from "@/lib/caseHistory";

// Inline LoadingSpinner
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Upload function for HCEO files
const uploadHCEOFilesToSupabase = async (files, user, caseId) => {
  const uploadedPaths = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `hceo/${caseId}/${Date.now()}-${Math.random()
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

const StatusMessage = ({ status }) => {
  const messages = {
    submitted: {
      text: "Case has been submitted. Awaiting admin approval.",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
    },
    approved: {
      text: "Case approved and sent to you. Awaiting writ from court.",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
    },
    writ_received: {
      text: "Sealed writ received - you can now proceed with enforcement. Upload completion documents and mark as completed when done.",
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
    },
    hceo_completed: {
      text: "You have successfully completed this case. No further action required.",
      bgColor: "bg-teal-50",
      textColor: "text-teal-700",
    },
  };

  const message = messages[status];
  if (!message) return null;

  return (
    <Alert className={`${message.bgColor} border-0`}>
      <AlertDescription className={`${message.textColor} text-sm`}>
        {message.text}
      </AlertDescription>
    </Alert>
  );
};

const HceoCaseDetailsPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const fetchCaseDetails = async () => {
      if (timeoutId) clearTimeout(timeoutId);

      if (!user?.email || !caseId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          setError("");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        const { data: allCases, error: fetchError } = await supabase
          .from("case_submissions")
          .select("*")
          .eq("id", caseId);

        if (fetchError) {
          throw fetchError;
        }

        const data = allCases.find((caseItem) => {
          const emailMatch =
            caseItem.assigned_user_email?.toLowerCase() ===
            user.email.toLowerCase();
          const nameMatch =
            caseItem.assigned_user_name?.toLowerCase() ===
            profile.full_name?.toLowerCase();
          const hceoMatch =
            caseItem.hceo_choice?.toLowerCase() ===
            profile.full_name?.toLowerCase();
          return emailMatch || nameMatch || hceoMatch;
        });

        if (!data) {
          throw new Error("Case not found or not assigned to you");
        }

        if (!isMounted) return;

        setCaseData(data);

        if (data.user_id) {
          const { data: applicantProfile, error: applicantProfileError } =
            await supabase
              .from("profiles_public")
              .select("id, email, full_name, company_name")
              .eq("id", data.user_id)
              .single();

          if (!applicantProfileError && applicantProfile) {
            setUserProfile(applicantProfile);
          }
        }
      } catch (err) {
        console.error("Error fetching case details:", err);
        if (isMounted) {
          setError(err.message || "Failed to load case details");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    timeoutId = setTimeout(() => {
      fetchCaseDetails();
    }, 100);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [caseId, user?.email]);

  const handleDownloadCaseDetailsPDF = useCallback(async () => {
    if (!caseData) return;

    try {
      await generateCaseDetailsPDF(caseData, "hceo", {
        hceoEmail: user?.email,
        userProfile: userProfile,
      });
    } catch (err) {
      console.error("Error generating case details PDF:", err);
      alert(`Failed to generate PDF: ${err.message}`);
    }
  }, [caseData, user?.email, userProfile]);

  const handleFileSelection = useCallback((e) => {
    const newFiles = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  }, []);

  const handleRemoveFile = useCallback((indexToRemove) => {
    setSelectedFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  }, []);

  const handleFileUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("Please select files to upload");
      return;
    }

    if (!caseData || !user) {
      alert("Case data or user information is missing");
      return;
    }

    try {
      setUploadingFiles(true);

      const uploadedPaths = await uploadHCEOFilesToSupabase(
        selectedFiles,
        user,
        caseData.id,
      );

      const existingFiles = caseData.hceo_file_paths || [];
      const allFiles = [...existingFiles, ...uploadedPaths];

      const { data, error } = await supabase
        .from("case_submissions")
        .update({
          hceo_file_paths: allFiles,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId)
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles_public")
        .select("email, full_name, role")
        .eq("id", user.id)
        .single();

      const historyResult = await addCaseHistory({
        caseId: caseData.id,
        userId: user.id,
        userEmail: profile?.email || user.email,
        userName: profile?.full_name || "HCEO",
        userRole: "hceo",
        actionType: "document_upload",
        actionDescription: `Uploaded ${uploadedPaths.length} document(s)`,
        metadata: {
          file_count: uploadedPaths.length,
          file_names: selectedFiles.map((f) => f.name),
        },
      });

      setCaseData(data);
      setSelectedFiles([]);
      setHistoryRefresh((prev) => prev + 1);

      alert(`Successfully uploaded ${uploadedPaths.length} file(s)`);
    } catch (err) {
      console.error("Error uploading files:", err);
      alert(`Failed to upload files: ${err.message}`);
    } finally {
      setUploadingFiles(false);
    }
  }, [selectedFiles, user, caseData, caseId]);

  const handleUpdateStatus = useCallback(
    async (newStatus) => {
      if (!user?.id || !user?.email) return;

      try {
        setActionLoading(true);

        const oldStatus = caseData.status;

        const { data, error } = await supabase
          .from("case_submissions")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseId)
          .select();

        if (error) {
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error("Failed to update case or case not found");
        }

        setCaseData(data[0]);

        const { data: profile } = await supabase
          .from("profiles_public")
          .select("email, full_name, role")
          .eq("id", user.id)
          .single();

        await addCaseHistory({
          caseId: data[0].id,
          userId: user.id,
          userEmail: profile?.email || user.email,
          userName: profile?.full_name || "HCEO",
          userRole: "hceo",
          actionType: "status_change",
          actionDescription: `Case status changed from ${getStatusLabel(
            oldStatus,
          )} to ${getStatusLabel(newStatus)}`,
          oldValue: getStatusLabel(oldStatus),
          newValue: getStatusLabel(newStatus),
        });

        alert(`Case status updated to: ${getStatusLabel(newStatus)}`);
        setHistoryRefresh((prev) => prev + 1);
      } catch (err) {
        console.error("Error updating status:", err);
        alert(`Failed to update status: ${err.message}`);
      } finally {
        setActionLoading(false);
      }
    },
    [caseId, user?.id, user?.email, caseData],
  );

  const handleBackClick = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <LoadingSpinner message="Loading case details..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={handleBackClick} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-bold text-blue-800 mb-4">
            Error Loading Case
          </h1>

          <Alert variant="destructive">
            <AlertCircle className="w-5 h-5" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Button variant="outline" onClick={handleBackClick} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-bold text-blue-800 mb-4">
            Case Not Found
          </h1>

          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Case Not Found
              </h3>
              <p className="text-gray-600 mt-1">
                The requested case could not be found or is not assigned to you.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Simple Header */}
        <div className="mb-6">
          <Button variant="outline" onClick={handleBackClick} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-bold text-blue-800">
            Case:{" "}
            {generateCompanyCaseId(caseData.id, userProfile?.company_name)}
          </h1>
          <p className="text-gray-600 mt-1">
            Assigned to: {user?.email} • Submitted on{" "}
            {formatDateTime(caseData.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <CaseInformationCard caseData={caseData} />

            <PaymentsReceivedSection caseData={caseData} isEditable={false} />

            <PaymentInformationCard caseData={caseData} />

            <DocumentList
              documents={caseData.judgment_file_paths}
              title="Judgment Documents"
              caseId={caseData.id}
            />

            <DocumentList
              documents={caseData.hceo_file_paths}
              title="HCEO Documents"
              caseId={caseData.id}
              variant="hceo"
            />

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
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Case Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Current Status
                  </p>
                  <p className="font-semibold text-green-700">
                    {getStatusLabel(caseData.status)}
                  </p>
                </div>

                <StatusMessage status={caseData.status} />

                {caseData.status === "approved" && caseData.admin_note && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Admin Note:
                    </p>
                    <p className="text-sm text-green-700">
                      {caseData.admin_note}
                    </p>
                  </div>
                )}

                {caseData.status === "writ_received" && caseData.admin_note && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <p className="text-sm font-semibold text-purple-800 mb-1">
                      Admin Note:
                    </p>
                    <p className="text-sm text-purple-700">
                      {caseData.admin_note}
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-500 text-sm">Last Updated:</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {formatDateTime(caseData.updated_at)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* File Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Select Files</Label>
                  <div className="flex items-center space-x-2">
                    <Upload className="w-5 h-5 text-gray-400" />
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileSelection}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Selected files ({selectedFiles.length}):
                    </p>
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-md"
                      >
                        <span className="text-sm text-gray-700 truncate flex-1">
                          {file.name}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={handleFileUpload}
                      disabled={uploadingFiles}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFiles
                        ? "Uploading..."
                        : `Upload ${selectedFiles.length} File(s)`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseData.status === "writ_received" && (
                  <Button
                    onClick={() => handleUpdateStatus("hceo_completed")}
                    disabled={actionLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {actionLoading ? "Updating..." : "Mark as HCEO Completed"}
                  </Button>
                )}

                <Button
                  onClick={handleDownloadCaseDetailsPDF}
                  variant="outline"
                  className="w-full"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  View Case Report
                </Button>
              </CardContent>
            </Card>

            {/* Status Flow Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status Flow</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-700">
                      Submitted → Awaiting Admin
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-gray-700">Approved by Admin</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-700">
                      Completed by Admin → Your Turn
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
                    <span className="text-gray-700">
                      Completed by HCEO → Done
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-3 p-3 bg-gray-50 rounded">
                    <p className="font-semibold mb-1">Your Role:</p>
                    <p>
                      Once admin marks the case as "Completed by Admin", you can
                      review the enforcement documents and execute the warrant.
                      When done, mark it as "Completed by HCEO".
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HceoCaseDetailsPage;
