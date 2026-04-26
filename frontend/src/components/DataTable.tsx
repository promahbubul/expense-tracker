'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

const pageSizeOptions = [20, 30, 50, 100] as const;

type DataTableProps<T> = {
  rows: T[];
  columns: ReactNode[];
  colSpan: number;
  emptyMessage: string;
  renderRow: (row: T, index: number) => ReactNode;
  initialPageSize?: (typeof pageSizeOptions)[number];
};

export function DataTable<T>({
  rows,
  columns,
  colSpan,
  emptyMessage,
  renderRow,
  initialPageSize = 20,
}: DataTableProps<T>) {
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  const rangeStart = rows.length ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = rows.length ? Math.min(page * pageSize, rows.length) : 0;

  return (
    <div className="dataTable">
      <div className="tableWrap tableWrapScrollable">
        <table>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? (
              visibleRows.map((row, index) => renderRow(row, index))
            ) : (
              <tr>
                <td colSpan={colSpan} className="muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tablePagination">
        <span className="tablePaginationInfo">
          Showing {rangeStart}-{rangeEnd} of {rows.length}
        </span>

        <div className="tablePaginationControls">
          <label className="pageSizeField">
            <span>Rows</span>
            <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="tablePageButtons">
            <button className="ghostButton pagerButton" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              <ChevronLeft size={16} />
              Prev
            </button>
            <span className="tablePaginationInfo">
              Page {page} / {totalPages}
            </span>
            <button
              className="ghostButton pagerButton"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
