import type { Pagination as PaginationMeta } from '../types/catalog';

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
};

/** Windows page numbers around the current page so long catalogues stay usable. */
const pageWindow = (current: number, total: number): (number | 'gap')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | 'gap')[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) result.push('gap');
    result.push(page);
    previous = page;
  }
  return result;
};

export default function Pagination({ pagination, onPageChange }: Props) {
  const { page, totalPages, hasNextPage, hasPrevPage, total } = pagination;

  if (totalPages <= 1) return null;

  const buttonClass =
    'rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-ink-500">
        Page {page} of {totalPages} · {total} products
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className={buttonClass}
        >
          Prev
        </button>

        {pageWindow(page, totalPages).map((entry, index) =>
          entry === 'gap' ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-ink-500">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? 'page' : undefined}
              className={`min-w-9 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                entry === page
                  ? 'bg-brand-500 text-white'
                  : 'border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className={buttonClass}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
