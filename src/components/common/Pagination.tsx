import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className = '',
  itemLabel = 'bản ghi',
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize ?? 10))) {
    if (!totalItems) return null;
    return (
      <div className={`flex items-center justify-between text-xs text-slate-500 py-3 px-2 ${className}`}>
        <span>Tổng cộng: <strong className="font-semibold text-slate-800">{totalItems}</strong> {itemLabel}</span>
      </div>
    );
  }

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }
    return pages;
  };

  const startRecord = pageSize ? (currentPage - 1) * pageSize + 1 : 1;
  const endRecord = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : totalItems;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-3 text-xs border-t border-slate-100 bg-slate-50/50 rounded-b-2xl ${className}`}>
      <div className="flex flex-wrap items-center gap-2 text-slate-600">
        {totalItems !== undefined && (
          <span>
            Hiển thị <strong className="font-semibold text-slate-800">{totalItems > 0 ? startRecord : 0}</strong> -{' '}
            <strong className="font-semibold text-slate-800">{endRecord}</strong> trong{' '}
            <strong className="font-semibold text-slate-800">{totalItems}</strong> {itemLabel}
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-500">Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Số bản ghi mỗi trang"
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          aria-label="Trang đầu"
          title="Trang đầu"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
          title="Trang trước"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((page, idx) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold select-none">
                  …
                </span>
              );
            }
            const isCurrent = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                aria-current={isCurrent ? 'page' : undefined}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-medium text-xs transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-500/30'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Trang kế tiếp"
          title="Trang kế tiếp"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          aria-label="Trang cuối"
          title="Trang cuối"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
