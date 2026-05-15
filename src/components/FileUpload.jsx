// src/components/FileUpload.jsx
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

const FileUpload = ({
  label,
  files = [],
  onChange,
  onRemove,
  error,
  required = false,
  multiple = true,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  helperText = "Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)",
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="file-upload">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex items-center space-x-2">
        <Upload className="w-5 h-5 text-gray-400" />
        <Input
          id="file-upload"
          type="file"
          onChange={onChange}
          accept={accept}
          multiple={multiple}
          className={error ? "border-red-500" : ""}
        />
      </div>
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Display selected files */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected files ({files.length}):
          </p>
          {files.map((file, index) => (
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
                onClick={() => onRemove(index)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
