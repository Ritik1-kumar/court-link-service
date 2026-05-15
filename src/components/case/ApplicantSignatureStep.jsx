// src/components/case/ApplicantSignatureStep.jsx
import React, { useRef, useState, useEffect } from "react";
import { X, Trash2, Check, PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ApplicantSignatureStep = ({
  onContinue,
  onBack,
  existingSignature = null,
  loading = false,
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signatureData, setSignatureData] = useState(existingSignature);
  const [saveOption, setSaveOption] = useState("save"); // 'save' or 'once'

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas size
      canvas.width = 600;
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
  }, [existingSignature]);

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

  const handleContinue = () => {
    if (hasDrawn && signatureData) {
      onContinue({
        signatureData,
        saveForFuture: saveOption === "save",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PenTool className="w-6 h-6 text-blue-600" />
          <span>Sign Your Application</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">
            📝 Signature Required
          </p>
          <p className="text-sm text-blue-700">
            Please provide your digital signature below.
          </p>
        </div>

        {/* Signature Canvas */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Draw Your Signature</Label>
          <div className="border-2 border-gray-300 rounded-lg bg-white shadow-sm">
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
          <p className="text-xs text-gray-500">
            Use your mouse or touchpad to sign above
          </p>
        </div>

        {/* Clear Button */}
        {hasDrawn && (
          <Button
            type="button"
            onClick={handleClear}
            variant="outline"
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Signature
          </Button>
        )}

        {/* Save Options */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-base font-semibold">
            Signature Preference
          </Label>
          <RadioGroup value={saveOption} onValueChange={setSaveOption}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => setSaveOption("save")}>
              <RadioGroupItem value="save" id="save" className="mt-1" />
              <div className="flex-1">
                <label
                  htmlFor="save"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Save my signature for future applications
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Your signature will be saved to your profile and automatically
                  used for future case submissions
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer" onClick={() => setSaveOption("once")}>
              <RadioGroupItem value="once" id="once" className="mt-1" />
              <div className="flex-1">
                <label
                  htmlFor="once"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Use signature once only
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Your signature will only be used for this case and will not be
                  saved to your profile
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Legal Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs text-yellow-800">
            <strong>Legal Declaration:</strong> By providing your signature, you
            confirm that it represents your legal signature for document
            execution. This signature will be used on official court documents
            and legal forms.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!hasDrawn || loading}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? "Processing..." : "Continue to Payment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApplicantSignatureStep;
