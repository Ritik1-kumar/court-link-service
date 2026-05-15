// src/components/admin/HceoModal.jsx
import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HCEO_OPTIONS, DEFAULT_HCEO_OPTIONS } from "@/lib/caseUtils";

const HceoModal = ({
  isOpen,
  onClose,
  currentHceo,
  onUpdate,
  hideRandomAssignment = false,
  hideSelectHceo = false,
}) => {
  const [localSelectedHceo, setLocalSelectedHceo] = useState(currentHceo || "");
  const [hceoOptions, setHceoOptions] = useState(DEFAULT_HCEO_OPTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHceoOptions = async () => {
      try {
        setLoading(true);
        const options = await HCEO_OPTIONS();
        // Normalize options so each option is an object { id, name, email }
        let normalized = options.map((opt) => {
          if (typeof opt === "string") {
            return { id: opt, name: opt, email: "" };
          }
          return {
            id: opt.id ?? opt.name,
            name: opt.name ?? String(opt.id ?? ""),
            email: opt.email ?? "",
          };
        });

        // Filter out "Random Assignment" if hideRandomAssignment is true
        if (hideRandomAssignment) {
          normalized = normalized.filter(
            (opt) => opt.name !== "Random Assignment"
          );
        }

        // Filter out "Select HCEO..." if hideSelectHceo is true
        if (hideSelectHceo) {
          normalized = normalized.filter(
            (opt) => opt.name !== "Select HCEO..."
          );
        }

        setHceoOptions(normalized);
      } catch (error) {
        console.error("Error loading HCEO options:", error);
        // Fallback: normalize default options as objects
        setHceoOptions(
          DEFAULT_HCEO_OPTIONS.map((s) => ({ id: s, name: s, email: "" }))
        );
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      setLocalSelectedHceo(currentHceo || "");
      loadHceoOptions();
    }
  }, [isOpen, currentHceo, hideRandomAssignment, hideSelectHceo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      localSelectedHceo &&
      localSelectedHceo !== "Select HCEO..." &&
      localSelectedHceo !== currentHceo
    ) {
      // Find the full HCEO option object
      const selectedOption = hceoOptions.find(
        (opt) => opt.name === localSelectedHceo
      );

      // Pass the full option object to onUpdate
      await onUpdate(
        selectedOption || {
          name: localSelectedHceo,
          email: "",
          id: localSelectedHceo,
        }
      );
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Change HCEO Assignment</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current HCEO:
              </label>
              <p className="text-gray-900 bg-gray-50 p-2 rounded">
                {currentHceo || "Not assigned"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New HCEO:
              </label>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading options...</span>
                </div>
              ) : (
                <select
                  value={localSelectedHceo}
                  onChange={(e) => setLocalSelectedHceo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {hceoOptions.map((option, index) => {
                    const name =
                      typeof option === "string" ? option : option.name;
                    const email =
                      typeof option === "string" ? "" : option.email;
                    return (
                      <option key={index} value={name}>
                        {name}
                        {email ? ` (${email})` : ""}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !localSelectedHceo ||
                  localSelectedHceo === "Select HCEO..." ||
                  localSelectedHceo === currentHceo
                }
                className="flex-1"
              >
                Update HCEO
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default HceoModal;
