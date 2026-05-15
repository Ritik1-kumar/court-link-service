// src/components/DocumentList.jsx
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Eye, AlertCircle } from "lucide-react";
import { viewDocumentInBrowser, checkFileExists } from "@/lib/caseUtils";

const DocumentList = ({
  documents,
  title = "Documents",
  caseId,
  variant = "default", // "default", "hceo", or "sealed-writ"
}) => {
  const [fileStatuses, setFileStatuses] = useState({});
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAllFiles = async () => {
      if (!documents || documents.length === 0) {
        setChecking(false);
        return;
      }

      setChecking(true);
      const statuses = {};

      for (const filePath of documents) {
        const exists = await checkFileExists(filePath);
        statuses[filePath] = exists;
      }

      setFileStatuses(statuses);
      setChecking(false);
    };

    checkAllFiles();
  }, [documents]);

  if (!documents || documents.length === 0) {
    return null;
  }

  const handleViewAll = async () => {
    try {
      const availableFiles = documents.filter((fp) => fileStatuses[fp]);

      if (availableFiles.length === 0) {
        alert("No documents available to view");
        return;
      }

      // Open each document in a new tab with a small delay
      for (const filePath of availableFiles) {
        await viewDocumentInBrowser(filePath);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (err) {
      alert(`Error viewing documents: ${err.message}`);
    }
  };

  // const handleDownloadAll = async () => {
  //   try {
  //     const availableFiles = documents.filter((fp) => fileStatuses[fp]);

  //     if (availableFiles.length === 0) {
  //       alert("No documents available to download");
  //       return;
  //     }

  //     for (const filePath of availableFiles) {
  //       await downloadDocumentFromSupabase(filePath, caseId);
  //       await new Promise((resolve) => setTimeout(resolve, 500));
  //     }
  //   } catch (err) {
  //     alert(`Error downloading documents: ${err.message}`);
  //   }
  // };

  const borderColor =
    variant === "hceo"
      ? "border-green-200"
      : variant === "sealed-writ"
      ? "border-purple-200"
      : "border-gray-200";
  const bgColor =
    variant === "hceo"
      ? "bg-green-50"
      : variant === "sealed-writ"
      ? "bg-purple-50"
      : "bg-white";
  const iconColor =
    variant === "hceo"
      ? "text-green-600"
      : variant === "sealed-writ"
      ? "text-purple-600"
      : "text-blue-600";
  const buttonVariant = "outline";

  const availableCount = Object.values(fileStatuses).filter(Boolean).length;
  const archivedCount = documents.length - availableCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title} ({documents.length})
          {!checking && archivedCount > 0 && (
            <span className="text-sm font-normal text-red-600 ml-2">
              ({archivedCount} archived)
            </span>
          )}
        </CardTitle>
        {variant === "hceo" && (
          <p className="text-sm text-gray-600 mt-1">
            Documents uploaded by the assigned High Court Enforcement Officer
          </p>
        )}
        {variant === "sealed-writ" && (
          <p className="text-sm text-gray-600 mt-1">
            Sealed writ documents received from the court
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((filePath, index) => {
            const fileName = filePath.split("/").pop();
            const fileExists = fileStatuses[filePath];
            const isChecking = checking;

            return (
              <div
                key={index}
                className={`border ${
                  fileExists === false ? "border-red-200" : borderColor
                } rounded-lg p-4 ${
                  fileExists === false ? "bg-red-50" : bgColor
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText
                      className={`w-8 h-8 ${
                        fileExists === false ? "text-red-400" : iconColor
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {variant === "hceo"
                          ? "HCEO "
                          : variant === "sealed-writ"
                          ? "Sealed Writ "
                          : ""}
                        Document {index + 1}
                      </p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {fileName}
                      </p>
                    </div>
                  </div>

                  {isChecking ? (
                    <Button variant="ghost" size="sm" disabled>
                      Checking...
                    </Button>
                  ) : fileExists === false ? (
                    <div className="flex items-center space-x-2 text-red-600 font-semibold">
                      <span>File Archived</span>
                    </div>
                  ) : (
                    <Button
                      variant={buttonVariant}
                      size="sm"
                      onClick={() => viewDocumentInBrowser(filePath)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    // <Button
                    //   variant={buttonVariant}
                    //   size="sm"
                    //   onClick={() =>
                    //     downloadDocumentFromSupabase(filePath, caseId)
                    //   }
                    // >
                    //   <Download className="w-4 h-4 mr-2" />
                    //   Download
                    // </Button>
                  )}
                </div>
              </div>
            );
          })}

          {documents.length > 1 && availableCount > 0 && !checking && (
            <Button onClick={handleViewAll} className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View All Available Documents ({availableCount})
            </Button>
          )}
          {/* {documents.length > 1 && availableCount > 0 && !checking && (
            <Button onClick={handleDownloadAll} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download All Available Documents ({availableCount})
            </Button>
          )} */}

          {documents.length > 1 && availableCount === 0 && !checking && (
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 font-medium">
                All documents have been archived
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentList;
