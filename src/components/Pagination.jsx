// src/components/Pagination.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const Pagination = ({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalCount);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4">
      {/* Mobile View */}
      <div className="flex justify-between flex-1 sm:hidden">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          Previous
        </Button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          Next
        </Button>
      </div>

      {/* Desktop View */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{" "}
            <span className="font-medium">{endItem}</span> of{" "}
            <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div>
          <nav className="inline-flex -space-x-px rounded-md shadow-sm">
            {/* First Page */}
            <Button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="rounded-l-md"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            {/* Previous Page */}
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="rounded-none"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={page}
                  onClick={() => onPageChange(page)}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="rounded-none"
                >
                  {page}
                </Button>
              )
            )}

            {/* Next Page */}
            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="rounded-none"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {/* Last Page */}
            <Button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="rounded-r-md"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
