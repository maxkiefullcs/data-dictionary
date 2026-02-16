"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TableSelector from "@/components/TableSelector";
import {
  ExportNotification,
  type ExportNotificationType,
} from "@/components/ExportNotification";
import Pagination from "@/components/Pagination";
import SchemaTable from "@/components/SchemaTable";

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

  function getEmptyMessage() {
    if (!selectedTable) return "Please select a table to view column details.";
    if (rows.length === 0) return "No columns found for this table.";
    if (filteredColumns.length === 0) return "No matching columns found.";
    return null;
  }

  const emptyMessage = getEmptyMessage();
  const showDataRows = selectedTable && filteredColumns.length > 0;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      <ExportNotification
        notification={exportNotification}
        onDismiss={() => setExportNotification(null)}
      />

      <header className="theme-header-glow shrink-0 border-b border-navy-700 px-4 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          onClick={handleHeaderClick}
          className="flex w-full min-w-0 max-w-full items-center gap-3 sm:gap-4 rounded-theme py-1 text-left focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-navy-950 cursor-pointer group"
          aria-label="Go to main page and reset filters"
        >
          <span className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-theme-lg bg-navy-800 ring-1 ring-navy-600">
            <Image
              src="/header-logo.png"
              alt=""
              width={56}
              height={56}
              className="object-contain p-1"
            />
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gold-400 truncate">
              International Medical Software
            </p>
            <p className="mt-0.5 min-w-0 text-base sm:text-xl font-bold uppercase text-slate-100 break-words group-hover:text-white group-hover:underline underline-offset-2 truncate">
              Data Dictionary
            </p>
          </div>
        </button>
      </header>

      <div className="flex flex-1 flex-col min-h-0 md:flex-row md:overflow-hidden">
        <aside className="w-full shrink-0 border-b border-navy-700 bg-navy-900/50 p-4 md:border-b-0 md:border-r md:w-56 md:min-w-0 md:overflow-y-auto lg:w-72">
          <div className="flex flex-col gap-4">
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
        </aside>

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden p-4 md:p-6">
          {error && (
            <div className="mb-4 rounded-theme border border-error/30 bg-error/10 px-4 py-3 text-sm text-error-soft shrink-0">
              {error}
            </div>
          )}

          <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="theme-card flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden p-4 sm:p-6">
              {selectedTable && (
                <h2 className="mb-4 shrink-0 min-w-0 text-base sm:text-lg font-semibold text-slate-100 truncate">
                  Table:{" "}
                  {selectedTable === ALL_TABLES_VALUE
                    ? "All Tables"
                    : selectedTable}
                </h2>
              )}
              <div className="flex-1 min-h-0 min-w-0 overflow-auto">
                <SchemaTable
                  rows={currentRows}
                  showTableColumn={selectedTable === ALL_TABLES_VALUE}
                  emptyMessage={emptyMessage}
                />
              </div>
              {showPagination && showDataRows && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
