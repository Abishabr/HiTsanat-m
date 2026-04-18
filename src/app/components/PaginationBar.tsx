import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';

interface PaginationBarProps {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  /** Label for the item type, e.g. "members" */
  label?: string;
}

export function PaginationBar({
  page,
  totalPages,
  from,
  to,
  totalItems,
  onPageChange,
  label = 'items',
}: PaginationBarProps) {
  if (totalItems === 0) return null;

  // Build visible page numbers: always show first, last, current ±1
  const pages: (number | '…')[] = [];
  const add = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };

  add(1);
  if (page > 3) pages.push('…');
  if (page > 2) add(page - 1);
  add(page);
  if (page < totalPages - 1) add(page + 1);
  if (page < totalPages - 2) pages.push('…');
  add(totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
      {/* Count */}
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{' '}
        <span className="font-medium text-foreground">{totalItems}</span> {label}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First */}
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>

        {/* Prev */}
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8 text-sm"
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </Button>
          )
        )}

        {/* Next */}
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Last */}
        <Button
          variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
