"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TableSelector from "@/components/TableSelector";
import {
  ExportNotification,
  type ExportNotificationType,
} from "@/components/ExportNotification";

const ROWS_PER_PAGE = 10;
const ALL_TABLES_VALUE = "ALL";

type SchemaRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  column_comment: string | null;
};

function groupByTable(rows: SchemaRow[]): Map<string, SchemaRow[]> {
  const map = new Map<string, SchemaRow[]>();
  for (const row of rows) {
    const list = map.get(row.table_name) ?? [];
    list.push(row);
    map.set(row.table_name, list);
  }
  return map;
}

function dash<T>(v: T | null | undefined): string {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

async function fetchSchema(): Promise<SchemaRow[]> {
  const res = await fetch("/api/schema");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data ?? [];
}

async function exportToExcel(rows: SchemaRow[]): Promise<void> {
  const res = await fetch("/api/export/excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows: rows.map((r) => ({
        table_name: r.table_name,
        column_name: r.column_name,
        data_type: r.data_type,
        character_maximum_length: r.character_maximum_length,
        numeric_precision: r.numeric_precision,
        numeric_scale: r.numeric_scale,
        is_nullable: r.is_nullable,
        column_default: r.column_default,
        column_comment: r.column_comment,
      })),
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Export failed");
  }
  const blob = await res.blob();
  const filename = `Data_Dictionary_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function DataDictionaryPage() {
  const [data, setData] = useState<SchemaRow[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [searchComment, setSearchComment] = useState("");
  const [searchColumnName, setSearchColumnName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportNotification, setExportNotification] =
    useState<ExportNotificationType>(null);
  const router = useRouter();

  /**
   * Fetches schema from API and updates data/selectedTable.
   * @param options.resetToDefaultState - If true, leave no table selected (dropdown "-") after load; otherwise preserve or set first table.
   */
  const load = useCallback(
    async (options?: { resetToDefaultState?: boolean }) => {
      const resetToDefaultState = options?.resetToDefaultState ?? false;
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchSchema();
        setData(rows);
        const byTable = groupByTable(rows);
        const names = Array.from(byTable.keys()).sort();
        if (resetToDefaultState) {
          setSelectedTable("");
        } else {
          setSelectedTable((prev) =>
            prev === ALL_TABLES_VALUE || names.includes(prev)
              ? prev
              : names[0] ?? ""
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schema");
        setData([]);
        setSelectedTable("");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleDropdownOpen = useCallback(() => {
    if (data.length === 0) load();
  }, [data.length, load]);

  /**
   * Header click handler: reset to initial load state without full page reload.
   * - No table selected → dropdown shows "-", data table empty, message: "Please select a table to view column details."
   * - Clears Search Column Name and Search Comment.
   * - Resets pagination to page 1; clears error and export notification.
   * - Re-fetches schema so table list is fresh but does not auto-select a table.
   */
  const handleHeaderClick = useCallback(() => {
    setSelectedTable("");
    setSearchComment("");
    setSearchColumnName("");
    setCurrentPage(1);
    setError(null);
    setExportNotification(null);
    router.push("/");
    load({ resetToDefaultState: true });
  }, [router, load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable, searchComment, searchColumnName]);

  const byTable = groupByTable(data);
  const tableNames = Array.from(byTable.keys()).sort();
  const rows =
    selectedTable === ALL_TABLES_VALUE
      ? data
      : selectedTable
        ? byTable.get(selectedTable) ?? []
        : [];
  const filteredColumns = rows.filter((col) => {
    const commentMatch = (col.column_comment ?? "")
      .toLowerCase()
      .includes(searchComment.toLowerCase());
    const columnNameMatch = col.column_name
      .toLowerCase()
      .includes(searchColumnName.toLowerCase());
    return commentMatch && columnNameMatch;
  });

  const totalPages = Math.ceil(filteredColumns.length / ROWS_PER_PAGE) || 1;
  const indexOfLast = currentPage * ROWS_PER_PAGE;
  const indexOfFirst = indexOfLast - ROWS_PER_PAGE;
  const currentRows = filteredColumns.slice(indexOfFirst, indexOfLast);
  const showPagination = filteredColumns.length > ROWS_PER_PAGE;

  const COLUMN_COUNT = 8;

  function renderEmptyRow(message: string) {
    return (
      <tr>
        <td
          colSpan={COLUMN_COUNT}
          className="px-4 py-12 text-center text-sm text-slate-400"
        >
          {message}
        </td>
      </tr>
    );
  }

  function getEmptyMessage() {
    if (!selectedTable) return "Please select a table to view column details.";
    if (rows.length === 0) return "No columns found for this table.";
    if (filteredColumns.length === 0) return "No matching columns found.";
    return null;
  }

  const emptyMessage = getEmptyMessage();
  const showDataRows = selectedTable && filteredColumns.length > 0;

  return (
    <main className="w-full min-w-0 px-4 py-8">
      <ExportNotification
        notification={exportNotification}
        onDismiss={() => setExportNotification(null)}
      />

      {/* Clickable header: entire area (logo + title) resets app state and re-fetches data */}
      <header className="theme-header-glow mb-8 border-b border-navy-700 pb-6">
        <button
          type="button"
          onClick={handleHeaderClick}
          className="flex w-full min-w-0 max-w-full items-center gap-4 rounded-theme py-1 text-left focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-navy-950 cursor-pointer group"
          aria-label="Go to main page and reset filters"
        >
          <span className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-theme-lg bg-navy-800 ring-1 ring-navy-600">
            <Image
              src="/header-logo.png"
              alt=""
              width={56}
              height={56}
              className="object-contain p-1"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-gold-400">
              International Medical Software
            </p>
            <p className="mt-0.5 min-w-0 text-xl font-bold uppercase text-slate-100 break-words group-hover:text-white group-hover:underline underline-offset-2">
              Data Dictionary
            </p>
          </div>
        </button>
      </header>

      <div className="mb-6 flex min-w-0 flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
          Select Table
        </label>
        <TableSelector
          tables={tableNames}
          selectedTable={selectedTable}
          onTableChange={setSelectedTable}
          onDropdownOpen={handleDropdownOpen}
          onExportExcel={async () => {
            setExportNotification(null);
            try {
              await exportToExcel(filteredColumns);
              setExportNotification({ type: "success" });
            } catch (e) {
              setExportNotification({
                type: "error",
                message: e instanceof Error ? e.message : "Export failed",
              });
            }
          }}
          search={searchComment}
          onSearchChange={setSearchComment}
          searchColumnName={searchColumnName}
          onSearchColumnNameChange={setSearchColumnName}
          loading={loading}
          exportDisabled={filteredColumns.length === 0}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-theme border border-error/30 bg-error/10 px-4 py-3 text-sm text-error-soft">
          {error}
        </div>
      )}

      <div className="w-full min-w-0 overflow-hidden">
        <div className="theme-card w-full min-w-0 p-6">
          {selectedTable && (
            <h2 className="mb-4 min-w-0 text-lg font-semibold text-slate-100">
              Table: {selectedTable === ALL_TABLES_VALUE ? "All Tables" : selectedTable}
            </h2>
          )}
          <div className="w-full min-w-0 overflow-x-auto rounded-theme border border-navy-700">
            <table className="w-full table-fixed divide-y divide-navy-700">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[32%]" />
              </colgroup>
              <thead className="bg-navy-800">
                <tr className="border-b-2 border-gold-500/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Data Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Length
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Precision
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Nullable
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Default
                  </th>
                  <th className="min-w-0 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Comment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700 bg-navy-900/50">
                {emptyMessage && !showDataRows
                  ? renderEmptyRow(emptyMessage)
                  : currentRows.map((row) => (
                      <tr
                        key={`${row.table_name}-${row.column_name}`}
                        className="transition-colors hover:bg-navy-800/60"
                      >
                        {selectedTable === ALL_TABLES_VALUE ? (
                          <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 font-mono text-sm text-slate-300">
                            {row.table_name}
                          </td>
                        ) : (
                          <td className="px-4 py-2 text-sm text-navy-600" />
                        )}
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 font-mono text-sm text-slate-100">
                          {row.column_name}
                        </td>
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 font-mono text-sm text-slate-300">
                          {row.data_type}
                        </td>
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 text-sm text-slate-400">
                          {dash(row.character_maximum_length)}
                        </td>
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 text-sm text-slate-400">
                          {dash(row.numeric_precision)}
                        </td>
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2">
                          {row.is_nullable === "NO" ? (
                            <span className="inline-flex rounded bg-error/20 px-1.5 py-0.5 text-xs font-medium text-error-soft">
                              NOT NULL
                            </span>
                          ) : (
                            <span className="inline-flex rounded bg-success/20 px-1.5 py-0.5 text-xs font-medium text-accent-teal">
                              NULL
                            </span>
                          )}
                        </td>
                        <td className="truncate whitespace-nowrap overflow-hidden px-4 py-2 text-sm text-slate-400">
                          {dash(row.column_default)}
                        </td>
                        <td className="min-w-0 break-words whitespace-normal px-4 py-2 text-sm text-slate-400">
                          {dash(row.column_comment)}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {showPagination && showDataRows && (
            <div className="flex min-w-0 items-center justify-center gap-4 border-t border-navy-700 px-4 py-3">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-theme border border-gold-500/50 bg-navy-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:border-gold-500/80 disabled:opacity-50 disabled:border-navy-600"
              >
                Prev
              </button>
              <span className="text-sm text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-theme border border-gold-500/50 bg-navy-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-navy-700 hover:border-gold-500/80 disabled:opacity-50 disabled:border-navy-600"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
