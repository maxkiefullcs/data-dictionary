/**
 * Enterprise Data Dictionary Excel builder.
 * - Sheet 1: "Cover" (presentation only: title, System Name = connected DB name, Date, Summary, Description; no Prepared For / Version)
 * - Sheet 2: "All Tables" (combined view, 6 columns, auto column width)
 * - Sheet 3+: One sheet per table (5 columns each, no Business Purpose, auto column width)
 *
 * Input rows: Table/table, Column Name/column_name, Data Type/data_type,
 * Length/length, Nullable/nullable/is_nullable, Comment/comment/column_comment.
 * Precision and Default are not used in output.
 */

import ExcelJS from "exceljs";

export type DictionaryRow = Record<
  string,
  string | number | null | undefined
>;

// Corporate blue #1F4E78 (ARGB)
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E78" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};
const ALTERNATING_ROW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" },
};

const TYPE_MAP: Record<string, string> = {
  character: "Text",
  "character varying": "Text",
  varchar: "Text",
  char: "Text",
  text: "Text",
  "double precision": "Number",
  double: "Number",
  integer: "Number",
  int: "Number",
  bigint: "Number",
  smallint: "Number",
  numeric: "Number",
  decimal: "Number",
  real: "Number",
  "timestamp without time zone": "DateTime",
  "timestamp with time zone": "DateTime",
  timestamp: "DateTime",
  date: "Date",
  time: "Time",
  boolean: "Yes/No",
  bool: "Yes/No",
};

const COL_WIDTHS_TABLE = [25, 15, 12, 12, 45]; // Column Name, Data Type, Length, Required, Description
const COL_WIDTHS_ALL = [25, 15, 12, 12, 45]; // Column Name, Data Type, Length, Required, Description (grouped by table)

const DATA_COLS = [
  "Column Name",
  "Data Type",
  "Length",
  "Required",
  "Description",
] as const;

const COVER_LABEL_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11 };

function formatCoverDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDate();
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec";
  const month = months.split(" ")[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function normalizeType(raw: unknown): string {
  if (!raw || typeof raw !== "string") return "Text";
  const lower = String(raw).toLowerCase().trim();
  for (const [tech, friendly] of Object.entries(TYPE_MAP)) {
    if (lower.includes(tech)) return friendly;
  }
  return String(raw);
}

function requiredFromNullable(nullable: unknown): string {
  const n = String(nullable ?? "").toLowerCase().trim();
  if (n === "no" || n === "not null" || n === "required") return "Yes";
  return "No";
}

function formatLength(length: unknown, _precision?: unknown): string {
  if (
    length != null &&
    String(length).trim() !== "" &&
    String(length) !== "-"
  )
    return String(length);
  return "—";
}

const EMPTY_DESCRIPTION_PLACEHOLDER = "-";

function refineComment(comment: unknown): string | null {
  if (!comment || String(comment).trim() === "" || comment === "-")
    return null;
  const normalized = String(comment).trim();
  const legacyAutoDescriptionPatterns = [
    /^unique identifier for/i,
    /^date and time when this record was created or updated\.?$/i,
    /^name or label for/i,
    /^code or short identifier for/i,
    /^indicates whether/i,
    /^stores .* for this record\.?$/i,
  ];
  if (legacyAutoDescriptionPatterns.some((pattern) => pattern.test(normalized))) {
    return null;
  }
  return normalized;
}

function get(row: DictionaryRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return "";
}

const MAX_SHEET_NAME_LENGTH = 31;

function sanitizeSheetName(name: string): string {
  return String(name)
    .replace(/[\\/*?:[\]]/g, "_")
    .slice(0, MAX_SHEET_NAME_LENGTH);
}

function uniqueSheetName(baseName: string, used: Set<string>): string {
  let candidate = sanitizeSheetName(baseName);
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const base = candidate.slice(0, MAX_SHEET_NAME_LENGTH - 4);
  let n = 2;
  while (used.has(sanitizeSheetName(`${base}_${n}`))) n++;
  candidate = sanitizeSheetName(`${base}_${n}`);
  used.add(candidate);
  return candidate;
}

function applyHeaderStyle(row: ExcelJS.Row, numCells: number): void {
  for (let c = 1; c <= numCells; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  }
}

function applyDataRowStyle(
  row: ExcelJS.Row,
  numCells: number,
  rowIndex: number
): void {
  for (let c = 1; c <= numCells; c++) {
    const cell = row.getCell(c);
    cell.border = THIN_BORDER;
    if (rowIndex % 2 === 1) cell.fill = ALTERNATING_ROW_FILL;
  }
}

/** Build a single row's display values (no Table Name) */
function rowToCells(row: DictionaryRow): [string, string, string, string, string] {
  const colName = get(row, "Column Name", "column_name");
  const dataType = normalizeType(get(row, "Data Type", "data_type"));
  const length = formatLength(row["Length"] ?? row["length"]);
  const required = requiredFromNullable(
    get(row, "Nullable", "nullable", "is_nullable")
  );
  const comment = refineComment(
    get(row, "Comment", "comment", "column_comment")
  );
  const description = comment ?? EMPTY_DESCRIPTION_PLACEHOLDER;
  return [colName, dataType, length, required, description];
}

/** Set column widths from content (min 10, max 50, header + data). */
function setAutoColumnWidths(
  sheet: ExcelJS.Worksheet,
  numCols: number,
  startRow: number,
  numDataRows: number
): void {
  for (let c = 1; c <= numCols; c++) {
    let maxLen = 10;
    const headerCell = sheet.getRow(startRow).getCell(c);
    const headerVal = headerCell.value;
    if (headerVal != null) maxLen = Math.max(maxLen, String(headerVal).length);
    for (let r = startRow + 1; r <= startRow + numDataRows; r++) {
      const cell = sheet.getRow(r).getCell(c);
      const v = cell.value;
      if (v != null) {
        const s = String(v).slice(0, 100);
        maxLen = Math.max(maxLen, s.length);
      }
    }
    const w = Math.min(50, Math.max(10, maxLen + 2));
    sheet.getColumn(c).width = w;
  }
}

/** Set column widths by scanning all rows (handles grouped layouts with gaps/merged headers). */
function setAutoColumnWidthsScanAllRows(
  sheet: ExcelJS.Worksheet,
  numCols: number
): void {
  for (let c = 1; c <= numCols; c++) {
    let maxLen = 10;
    for (let r = 1; r <= sheet.rowCount; r++) {
      const v = sheet.getRow(r).getCell(c).value;
      if (v != null) {
        const s = String(v).slice(0, 100);
        maxLen = Math.max(maxLen, s.length);
      }
    }
    const w = Math.min(50, Math.max(10, maxLen + 2));
    sheet.getColumn(c).width = w;
  }
}

/**
 * Builds an enterprise Data Dictionary workbook.
 * - Sheet 1: Cover (System Name = connected DB name, Date only; no Prepared For / Version)
 * - Sheet 2: All Tables (combined, auto column width)
 * - Sheet 3+: One sheet per table (no Business Purpose, auto column width)
 * @param databaseName - Connected database name (e.g. from SELECT current_database())
 */
export async function buildWorkbook(
  rows: DictionaryRow[],
  databaseName?: string
): Promise<ExcelJS.Workbook> {
  const byTable = new Map<string, DictionaryRow[]>();
  for (const row of rows) {
    const table = get(row, "Table", "table");
    if (!table) continue;
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table)!.push(row);
  }

  const tableNames = Array.from(byTable.keys()).sort();
  const totalColumns = rows.length;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Data Dictionary";
  workbook.created = new Date();

  const systemName = databaseName ?? "Database";
  const dateStr = formatCoverDate(new Date());

  // —— Sheet 1: Cover (presentation only; no Prepared For, no Version) ——
  const cover = workbook.addWorksheet("Cover", {
    views: [{ showGridLines: false }],
  });
  cover.columns = [{ width: 20 }, { width: 50 }];
  cover.mergeCells("A2:B2");
  cover.getRow(2).getCell(1).value = "INTERNATIONAL MEDICAL SOFTWARE DATA DICTIONARY";
  cover.getRow(2).getCell(1).font = { bold: true, size: 24 };
  cover.getRow(2).getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  cover.getRow(4).getCell(1).value = "System Name:";
  cover.getRow(4).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(4).getCell(2).value = systemName;
  cover.getRow(5).getCell(1).value = "Date:";
  cover.getRow(5).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(5).getCell(2).value = dateStr;
  cover.getRow(7).getCell(1).value = "SUMMARY";
  cover.getRow(7).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(9).getCell(1).value = "Total Tables:";
  cover.getRow(9).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(9).getCell(2).value = tableNames.length;
  cover.getRow(10).getCell(1).value = "Total Columns:";
  cover.getRow(10).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(10).getCell(2).value = totalColumns;
  cover.getRow(12).getCell(1).value = "Description:";
  cover.getRow(12).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(13).getCell(1).value =
    "This document provides a structured overview of the database schema including table definitions and field-level descriptions.";
  cover.getRow(13).getCell(1).alignment = { wrapText: true };

  // —— Sheet 2: All Tables ——
  const allSheet = workbook.addWorksheet("All Tables", {
    views: [{ showGridLines: true }],
  });
  allSheet.columns = COL_WIDTHS_ALL.map((w) => ({ width: w }));

  // Title row
  allSheet.mergeCells("A1:E1");
  const allTitle = allSheet.getRow(1).getCell(1);
  allTitle.value = "All Tables (Grouped by Table)";
  allTitle.font = { bold: true, size: 14 };
  allTitle.alignment = { horizontal: "left", vertical: "middle" };

  let rowCursor = 3; // leave row 2 as a visual spacer
  const allColsHeader = ["Column Name", "Data Type", "Length", "Required", "Description"];

  for (const tableName of tableNames) {
    // Section title: TABLE: <name>
    allSheet.mergeCells(`A${rowCursor}:E${rowCursor}`);
    const sectionCell = allSheet.getRow(rowCursor).getCell(1);
    sectionCell.value = `TABLE: ${tableName}`;
    sectionCell.fill = HEADER_FILL;
    sectionCell.font = { ...HEADER_FONT, size: 12 };
    sectionCell.alignment = { horizontal: "left", vertical: "middle" };
    sectionCell.border = THIN_BORDER;
    rowCursor++;

    // Column header for this table section
    const headerRow = allSheet.getRow(rowCursor);
    headerRow.values = [...allColsHeader];
    applyHeaderStyle(headerRow, 5);
    rowCursor++;

    // Data rows for table
    const tableRows = byTable.get(tableName)!;
    tableRows.forEach((row, i) => {
      const [colName, dataType, length, required, description] = rowToCells(row);
      const r = allSheet.getRow(rowCursor);
      r.values = [colName, dataType, length, required, description];
      applyDataRowStyle(r, 5, i);
      r.getCell(5).alignment = { wrapText: true };
      rowCursor++;
    });

    // Spacer row between tables
    rowCursor++;
  }

  setAutoColumnWidthsScanAllRows(allSheet, 5);
  allSheet.views = [{ state: "frozen", ySplit: 2, activeCell: "A3" }];

  // —— Sheet 3+: One sheet per table (no Business Purpose) ——
  const usedSheetNames = new Set<string>(["Cover", "All Tables"]);
  for (const tableName of tableNames) {
    const sheetName = uniqueSheetName(tableName, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }],
    });
    sheet.columns = COL_WIDTHS_TABLE.map((w) => ({ width: w }));

    const headerRow = sheet.getRow(1);
    headerRow.values = [...DATA_COLS];
    applyHeaderStyle(headerRow, 5);

    const tableRows = byTable.get(tableName)!;
    tableRows.forEach((row, i) => {
      const r = sheet.getRow(2 + i);
      r.values = rowToCells(row);
      applyDataRowStyle(r, 5, i);
      r.getCell(5).alignment = { wrapText: true };
    });
    setAutoColumnWidths(sheet, 5, 1, tableRows.length);
    sheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  }

  return workbook;
}
