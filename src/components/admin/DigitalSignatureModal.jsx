// src/components/admin/DigitalSignatureModal.jsx
import React, { useRef, useState, useEffect } from "react";
import { X, Trash2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DigitalSignatureModal = ({
  isOpen,
  onClose,
  onSave,
  existingSignature = null,
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureData, setSignatureData] = useState(existingSignature);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas size
      canvas.width = 500;
      canvas.height = 200;

      // Set drawing style
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Load existing signature if available
      if (existingSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          setHasDrawn(true);
        };
        img.src = existingSignature;
      }
    }
  }, [isOpen, existingSignature]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    setIsDrawing(true);
    setHasDrawn(true);

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.closePath();
      setIsDrawing(false);

      // Save signature data
      const dataUrl = canvas.toDataURL("image/png");
      setSignatureData(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureData(null);
  };

  const handleSave = () => {
    if (hasDrawn && signatureData) {
      onSave(signatureData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[60]"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        style={{ pointerEvents: "auto" }}
        onClick={onClose}
      ></div>
      <Card
        className="w-full max-w-2xl mx-4 relative z-[61]"
        style={{ pointerEvents: "auto" }}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Digital Signature</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please sign below using your mouse or touchpad. This signature
              will be used on the generated legal forms.
            </p>

            <div className="border-2 border-gray-300 rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full cursor-crosshair"
                style={{ touchAction: "none" }}
              />
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClear();
                }}
                variant="outline"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSave();
                }}
                disabled={!hasDrawn}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Signature
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              By saving this signature, you confirm that it represents your
              legal signature for document execution.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalSignatureModal;
