// src/components/dashboard/StatsGrid.jsx
import React from "react";
import StatsCard from "../StatsCard";

const StatsGrid = ({ stats, config }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {config.map((item, index) => (
        <StatsCard
          key={index}
          title={item.title}
          value={item.getValue ? item.getValue(stats) : stats[item.key]}
          icon={item.icon}
          iconBgColor={item.iconBgColor}
          iconColor={item.iconColor}
          valueColor={item.valueColor}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
