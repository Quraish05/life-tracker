import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/atoms/button";

interface PaginationProps extends React.ComponentProps<"nav"> {
  /** Current page, 1-indexed. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Optional total item count — enables a "X–Y of N" range label. */
  total?: number;
  /** Page size, needed alongside `total` for the range label. */
  pageSize?: number;
}

/** Prev/next pager with a page or item-range indicator. Renders nothing for a single page. */
function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  className,
  ...props
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const label =
    total != null && pageSize != null
      ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`
      : `Page ${page} of ${pageCount}`;

  return (
    <nav
      data-slot="pagination"
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3", className)}
      {...props}
    >
      <p className="text-xs font-semibold text-ink-soft/70">{label}</p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ← Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next →
        </Button>
      </div>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
