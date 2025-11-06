import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface PaginationProps {
  current: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  showPageSizeSelector?: boolean;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  showInfo?: boolean;
  disabled?: boolean;
}

export function Pagination({
  current,
  total,
  onPageChange,
  pageSize,
  showPageSizeSelector = false,
  pageSizeOptions = [5, 10, 20, 50, 100],
  onPageSizeChange,
  showInfo = true,
  disabled = false,
}: PaginationProps) {
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > total) return;
    onPageChange(page);
  };

  const getVisiblePages = () => {
    const delta = isMobile ? 0 : 1;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, current - delta);
      i <= Math.min(total - 1, current + delta);
      i++
    ) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < total - 1) {
      rangeWithDots.push('...', total);
    } else if (total > 1) {
      rangeWithDots.push(total);
    }

    return rangeWithDots;
  };

  if (total <= 1 && !showPageSizeSelector) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {showInfo && (
        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Página {current} de {total}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {showPageSizeSelector && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(0,0,0,0.15)',
              fontSize: '0.875rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              marginRight: '8px',
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / página
              </option>
            ))}
          </select>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Primera página */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={disabled || current === 1}
              icon={<ChevronsLeft size={16} />}
            />
          )}

          {/* Página anterior */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current - 1)}
            disabled={disabled || current === 1}
            icon={<ChevronLeft size={16} />}
          />

          {/* Páginas */}
          {!isMobile &&
            getVisiblePages().map((page, index) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    style={{
                      padding: '0 8px',
                      color: '#64748b',
                      fontSize: '0.875rem',
                    }}
                  >
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === current;

              return (
                <Button
                  key={pageNum}
                  variant={isActive ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  disabled={disabled}
                  style={{
                    minWidth: '36px',
                  }}
                >
                  {pageNum}
                </Button>
              );
            })}

          {/* Página siguiente */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(current + 1)}
            disabled={disabled || current === total}
            icon={<ChevronRight size={16} />}
          />

          {/* Última página */}
          {!isMobile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(total)}
              disabled={disabled || current === total}
              icon={<ChevronsRight size={16} />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

