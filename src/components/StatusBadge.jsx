// src/components/StatusBadge.jsx
import React from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Archive,
} from "lucide-react";
import { getStatusIcon, getStatusColor, getStatusLabel } from "@/lib/caseUtils";

const StatusBadge = ({ status, showIcon = true }) => {
  const renderStatusIcon = () => {
    const iconName = getStatusIcon(status);
    const iconProps = "w-4 h-4";

    switch (iconName) {
      case "FileText":
        return <FileText className={`${iconProps} text-gray-500`} />;
      case "Clock":
        return <Clock className={`${iconProps} text-blue-500`} />;
      case "AlertCircle":
        return <AlertCircle className={`${iconProps} text-orange-500`} />;
      case "CheckCircle":
        return <CheckCircle className={`${iconProps} text-green-500`} />;
      case "FileCheck":
        return <FileCheck className={`${iconProps} text-purple-500`} />;
      case "CheckCircle2":
        return <CheckCircle2 className={`${iconProps} text-teal-500`} />;
      case "Archive":
        return <Archive className={`${iconProps} text-slate-500`} />;
      default:
        return <Clock className={`${iconProps} text-gray-500`} />;
    }
  };

  return (
    <div className="flex items-center">
      {showIcon && renderStatusIcon()}
      <span
        className={`${
          showIcon ? "ml-2" : ""
        } px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
          status
        )}`}
      >
        {getStatusLabel(status)}
      </span>
    </div>
  );
};

export default StatusBadge;
