"use client";

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
};

function dash<T>(v: T | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function rowKey(row: SchemaRow): string {
  return `${row.table_name}-${row.column_name}`;
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
}: {
  row: SchemaRow;
  showTableColumn: boolean;
}) {
  const fields: { label: string; value: React.ReactNode }[] = [
    { label: "Column", value: <span className="font-mono font-medium text-slate-100">{row.column_name}</span> },
    { label: "Data type", value: <span className="font-mono text-slate-300">{row.data_type}</span> },
    { label: "Length", value: <span className="font-mono text-slate-300">{dash(row.character_maximum_length)}</span> },
    { label: "Precision", value: <span className="font-mono text-slate-300">{dash(row.numeric_precision)}</span> },
    { label: "Nullable", value: <NullableBadge isNullable={row.is_nullable} /> },
    { label: "Default", value: <span className="font-mono text-slate-300 break-all">{dash(row.column_default)}</span> },
    { label: "Comment", value: <span className="whitespace-pre-wrap break-words text-slate-200 leading-relaxed">{dash(row.column_comment)}</span> },
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
}: {
  rows: SchemaRow[];
  showTableColumn: boolean;
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
              <td className="border-b border-navy-700/80 px-3 py-2.5 align-top text-xs text-slate-200 min-w-0 whitespace-pre-wrap break-words leading-relaxed">
                {dash(row.column_comment)}
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
          />
        ))}
      </div>

      <div className="hidden lg:block min-h-0">
        <AdminTable rows={rows} showTableColumn={showTableColumn} />
      </div>
    </div>
  );
}
