"use client";

import { useState, useRef, useEffect } from "react";

const ALL_TABLES_VALUE = "ALL";
const ALL_TABLES_LABEL = "All Tables";
const EMPTY_LABEL = "-";

function getLabel(value: string): string {
  if (value === "") return EMPTY_LABEL;
  if (value === ALL_TABLES_VALUE) return ALL_TABLES_LABEL;
  return value;
}

const inputBaseClass =
  "w-full min-w-0 max-w-56 rounded-theme border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50";

type TableSelectorProps = {
  tables: string[];
  selectedTable: string;
  onTableChange: (table: string) => void;
  onDropdownOpen?: () => void;
  onExportExcel: () => void | Promise<void>;
  onResetSearch: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchColumnName: string;
  onSearchColumnNameChange: (value: string) => void;
  loading: boolean;
  exportDisabled: boolean;
  resetDisabled: boolean;
};

export default function TableSelector({
  tables,
  selectedTable,
  onTableChange,
  onDropdownOpen,
  onExportExcel,
  onResetSearch,
  search,
  onSearchChange,
  searchColumnName,
  onSearchColumnNameChange,
  loading,
  exportDisabled,
  resetDisabled,
}: TableSelectorProps) {
  const [tableQuery, setTableQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options: { value: string; label: string }[] = [
    { value: "", label: EMPTY_LABEL },
    { value: ALL_TABLES_VALUE, label: ALL_TABLES_LABEL },
    ...tables.map((t) => ({ value: t, label: t })),
  ];

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(tableQuery.toLowerCase())
  );

  const displayValue =
    showDropdown ? tableQuery : selectedTable === "" ? "" : getLabel(selectedTable);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(value: string) {
    onTableChange(value);
    setShowDropdown(false);
    setTableQuery("");
  }

  function handleInputFocus() {
    setShowDropdown(true);
    setTableQuery("");
    onDropdownOpen?.();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setTableQuery(v);
    setShowDropdown(true);
    if (v === "") {
      onTableChange("");
    }
  }

  function renderDropdownContent() {
    if (loading && tables.length === 0) {
      return (
        <li className="px-3 py-2 text-sm text-slate-400">Loading...</li>
      );
    }
    if (filteredOptions.length === 0) {
      return (
        <li className="px-3 py-2 text-sm text-slate-400">No tables found</li>
      );
    }
    return filteredOptions.map((opt) => (
      <li
        key={opt.value === "" ? "__empty__" : opt.value}
        role="option"
        aria-selected={selectedTable === opt.value}
        onMouseDown={(e) => {
          e.preventDefault();
          handleSelect(opt.value);
        }}
        className={`cursor-pointer px-3 py-2 text-sm rounded-theme text-slate-200 hover:bg-navy-700 hover:text-white ${
          selectedTable === opt.value ? "bg-navy-700/80 text-gold-400" : ""
        }`}
      >
        {opt.label}
      </li>
    ));
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full min-w-0 sm:max-w-56" ref={containerRef}>
        <label className="sr-only" htmlFor="table-combobox">
          Select Table
        </label>
        <input
          id="table-combobox"
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={EMPTY_LABEL}
          disabled={loading}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          className="w-full min-w-0 rounded-theme border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
        />
        {showDropdown && (
          <ul
            className="absolute z-10 mt-1 max-h-60 w-full min-w-[14rem] max-w-56 overflow-auto rounded-theme-lg border border-navy-600 bg-navy-900 py-1 shadow-theme-md"
            role="listbox"
          >
            {renderDropdownContent()}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 min-w-0">
        <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
          Search Column Name:
        </label>
        <div className="relative w-full min-w-0 sm:max-w-56">
          <input
            type="text"
            placeholder="Filter by column name..."
            value={searchColumnName}
            onChange={(e) => onSearchColumnNameChange(e.target.value)}
            className={`${inputBaseClass} pr-8`}
          />
          {searchColumnName.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchColumnNameChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-navy-700 hover:text-white"
              aria-label="Clear column name filter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 min-w-0">
        <label className="text-sm font-medium text-slate-400 whitespace-nowrap">
          Search Comment:
        </label>
        <input
          type="search"
          placeholder="Search column comment..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={inputBaseClass}
        />
      </div>
      <button
        type="button"
        onClick={() => onExportExcel()}
        disabled={exportDisabled}
        className="w-full shrink-0 rounded-theme bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
      >
        Export
      </button>
      <button
        type="button"
        onClick={onResetSearch}
        disabled={resetDisabled}
        className="w-full shrink-0 rounded-theme border border-navy-600 bg-navy-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
      >
        Reset
      </button>
    </div>
  );
}
