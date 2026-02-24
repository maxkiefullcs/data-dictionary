"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export type SchemaRow = {
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

type SchemaTableProps = {
  rows: SchemaRow[];
  showTableColumn: boolean;
  emptyMessage: string | null;
  onCommentSave?: (
    tableName: string,
    columnName: string,
    comment: string
  ) => Promise<void>;
};

function dash<T>(v: T | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function rowKey(row: SchemaRow): string {
  return `${row.table_name}-${row.column_name}`;
}

function EditableComment({
  tableName,
  columnName,
  initialComment,
  onSave,
  className = "",
  compact = false,
}: {
  tableName: string;
  columnName: string;
  initialComment: string | null;
  onSave?: (table: string, column: string, comment: string) => Promise<void>;
  className?: string;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialComment ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayText = initialComment ?? "";
  const canEdit = typeof onSave === "function";

  useEffect(() => {
    setValue(initialComment ?? "");
  }, [initialComment]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(value.length, value.length);
    }
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(tableName, columnName, value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [onSave, tableName, columnName, value]);

  const handleCancel = useCallback(() => {
    setValue(initialComment ?? "");
    setEditing(false);
  }, [initialComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCancel]
  );

  if (!canEdit) {
    return (
      <span className={`whitespace-pre-wrap break-words ${className}`}>
        {dash(initialComment)}
      </span>
    );
  }

  if (editing) {
    return (
      <div className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={compact ? 2 : 3}
          className="w-full min-w-0 rounded border border-navy-600 bg-navy-800 px-2 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/50 resize-y"
          placeholder="Comment..."
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-gold-500 px-2 py-1 text-xs font-medium text-navy-950 hover:bg-gold-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="rounded border border-navy-600 bg-navy-800 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-navy-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className={`group cursor-pointer min-w-0 rounded border border-transparent hover:border-navy-600 ${className}`}
      title="Click to edit comment"
    >
      <span className="whitespace-pre-wrap break-words text-slate-200 leading-relaxed">
        {dash(displayText)}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-1 inline-block shrink-0 opacity-0 group-hover:opacity-70 text-slate-400"
        aria-hidden
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </div>
  );
}

function NullableBadge({ isNullable }: { isNullable: string }) {
  const isNotNull = isNullable === "NO";
  return (
    <span
      className={
        isNotNull
          ? "inline-flex rounded bg-error/20 px-2 py-0.5 text-xs font-medium text-error-soft"
          : "inline-flex rounded bg-success/20 px-2 py-0.5 text-xs font-medium text-accent-teal"
      }
    >
      {isNotNull ? "NOT NULL" : "NULL"}
    </span>
  );
}

const COL = {
  table: "var(--schema-table-col)",
  name: "var(--schema-table-name)",
  type: "var(--schema-table-type)",
  len: "var(--schema-table-len)",
  prec: "var(--schema-table-prec)",
  null: "var(--schema-table-null)",
  default: "var(--schema-table-default)",
  commentMin: "var(--schema-table-comment-min)",
  commentMax: "var(--schema-table-comment-max)",
} as const;

function ColumnCardFull({
  row,
  showTableColumn,
  onCommentSave,
}: {
  row: SchemaRow;
  showTableColumn: boolean;
  onCommentSave?: (table: string, column: string, comment: string) => Promise<void>;
}) {
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Column", value: <span className="font-mono font-medium text-slate-100">{row.column_name}</span> },
    { label: "Data type", value: <span className="font-mono text-slate-300">{row.data_type}</span> },
    { label: "Length", value: <span className="font-mono text-slate-300">{dash(row.character_maximum_length)}</span> },
    { label: "Precision", value: <span className="font-mono text-slate-300">{dash(row.numeric_precision)}</span> },
    { label: "Nullable", value: <NullableBadge isNullable={row.is_nullable} /> },
    { label: "Default", value: <span className="font-mono text-slate-300 break-all">{dash(row.column_default)}</span> },
    {
      label: "Comment",
      value: (
        <EditableComment
          tableName={row.table_name}
          columnName={row.column_name}
          initialComment={row.column_comment}
          onSave={onCommentSave}
          compact
        />
      ),
    },
  ];
  if (showTableColumn) {
    fields.unshift({
      label: "Table",
      value: <span className="font-mono text-slate-300">{row.table_name}</span>,
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-navy-600 bg-navy-800/50 shadow-sm">
      <div className="divide-y divide-navy-700">
        {fields.map(({ label, value }) => (
          <div key={label} className="px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">{label}</dt>
            <dd className="min-w-0 text-sm">{value}</dd>
          </div>
        ))}
      </div>
    </article>
  );
}

function AdminTable({
  rows,
  showTableColumn,
  onCommentSave,
}: {
  rows: SchemaRow[];
  showTableColumn: boolean;
  onCommentSave?: (table: string, column: string, comment: string) => Promise<void>;
}) {
  return (
    <div className="schema-table-wrap min-h-0 min-w-0 overflow-auto rounded-lg border border-navy-600">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          {showTableColumn && <col style={{ width: COL.table }} />}
          <col style={{ width: COL.name }} />
          <col style={{ width: COL.type }} />
          <col style={{ width: COL.len }} />
          <col style={{ width: COL.prec }} />
          <col style={{ width: COL.null }} />
          <col style={{ width: COL.default }} />
          <col style={{ minWidth: COL.commentMin, maxWidth: COL.commentMax }} />
        </colgroup>
        <thead>
          <tr>
            {showTableColumn && (
              <th className="sticky-left-0 w-0 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Table
              </th>
            )}
            <th
              className={
                showTableColumn
                  ? "sticky-left-1 w-0 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300"
                  : "sticky-left-0 w-0 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300"
              }
            >
              Column Name
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Data Type
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
              Length
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
              Precision
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300 whitespace-nowrap">
              Nullable
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Default
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Comment
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={i % 2 === 0 ? "bg-navy-900/30" : "bg-navy-900/50"}
            >
              {showTableColumn && (
                <td className="sticky-left-0 border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs text-slate-300 break-words">
                  {row.table_name}
                </td>
              )}
              <td
                className={
                  showTableColumn
                    ? "sticky-left-1 border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs font-medium text-slate-100 break-all"
                    : "sticky-left-0 border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs font-medium text-slate-100 break-all"
                }
              >
                {row.column_name}
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs text-slate-300 break-words">
                {row.data_type}
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs text-slate-400 whitespace-nowrap">
                {dash(row.character_maximum_length)}
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs text-slate-400 whitespace-nowrap">
                {dash(row.numeric_precision)}
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top whitespace-nowrap">
                <NullableBadge isNullable={row.is_nullable} />
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top font-mono text-xs text-slate-300 min-w-0 whitespace-pre-wrap break-all">
                {dash(row.column_default)}
              </td>
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top text-xs min-w-0">
                <EditableComment
                  tableName={row.table_name}
                  columnName={row.column_name}
                  initialComment={row.column_comment}
                  onSave={onCommentSave}
                  className="text-slate-200"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SchemaTable({
  rows,
  showTableColumn,
  emptyMessage,
  onCommentSave,
}: SchemaTableProps) {
  if (emptyMessage && rows.length === 0) {
    return (
      <div className="rounded-lg border border-navy-600 bg-navy-800/30 px-6 py-16 text-center">
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="flex flex-col gap-4 lg:hidden">
        {rows.map((row) => (
          <ColumnCardFull
            key={rowKey(row)}
            row={row}
            showTableColumn={showTableColumn}
            onCommentSave={onCommentSave}
          />
        ))}
      </div>

      <div className="hidden lg:block min-h-0">
        <AdminTable
          rows={rows}
          showTableColumn={showTableColumn}
          onCommentSave={onCommentSave}
        />
      </div>
    </div>
  );
}
