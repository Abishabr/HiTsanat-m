import { useState, useEffect } from 'react';

export interface PaginationResult<T> {
  page: number;
  totalPages: number;
  pageItems: T[];
  setPage: (p: number) => void;
  pageSize: number;
  totalItems: number;
  from: number;
  to: number;
}

/**
 * Generic client-side pagination hook.
 * Resets to page 1 whenever `items` or `pageSize` changes (e.g. after filtering).
 */
export function usePagination<T>(items: T[], pageSize = 10): PaginationResult<T> {
  const [page, setPageRaw] = useState(1);

  // Reset to page 1 when the item list changes (filter / search)
  useEffect(() => {
    setPageRaw(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = (safePage - 1) * pageSize;
  const to = Math.min(from + pageSize, items.length);
  const pageItems = items.slice(from, to);

  const setPage = (p: number) => setPageRaw(Math.max(1, Math.min(totalPages, p)));

  return {
    page: safePage,
    totalPages,
    pageItems,
    setPage,
    pageSize,
    totalItems: items.length,
    from: from + 1,   // 1-based for display
    to,
  };
}
