"use client";

import { useState, useCallback } from "react";

export type SchemaColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

type ForeignKey = {
  from_column: string;
  to_table: string;
  to_column: string;
};

type ColumnTableProps = {
  columns: SchemaColumn[];
  foreignKeys: ForeignKey[];
  tableName: string;
  isEmpty: boolean;
};

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-600 dark:text-green-400"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function ColumnTable({
  columns,
  foreignKeys,
  tableName,
  isEmpty,
}: ColumnTableProps) {
  const [copiedColumn, setCopiedColumn] = useState<string | null>(null);

  const fkByColumn = Object.fromEntries(
    foreignKeys.map((fk) => [fk.from_column, fk])
  );

  const handleCopy = useCallback((columnName: string) => {
    navigator.clipboard.writeText(columnName).then(() => {
      setCopiedColumn(columnName);
      setTimeout(() => setCopiedColumn(null), 2000);
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Column
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Nullable
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Default
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              References
            </th>
            <th className="w-12 px-2 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Copy
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {isEmpty && (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
              >
                {tableName
                  ? "No columns to display."
                  : "Select a table and click Load."}
              </td>
            </tr>
          )}
          {columns.map((col) => {
            const fk = fkByColumn[col.column_name];
            const isCopied = copiedColumn === col.column_name;
            return (
              <tr
                key={col.column_name}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-gray-800 dark:text-gray-100">
                  {col.column_name}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">
                  {col.data_type}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  {col.is_nullable === "NO" ? (
                    <span className="inline-flex rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                      NOT NULL
                    </span>
                  ) : (
                    col.is_nullable
                  )}
                </td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">
                  {col.column_default ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-300">
                  {fk ? (
                    <span className="text-gray-700 dark:text-gray-200">
                      → {fk.to_table}.{fk.to_column}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleCopy(col.column_name)}
                    className="inline-flex items-center justify-center rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Copy column name"
                  >
                    {isCopied ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckIcon />
                        Copied!
                      </span>
                    ) : (
                      <CopyIcon />
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
