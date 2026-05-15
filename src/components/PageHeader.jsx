// src/components/PageHeader.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PageHeader = ({
  title,
  subtitle,
  showBackButton = false,
  backTo = -1,
  action,
  actionLabel,
  actionIcon: ActionIcon,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6 pl-10">
      {showBackButton && (
        <Button
          variant="outline"
          onClick={() =>
            typeof backTo === "string" ? navigate(backTo) : navigate(backTo)
          }
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-800">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {action && (
          <Button onClick={action}>
            {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
