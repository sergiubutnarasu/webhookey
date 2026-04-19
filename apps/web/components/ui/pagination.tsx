"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  baseUrl: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  baseUrl,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const buildUrl = (page: number) => {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  };

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(255,255,255,0.05)]">
      <div className="text-sm text-[#8a8f98]">
        Showing {startItem}-{endItem} of {totalItems} items
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={buildUrl(currentPage - 1)}
          className={currentPage <= 1 ? "pointer-events-none" : ""}
        >
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link key={page} href={buildUrl(page)}>
              <Button
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            </Link>
          ))}
        </div>

        <Link
          href={buildUrl(currentPage + 1)}
          className={currentPage >= totalPages ? "pointer-events-none" : ""}
        >
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
