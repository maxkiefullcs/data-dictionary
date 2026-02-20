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
import RelationshipPanel from "@/components/RelationshipPanel";

const ROWS_PER_PAGE = 10;
const ALL_TABLES_VALUE = "ALL";
const LAST_DB_STORAGE_KEY = "data_dictionary:last_connected_db";
const LAST_DB_HOST_STORAGE_KEY = "data_dictionary:last_connected_host";
const RELATIONSHIP_RETRY_COUNT = 1;
const RELATIONSHIP_RETRY_DELAY_MS = 800;

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

type RelationshipRow = {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  update_rule: string | null;
  delete_rule: string | null;
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

async function fetchSchema(dbKey?: string, host?: string): Promise<SchemaRow[]> {
  const params = new URLSearchParams();
  if (dbKey) params.set("db", dbKey);
  if (host) params.set("host", host);
  const q = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/schema${q}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json.data ?? [];
}

async function fetchRelationships(
  dbKey?: string,
  host?: string
): Promise<RelationshipRow[]> {
  const params = new URLSearchParams();
  if (dbKey) params.set("db", dbKey);
  if (host) params.set("host", host);
  const q = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/schema/relationships${q}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch relationships");
  return json.data ?? [];
}

async function fetchInferredRelationships(
  dbKey?: string,
  host?: string
): Promise<RelationshipRow[]> {
  const params = new URLSearchParams();
  if (dbKey) params.set("db", dbKey);
  if (host) params.set("host", host);
  const q = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/schema/relationships/inferred${q}`);
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.error ?? "Failed to fetch inferred relationships");
  return json.data ?? [];
}

async function connectDatabase(
  database: string,
  host?: string
): Promise<{ database: string; host: string }> {
  const res = await fetch("/api/db/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ database, host }),
  });
  const json = await res.json();
  if (!res.ok || json.status !== "connected") {
    throw new Error(json.error ?? "Failed to connect database");
  }
  const hostClean = String(json.host ?? "").replace(/\/\d+$/, "");
  return { database: json.database, host: hostClean };
}

async function exportToExcel(
  rows: SchemaRow[],
  dbKey?: string,
  host?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (dbKey) params.set("db", dbKey);
  if (host) params.set("host", host);
  const q = params.size > 0 ? `?${params.toString()}` : "";
  const res = await fetch(`/api/export/excel${q}`, {
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  task: () => Promise<T>,
  retries: number,
  delayMs: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
      await wait(delayMs * (attempt + 1));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export default function DataDictionaryPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dbInput, setDbInput] = useState("");
  const [hostInput, setHostInput] = useState("");
  const [connectedDatabase, setConnectedDatabase] = useState<string>("");
  const [connectedHost, setConnectedHost] = useState<string>("");
  const [connectingDatabase, setConnectingDatabase] = useState(false);
  const [dbStatusMessage, setDbStatusMessage] = useState<string | null>(null);
  const [showAutoConnectedBadge, setShowAutoConnectedBadge] = useState(false);
  const [autoConnectFailed, setAutoConnectFailed] = useState(false);
  const [autoConnectDatabase, setAutoConnectDatabase] = useState("");
  const [autoConnectHost, setAutoConnectHost] = useState("");
  const [data, setData] = useState<SchemaRow[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [searchComment, setSearchComment] = useState("");
  const [searchColumnName, setSearchColumnName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeView, setActiveView] = useState<"columns" | "relationships">(
    "columns"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipRow[]>([]);
  const [inferredRelationships, setInferredRelationships] = useState<
    RelationshipRow[]
  >([]);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [inferredRelationshipError, setInferredRelationshipError] =
    useState<string | null>(null);
  const [exportNotification, setExportNotification] =
    useState<ExportNotificationType>(null);
  const router = useRouter();

  const resetLoadedState = useCallback(() => {
    setData([]);
    setSelectedTable("");
    setSearchComment("");
    setSearchColumnName("");
    setRelationships([]);
    setInferredRelationships([]);
    setRelationshipError(null);
    setInferredRelationshipError(null);
  }, []);

  const load = useCallback(
    async (options?: { resetToDefaultState?: boolean }) => {
      const resetToDefaultState = options?.resetToDefaultState ?? false;
      if (!connectedDatabase) return;
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchSchema(connectedDatabase, connectedHost);
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
    [connectedDatabase, connectedHost]
  );

  const handleDropdownOpen = useCallback(() => {
    if (!connectedDatabase) {
      setError("Please connect to a database first.");
      return;
    }
    if (data.length === 0) load();
  }, [connectedDatabase, data.length, load]);

  const handleHeaderClick = useCallback(() => {
    setSelectedTable("");
    setSearchComment("");
    setSearchColumnName("");
    setCurrentPage(1);
    setActiveView("columns");
    setError(null);
    setRelationshipError(null);
    setExportNotification(null);
    router.push("/");
    load({ resetToDefaultState: true });
  }, [router, load]);

  const connectByName = useCallback(
    async (
      databaseName: string,
      hostName?: string,
      options?: { persist?: boolean; source?: "manual" | "auto" | "reconnect" }
    ) => {
      const requested = databaseName.trim();
      const requestedHost = (hostName ?? "").trim();
      const shouldPersist = options?.persist ?? true;
      const source = options?.source ?? "manual";
      if (source !== "auto") {
        setShowAutoConnectedBadge(false);
      }
      if (source !== "auto" && source !== "reconnect") {
        setAutoConnectFailed(false);
      }
      setDbStatusMessage(null);
      setError(null);
      setConnectingDatabase(true);
      try {
        const result = await connectDatabase(requested, requestedHost || undefined);
        setConnectedDatabase(result.database);
        setConnectedHost(result.host);
        setDbInput(result.database);
        setHostInput(result.host);
        setDbStatusMessage(`Connected to ${result.database}`);
        if (shouldPersist) {
          window.localStorage.setItem(LAST_DB_STORAGE_KEY, result.database);
          window.localStorage.setItem(LAST_DB_HOST_STORAGE_KEY, result.host);
        }
        if (source === "auto") {
          setShowAutoConnectedBadge(true);
          setAutoConnectFailed(false);
          setAutoConnectDatabase(result.database);
          setAutoConnectHost(result.host);
        } else if (source === "reconnect") {
          setAutoConnectFailed(false);
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to connect database";
        setDbStatusMessage(message);
        setConnectedDatabase("");
        setConnectedHost("");
        resetLoadedState();
        if (source === "auto" || source === "reconnect") {
          setAutoConnectFailed(true);
          setAutoConnectDatabase(requested);
          setAutoConnectHost(requestedHost);
        }
      } finally {
        setConnectingDatabase(false);
      }
    },
    [resetLoadedState]
  );

  const handleConnectDatabase = useCallback(async () => {
    const requested = dbInput.trim();
    const requestedHost = hostInput.trim();
    await connectByName(requested, requestedHost, { source: "manual" });
  }, [connectByName, dbInput, hostInput]);

  const handleDisconnectDatabase = useCallback(() => {
    setConnectedDatabase("");
    setConnectedHost("");
    setConnectingDatabase(false);
    setDbStatusMessage("Disconnected");
    setShowAutoConnectedBadge(false);
    setAutoConnectFailed(false);
    setAutoConnectDatabase("");
    setAutoConnectHost("");
    setError(null);
    resetLoadedState();
    window.localStorage.removeItem(LAST_DB_STORAGE_KEY);
    window.localStorage.removeItem(LAST_DB_HOST_STORAGE_KEY);
  }, [resetLoadedState]);

  const handleReconnectAuto = useCallback(async () => {
    const target = (autoConnectDatabase || dbInput).trim();
    const targetHost = (autoConnectHost || hostInput).trim();
    if (!target) return;
    await connectByName(target, targetHost, {
      persist: false,
      source: "reconnect",
    });
  }, [autoConnectDatabase, autoConnectHost, connectByName, dbInput, hostInput]);

  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_DB_STORAGE_KEY)?.trim() ?? "";
    const savedHost = (
      window.localStorage.getItem(LAST_DB_HOST_STORAGE_KEY)?.trim() ?? ""
    ).replace(/\/\d+$/, "");
    if (!saved) return;
    setDbInput(saved);
    setHostInput(savedHost);
    setAutoConnectDatabase(saved);
    setAutoConnectHost(savedHost);
    void connectByName(saved, savedHost, { persist: false, source: "auto" });
  }, [connectByName]);

  useEffect(() => {
    if (!connectedDatabase) return;
    window.localStorage.setItem(LAST_DB_STORAGE_KEY, connectedDatabase);
    if (connectedHost) {
      window.localStorage.setItem(LAST_DB_HOST_STORAGE_KEY, connectedHost);
    }
  }, [connectedDatabase, connectedHost]);

  useEffect(() => {
    setDbStatusMessage(null);
    setError(null);
  }, [dbInput, hostInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable, searchComment, searchColumnName]);

  useEffect(() => {
    if (!connectedDatabase) return;
    setData([]);
    setSelectedTable("");
    setSearchComment("");
    setSearchColumnName("");
    setRelationships([]);
    setInferredRelationships([]);
    setRelationshipError(null);
    setInferredRelationshipError(null);
    load({ resetToDefaultState: true });
  }, [connectedDatabase, load]);

  const loadRelationships = useCallback(async () => {
    if (!connectedDatabase) return;
    setRelationshipLoading(true);
    setRelationshipError(null);
    setInferredRelationshipError(null);
    try {
      const [constraintResult, inferredResult] = await Promise.allSettled([
        withRetry(
          () => fetchRelationships(connectedDatabase, connectedHost),
          RELATIONSHIP_RETRY_COUNT,
          RELATIONSHIP_RETRY_DELAY_MS
        ),
        withRetry(
          () => fetchInferredRelationships(connectedDatabase, connectedHost),
          RELATIONSHIP_RETRY_COUNT,
          RELATIONSHIP_RETRY_DELAY_MS
        ),
      ]);

      if (constraintResult.status === "fulfilled") {
        setRelationships(constraintResult.value);
      } else {
        setRelationshipError(constraintResult.reason?.message ?? "Failed to load relationships");
        setRelationships([]);
      }

      if (inferredResult.status === "fulfilled") {
        setInferredRelationships(inferredResult.value);
      } else {
        setInferredRelationshipError(
          inferredResult.reason?.message ?? "Failed to infer relationships"
        );
        setInferredRelationships([]);
      }
    } catch (e) {
      setRelationshipError(
        e instanceof Error ? e.message : "Failed to load relationships"
      );
      setRelationships([]);
    } finally {
      setRelationshipLoading(false);
    }
  }, [connectedDatabase, connectedHost]);

  const handleRetryRelationships = useCallback(() => {
    void loadRelationships();
  }, [loadRelationships]);

  useEffect(() => {
    if (activeView === "relationships" && relationships.length === 0) {
      loadRelationships();
    }
  }, [activeView, relationships.length, loadRelationships]);

  const handleJumpToColumn = useCallback(
    (tableName: string, columnName: string) => {
      setSelectedTable(tableName);
      setSearchColumnName(columnName);
      setSearchComment("");
      setCurrentPage(1);
      setActiveView("columns");
    },
    []
  );

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
  const resetDisabled =
    selectedTable === "" &&
    searchComment.trim() === "" &&
    searchColumnName.trim() === "" &&
    activeView === "columns";

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

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className={`absolute z-40 hidden h-10 w-8 items-center justify-center rounded-r-theme border border-l-0 border-navy-600 bg-navy-800 text-slate-200 shadow-lg transition-all duration-300 hover:bg-navy-700 md:flex ${
            isSidebarOpen ? "left-56 lg:left-72" : "left-0"
          }`}
          aria-expanded={isSidebarOpen}
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isSidebarOpen ? (
              <path d="M12.5 4.5L7 10l5.5 5.5" />
            ) : (
              <path d="M7.5 4.5L13 10l-5.5 5.5" />
            )}
          </svg>
        </button>
        <aside
          className={`${isSidebarOpen ? "block" : "hidden"} w-full shrink-0 border-b border-navy-700 bg-navy-900/50 p-4 md:absolute md:inset-y-0 md:left-0 md:z-30 md:block md:w-56 md:min-w-0 md:overflow-y-auto md:border-b-0 md:border-r md:transition-transform md:duration-300 lg:w-72 ${
            isSidebarOpen ? "md:translate-x-0" : "md:-translate-x-full"
          }`}
        >
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
              Database
            </label>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleConnectDatabase();
              }}
            >
              <input
                type="text"
                value={dbInput}
                onChange={(e) => setDbInput(e.target.value)}
                placeholder="e.g. imed_bhh"
                title={dbInput || "Database name"}
                className="w-full min-w-0 rounded-theme border border-navy-600 bg-navy-800 px-3 py-2 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
              <div className="flex items-center gap-2">
                <label className="shrink-0 text-[11px] text-slate-500">IP</label>
                <input
                  type="text"
                  value={hostInput}
                  onChange={(e) => setHostInput(e.target.value)}
                  placeholder="auto"
                  title={hostInput || "Database host IP (optional)"}
                  className="w-full min-w-0 rounded border border-navy-700 bg-navy-900/60 px-2 py-1 font-mono text-[11px] text-slate-400 placeholder-slate-600 focus:border-slate-500 focus:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={connectingDatabase}
                  className="shrink-0 rounded-theme bg-gold-500 px-3 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-600 disabled:opacity-50"
                >
                  {connectingDatabase ? "..." : "Connect"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectDatabase}
                  disabled={!connectedDatabase || connectingDatabase}
                  className="shrink-0 rounded-theme border border-navy-600 bg-navy-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-700 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </form>
            {connectedDatabase ? (
              showAutoConnectedBadge && (
                <span className="inline-flex w-fit rounded-full border border-gold-500/50 bg-gold-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-300">
                  Auto-connected
                </span>
              )
            ) : (
              <p className="text-xs text-slate-500">Not connected</p>
            )}
            {dbStatusMessage && (
              <p
                className={`text-xs ${
                  connectedDatabase ? "text-accent-teal" : "text-error-soft"
                }`}
              >
                {dbStatusMessage}
                {connectedDatabase && connectedHost && (
                  <span className="ml-1.5 text-accent-teal/70">
                    ({connectedHost})
                  </span>
                )}
              </p>
            )}
            {autoConnectFailed && !connectedDatabase && (
              <button
                type="button"
                onClick={handleReconnectAuto}
                disabled={connectingDatabase}
                className="w-fit rounded-theme border border-navy-600 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-navy-700 disabled:opacity-50"
              >
                Reconnect
              </button>
            )}

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
                  await exportToExcel(
                    filteredColumns,
                    connectedDatabase || undefined,
                    connectedHost || undefined
                  );
                  setExportNotification({ type: "success" });
                } catch (e) {
                  setExportNotification({
                    type: "error",
                    message: e instanceof Error ? e.message : "Export failed",
                  });
                }
              }}
              onResetSearch={() => {
                handleHeaderClick();
              }}
              search={searchComment}
              onSearchChange={setSearchComment}
              searchColumnName={searchColumnName}
              onSearchColumnNameChange={setSearchColumnName}
              loading={loading || !connectedDatabase}
              exportDisabled={!connectedDatabase || filteredColumns.length === 0}
              resetDisabled={resetDisabled}
            />
          </div>
        </aside>

        <div
          className={`flex flex-1 flex-col min-w-0 overflow-hidden p-4 transition-[padding] duration-300 md:p-6 ${
            isSidebarOpen ? "md:pl-[15.5rem] lg:pl-[20rem]" : "md:pl-6"
          }`}
        >
          <div className="mb-3 shrink-0 md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-theme border border-navy-600 bg-navy-800 text-slate-200 hover:bg-navy-700"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isSidebarOpen ? (
                  <path d="M12.5 4.5L7 10l5.5 5.5" />
                ) : (
                  <path d="M7.5 4.5L13 10l-5.5 5.5" />
                )}
              </svg>
            </button>
          </div>
          {error && (
            <div className="mb-4 rounded-theme border border-error/30 bg-error/10 px-4 py-3 text-sm text-error-soft shrink-0">
              {error}
            </div>
          )}

          <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
            <div className="theme-card flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="shrink-0 min-w-0 text-base sm:text-lg font-semibold text-slate-100 truncate">
                  Table:{" "}
                  {selectedTable
                    ? selectedTable === ALL_TABLES_VALUE
                      ? "All Tables"
                      : selectedTable
                    : "-"}
                </h2>
                <div className="inline-flex rounded-theme border border-navy-700 bg-navy-900/70 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveView("columns")}
                    className={`rounded-theme px-3 py-1.5 text-sm ${
                      activeView === "columns"
                        ? "bg-navy-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Columns
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView("relationships")}
                    className={`rounded-theme px-3 py-1.5 text-sm ${
                      activeView === "relationships"
                        ? "bg-navy-700 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Relationships
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-auto">
                {activeView === "columns" ? (
                  <SchemaTable
                    rows={currentRows}
                    showTableColumn={selectedTable === ALL_TABLES_VALUE}
                    emptyMessage={emptyMessage}
                  />
                ) : relationshipLoading ? (
                  <div className="rounded-theme border border-navy-700 bg-navy-900/40 px-4 py-12 text-center text-sm text-slate-400">
                    Loading relationships...
                  </div>
                ) : relationshipError ? (
                  <div className="rounded-theme border border-error/30 bg-error/10 px-4 py-3 text-sm text-error-soft">
                    <p>{relationshipError}</p>
                    <button
                      type="button"
                      onClick={handleRetryRelationships}
                      className="mt-3 rounded-theme border border-error/40 bg-error/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-error/30"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <RelationshipPanel
                    relationships={relationships}
                    inferredRelationships={inferredRelationships}
                    selectedTable={selectedTable}
                    allTablesValue={ALL_TABLES_VALUE}
                    onJumpToColumn={handleJumpToColumn}
                    inferredError={inferredRelationshipError}
                  />
                )}
              </div>
              {activeView === "columns" && showPagination && showDataRows && (
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
