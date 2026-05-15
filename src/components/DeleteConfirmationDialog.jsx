// src/components/DeleteConfirmationDialog.jsx
import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DeleteConfirmationDialog = ({ isOpen, onClose, onConfirm, caseName }) => {
  const [deleteText, setDeleteText] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (deleteText === "DELETE") {
      onConfirm();
      handleClose();
    } else {
      setError("Please type DELETE to confirm");
    }
  };

  const handleClose = () => {
    setDeleteText("");
    setError("");
    onClose();
  };

  const handleInputChange = (e) => {
    setDeleteText(e.target.value);
    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Delete Case</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the case for{" "}
            <span className="font-semibold">{caseName}</span>?
          </p>
          <p className="text-gray-600 mb-6">
            This action cannot be undone. All associated data will be
            permanently removed.
          </p>

          {/* Input Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">DELETE</span> to
              confirm:
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={handleInputChange}
              placeholder="Type DELETE here"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                error
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-red-600"
              }`}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteText !== "DELETE"}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              deleteText === "DELETE"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Delete Case
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;
