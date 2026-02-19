"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Pagination from "@/components/Pagination";
import RelationshipDiagram from "@/components/RelationshipDiagram";

export type RelationshipRow = {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  update_rule: string | null;
  delete_rule: string | null;
};

type RelationshipPanelProps = {
  relationships: RelationshipRow[];
  inferredRelationships: RelationshipRow[];
  selectedTable: string;
  allTablesValue: string;
  onJumpToColumn: (tableName: string, columnName: string) => void;
  inferredError?: string | null;
};

type SourceMode = "constraints" | "inferred";
type RelationshipViewMode = "list" | "diagram";
const RELATIONSHIP_ROWS_PER_PAGE = 50;
const PANEL_PREVIEW_LIMIT = 25;

function CellMono({ value }: { value: string }) {
  return <span className="font-mono text-xs text-slate-200 break-all">{value}</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-theme border border-navy-700 bg-navy-900/40 px-4 py-12 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 rounded-full border border-navy-600 bg-navy-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-navy-700"
      title="Clear this filter"
    >
      <span>{label}</span>
      <span className="text-slate-500">x</span>
    </button>
  );
}

async function downloadRelationshipsExcel(args: {
  rows: RelationshipRow[];
  sourceMode: SourceMode;
  selectedTable: string;
  allTablesValue: string;
}): Promise<void> {
  const res = await fetch("/api/export/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Export relationships failed");
  }
  const blob = await res.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Relationships_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function RelationshipPanel({
  relationships,
  inferredRelationships,
  selectedTable,
  allTablesValue,
  onJumpToColumn,
  inferredError,
}: RelationshipPanelProps) {
  const [search, setSearch] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("constraints");
  const [relationshipPage, setRelationshipPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<RelationshipViewMode>("list");
  const [showOutbound, setShowOutbound] = useState(true);
  const [showInbound, setShowInbound] = useState(true);
  const [showRelationshipList, setShowRelationshipList] = useState(true);
  const listSectionRef = useRef<HTMLElement | null>(null);

  const scoped = useMemo(
    () =>
      selectedTable === allTablesValue
        ? sourceMode === "constraints"
          ? relationships
          : inferredRelationships
        : (sourceMode === "constraints" ? relationships : inferredRelationships).filter(
            (r) =>
              r.source_table === selectedTable || r.target_table === selectedTable
          ),
    [relationships, inferredRelationships, sourceMode, selectedTable, allTablesValue]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((r) =>
      [
        r.source_table,
        r.source_column,
        r.target_table,
        r.target_column,
        r.constraint_name,
        r.update_rule ?? "",
        r.delete_rule ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [scoped, search]);

  const showInboundOutbound = selectedTable !== allTablesValue && scoped.length > 0;
  const outbound = scoped.filter((r) => r.source_table === selectedTable);
  const inbound = scoped.filter((r) => r.target_table === selectedTable);
  const outboundPreview = outbound.slice(0, PANEL_PREVIEW_LIMIT);
  const inboundPreview = inbound.slice(0, PANEL_PREVIEW_LIMIT);
  const showRelationshipPagination =
    selectedTable === allTablesValue &&
    filtered.length > RELATIONSHIP_ROWS_PER_PAGE;
  const totalRelationshipPages =
    Math.ceil(filtered.length / RELATIONSHIP_ROWS_PER_PAGE) || 1;
  const safeRelationshipPage = Math.min(relationshipPage, totalRelationshipPages);
  const pagedRows =
    selectedTable === allTablesValue
      ? filtered.slice(
          (safeRelationshipPage - 1) * RELATIONSHIP_ROWS_PER_PAGE,
          safeRelationshipPage * RELATIONSHIP_ROWS_PER_PAGE
        )
      : filtered;

  useEffect(() => {
    setRelationshipPage(1);
  }, [
    search,
    sourceMode,
    selectedTable,
    relationships.length,
    inferredRelationships.length,
  ]);

  useEffect(() => {
    if (viewMode !== "list") return;
    setShowOutbound(true);
    setShowInbound(true);
    setShowRelationshipList(true);
  }, [selectedTable, sourceMode, viewMode]);

  if (!selectedTable) {
    return <EmptyState message="Please select a table to view relationships." />;
  }

  const activeFilterCount =
    Number(sourceMode !== "constraints") +
    Number(search.trim().length > 0);

  const clearAllFilters = () => {
    setSourceMode("constraints");
    setSearch("");
  };

  const jumpToList = () => {
    setViewMode("list");
    requestAnimationFrame(() => {
      listSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4">
      <section className="sticky top-2 z-20 rounded-theme border border-navy-700 bg-navy-900/95 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-52">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Relationship Source
            </label>
            <div className="inline-flex w-full rounded-theme border border-navy-700 bg-navy-900/70 p-1">
              <button
                type="button"
                onClick={() => setSourceMode("constraints")}
                className={`flex-1 rounded-theme px-2 py-1.5 text-xs ${
                  sourceMode === "constraints"
                    ? "bg-navy-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Constraints
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("inferred")}
                className={`flex-1 rounded-theme px-2 py-1.5 text-xs ${
                  sourceMode === "inferred"
                    ? "bg-navy-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Inferred
              </button>
            </div>
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Search relationships
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="table, column, constraint..."
              className="w-full rounded-theme border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              View
            </label>
            <div className="inline-flex w-full rounded-theme border border-navy-700 bg-navy-900/70 p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex-1 rounded-theme px-2 py-1.5 text-xs ${
                  viewMode === "list"
                    ? "bg-navy-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("diagram")}
                className={`flex-1 rounded-theme px-2 py-1.5 text-xs ${
                  viewMode === "diagram"
                    ? "bg-navy-700 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Diagram
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              setExportError(null);
              setExporting(true);
              try {
                await downloadRelationshipsExcel({
                  rows: filtered,
                  sourceMode,
                  selectedTable,
                  allTablesValue,
                });
              } catch (e) {
                setExportError(
                  e instanceof Error ? e.message : "Export relationships failed"
                );
              } finally {
                setExporting(false);
              }
            }}
            disabled={filtered.length === 0 || exporting}
            className="rounded-theme bg-gold-500 px-3 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-600 disabled:opacity-50"
          >
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {sourceMode !== "constraints" && (
            <FilterChip
              label="Source: Inferred"
              onClear={() => setSourceMode("constraints")}
            />
          )}
          {search.trim() && (
            <FilterChip
              label={`Search: ${search.trim().slice(0, 24)}`}
              onClear={() => setSearch("")}
            />
          )}
          {activeFilterCount > 1 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
        {sourceMode === "constraints" && scoped.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">
            No FK constraints found for this selection. Try switching to{" "}
            <span className="font-semibold text-slate-300">Inferred</span>.
          </p>
        )}
        {sourceMode === "inferred" && inferredError && (
          <p className="mt-3 text-xs text-error-soft">{inferredError}</p>
        )}
        {sourceMode === "inferred" && !inferredError && (
          <p className="mt-3 text-xs text-slate-500">
            Inferred mode uses naming convention (e.g. <span className="font-mono">*_id</span> to <span className="font-mono">table.id</span>).
          </p>
        )}
        {exportError && (
          <p className="mt-2 text-xs text-error-soft">{exportError}</p>
        )}
      </section>

      {viewMode === "diagram" && (
        <RelationshipDiagram
          rows={filtered}
          selectedTable={selectedTable}
          allTablesValue={allTablesValue}
          onJumpToColumn={onJumpToColumn}
        />
      )}

      {viewMode === "list" && showInboundOutbound && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="rounded-theme border border-navy-700 bg-navy-900/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Outbound ({outbound.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowOutbound((prev) => !prev)}
                className="rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
              >
                {showOutbound ? "Hide" : "Show"}
              </button>
            </div>
            {showOutbound &&
              (outbound.length === 0 ? (
                <p className="text-sm text-slate-400">No outbound relationships.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {outboundPreview.map((r) => (
                      <li
                        key={`${r.constraint_name}-${r.source_column}-${r.target_column}`}
                        className="flex flex-col gap-2 rounded border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-mono text-xs leading-relaxed text-slate-200 break-all">
                            {r.source_column} <span className="mx-1 text-slate-500">→</span>{" "}
                            {r.target_table}.{r.target_column}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToColumn(r.target_table, r.target_column)}
                          className="shrink-0 self-start rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
                        >
                          Open Target
                        </button>
                      </li>
                    ))}
                  </ul>
                  {outbound.length > PANEL_PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={jumpToList}
                      className="mt-3 text-xs text-gold-300 underline-offset-2 hover:underline"
                    >
                      View all outbound in list ({outbound.length})
                    </button>
                  )}
                </>
              ))}
          </section>

          <section className="rounded-theme border border-navy-700 bg-navy-900/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Inbound ({inbound.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowInbound((prev) => !prev)}
                className="rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
              >
                {showInbound ? "Hide" : "Show"}
              </button>
            </div>
            {showInbound &&
              (inbound.length === 0 ? (
                <p className="text-sm text-slate-400">No inbound relationships.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {inboundPreview.map((r) => (
                      <li
                        key={`${r.constraint_name}-${r.source_column}-${r.target_column}`}
                        className="flex flex-col gap-2 rounded border border-navy-700 bg-navy-800/60 px-3 py-2 text-sm sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="font-mono text-xs leading-relaxed text-slate-200 break-all">
                            {r.source_table}.{r.source_column}
                            <span className="mx-1 text-slate-500">→</span>
                            {r.target_column}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onJumpToColumn(r.source_table, r.source_column)}
                          className="shrink-0 self-start rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
                        >
                          Open Source
                        </button>
                      </li>
                    ))}
                  </ul>
                  {inbound.length > PANEL_PREVIEW_LIMIT && (
                    <button
                      type="button"
                      onClick={jumpToList}
                      className="mt-3 text-xs text-gold-300 underline-offset-2 hover:underline"
                    >
                      View all inbound in list ({inbound.length})
                    </button>
                  )}
                </>
              ))}
          </section>
        </div>
      )}

      {viewMode === "list" && (
        <>
          <section
            ref={listSectionRef}
            className="min-h-0 min-w-0 overflow-hidden rounded-theme border border-navy-700 bg-navy-900/50"
          >
            <div className="border-b border-navy-700 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-200">
                  Relationship List ({filtered.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRelationshipList((prev) => !prev)}
                  className="rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
                >
                  {showRelationshipList ? "Hide" : "Show"}
                </button>
                {selectedTable === allTablesValue && (
                  <p className="text-xs text-slate-500">
                    All Tables mode: use search and pagination for better performance.
                  </p>
                )}
              </div>
            </div>
            {showRelationshipList && (
              <div className="min-w-0 overflow-x-auto overflow-y-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-navy-800">
                  <tr>
                    <th className="w-[19%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Source
                    </th>
                    <th className="w-[19%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Target
                    </th>
                    <th className="w-[25%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Constraint
                    </th>
                    <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      On Update
                    </th>
                    <th className="w-[12%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      On Delete
                    </th>
                    <th className="w-[13%] px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {pagedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10 text-center text-sm text-slate-400"
                      >
                        No relationships found for current filters.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((r) => (
                      <tr
                        key={`${r.constraint_name}-${r.source_column}-${r.target_column}-${r.source_table}`}
                        className="hover:bg-navy-800/50"
                      >
                        <td className="px-3 py-2.5 align-top">
                          <CellMono value={`${r.source_table}.${r.source_column}`} />
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <CellMono value={`${r.target_table}.${r.target_column}`} />
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs text-slate-300 font-mono break-all">
                          {r.constraint_name}
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs text-slate-400 break-words">
                          {r.update_rule ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 align-top text-xs text-slate-400 break-words">
                          {r.delete_rule ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                onJumpToColumn(r.source_table, r.source_column)
                              }
                              className="rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
                            >
                              Source
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onJumpToColumn(r.target_table, r.target_column)
                              }
                              className="rounded border border-navy-600 px-2 py-1 text-xs text-slate-300 hover:bg-navy-700"
                            >
                              Target
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            )}
          </section>

          {showRelationshipList && showRelationshipPagination && (
            <Pagination
              currentPage={safeRelationshipPage}
              totalPages={totalRelationshipPages}
              onPageChange={setRelationshipPage}
            />
          )}
        </>
      )}
    </div>
  );
}
