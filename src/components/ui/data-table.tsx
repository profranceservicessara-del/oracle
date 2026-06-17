"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "./button";

export type DataTableColumn<T> = {
  header: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  emptyMessage: string;
  getRowKey: (row: T) => string;
  rows: T[];
};

const PAGE_SIZE = 8;

export function DataTable<T>({ columns, emptyMessage, getRowKey, rows }: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-muted">
            <tr>
              {columns.map((column) => (
                <th className="border-b border-line px-4 py-3 font-semibold" key={column.header}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length > 0 ? (
              pageRows.map((row) => (
                <tr className="border-b border-line last:border-b-0" key={getRowKey(row)}>
                  {columns.map((column) => (
                    <td className="px-4 py-3 align-top text-ink" key={column.header}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-14 text-center" colSpan={columns.length}>
                  <div className="mx-auto flex max-w-xs flex-col items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-black/5"
                    >
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
                        <line x1="8" x2="20" y1="7" y2="7" />
                        <line x1="8" x2="20" y1="12" y2="12" />
                        <line x1="8" x2="20" y1="17" y2="17" />
                        <line x1="4" x2="4" y1="7" y2="7" />
                        <line x1="4" x2="4" y1="12" y2="12" />
                        <line x1="4" x2="4" y1="17" y2="17" />
                      </svg>
                    </span>
                    <p className="text-sm text-muted">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-muted">
        <span>
          Página {safePage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
            variant="secondary"
          >
            Anterior
          </Button>
          <Button
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
            variant="secondary"
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
