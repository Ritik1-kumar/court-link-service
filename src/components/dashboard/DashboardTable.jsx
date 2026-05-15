// src/components/dashboard/DashboardTable.jsx
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const DashboardTable = ({
  title,
  subtitle,
  columns,
  data,
  renderRow,
  emptyState,
  actions,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, index) => renderRow(item, index))}
              </tbody>
            </table>
          </div>
        ) : (
          emptyState || (
            <div className="p-8 text-center">
              <p className="text-gray-500">No data available</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardTable;
