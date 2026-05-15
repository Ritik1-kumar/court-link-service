// src/components/StatsCard.jsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const StatsCard = ({
  title,
  value,
  icon: Icon,
  iconBgColor,
  iconColor,
  valueColor,
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 ${iconBgColor || "bg-blue-100"} rounded-full`}>
            <Icon className={`w-6 h-6 ${iconColor || "text-blue-600"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p
              className={`text-3xl font-bold ${valueColor || "text-gray-900"}`}
            >
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
