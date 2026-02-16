"use client";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageLabel?: string;
};

const btnBaseClass =
  "rounded-theme border border-gold-500/50 bg-navy-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:border-gold-500/80 disabled:opacity-50 disabled:border-navy-600 disabled:cursor-not-allowed shrink-0";

function clampPage(page: number, totalPages: number): number {
  if (totalPages < 1) return 1;
  return Math.max(1, Math.min(page, totalPages));
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageLabel = "Page",
}: PaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = clampPage(currentPage, safeTotal);

  const goToFirst = () => onPageChange(1);
  const goToPrev = () => onPageChange(Math.max(1, safeCurrent - 1));
  const goToNext = () => onPageChange(Math.min(safeTotal, safeCurrent + 1));
  const goToLast = () => onPageChange(safeTotal);

  const isFirstPage = safeCurrent <= 1;
  const isLastPage = safeCurrent >= safeTotal;

  return (
    <div className="flex shrink-0 min-w-0 flex-wrap items-center justify-center gap-2 border-t border-navy-700 px-4 py-3 mt-4 sm:gap-4">
      <button
        type="button"
        onClick={goToFirst}
        disabled={isFirstPage}
        className={btnBaseClass}
        aria-label="Go to first page"
      >
        First
      </button>
      <button
        type="button"
        onClick={goToPrev}
        disabled={isFirstPage}
        className={btnBaseClass}
        aria-label="Go to previous page"
      >
        Prev
      </button>
      <span className="text-sm text-slate-400 shrink-0 px-1" aria-live="polite">
        {pageLabel} {safeCurrent} of {safeTotal}
      </span>
      <button
        type="button"
        onClick={goToNext}
        disabled={isLastPage}
        className={btnBaseClass}
        aria-label="Go to next page"
      >
        Next
      </button>
      <button
        type="button"
        onClick={goToLast}
        disabled={isLastPage}
        className={btnBaseClass}
        aria-label="Go to last page"
      >
        Last
      </button>
    </div>
  );
}
