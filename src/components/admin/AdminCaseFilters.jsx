// src/components/admin/AdminCaseFilters.jsx
import React from "react";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminCaseFilters = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onRefresh,
}) => {
  return (
    <div className="space-y-3 mb-6">
      {/* Search + Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search cases, names, IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm"
          />
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm" className="shrink-0">
          <RefreshCw className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Filters row — scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm bg-white shrink-0"
        >
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="returned">Returned</option>
          <option value="approved">Approved</option>
          <option value="writ_received">Writ Received</option>
          <option value="hceo_completed">HCEO Completed</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm bg-white shrink-0"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("-");
            setSortBy(field);
            setSortOrder(order);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 text-sm bg-white shrink-0"
        >
          <option value="created_at-desc">Latest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="judgment_amount-desc">Highest Amount</option>
          <option value="judgment_amount-asc">Lowest Amount</option>
        </select>
      </div>
    </div>
  );
};

export default AdminCaseFilters;