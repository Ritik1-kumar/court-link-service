// src/components/case/PreSubmissionChecklist.jsx

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const CHECKLIST_ITEMS = [
  { key: "judgmentAge", label: "The Judgment is under 6 years old." },
  { key: "debtAmount", label: "The debt is over £600." },
  { key: "notPossession", label: "The Claim is not a writ of Possession." },
  { key: "notConsumerCredit", label: "The Claim is not a Consumer Credit Debt." },
];

const PreSubmissionChecklist = ({ onContinue }) => {
  const [checks, setChecks] = useState({
    judgmentAge: false,
    debtAmount: false,
    notPossession: false,
    notConsumerCredit: false,
    termsAndConditions: false,
  });

  const allChecked = Object.values(checks).every((val) => val);
  const allMainChecked = CHECKLIST_ITEMS.every((item) => checks[item.key]);

  const handleCheckChange = (key) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    const newValue = !allMainChecked;
    const updated = {};
    CHECKLIST_ITEMS.forEach(({ key }) => (updated[key] = newValue));
    setChecks((prev) => ({ ...prev, ...updated }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center">
          To submit an application for a new case, please confirm the following.
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Select All */}
          <div className="flex items-center space-x-3 pb-2 border-b">
            <Checkbox
              id="selectAll"
              checked={allMainChecked}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="selectAll" className="font-semibold cursor-pointer">
              Select All
            </Label>
          </div>

          {/* Individual items */}
          {CHECKLIST_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-start space-x-3">
              <Checkbox
                id={key}
                checked={checks[key]}
                onCheckedChange={() => handleCheckChange(key)}
              />
              <Label htmlFor={key} className="font-normal cursor-pointer leading-tight">
                {label}
              </Label>
            </div>
          ))}

          {/* Terms — separate, not part of Select All */}
          <div className="flex items-start space-x-3 pt-2 border-t">
            <Checkbox
              id="termsAndConditions"
              checked={checks.termsAndConditions}
              onCheckedChange={() => handleCheckChange("termsAndConditions")}
            />
            <Label
              htmlFor="termsAndConditions"
              className="font-normal cursor-pointer leading-tight"
            >
              I agree to the Terms & Conditions.
            </Label>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={onContinue}
            disabled={!allChecked}
            className="w-64"
            size="lg"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreSubmissionChecklist;