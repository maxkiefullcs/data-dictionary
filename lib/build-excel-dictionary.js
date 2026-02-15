/**
 * Enterprise Data Dictionary Excel builder (CLI / Node).
 * - Sheet 1: "Cover" (presentation only)
 * - Sheet 2: "All Tables" (combined, 6 columns)
 * - Sheet 3+: One sheet per table (5 columns). No Business Purpose.
 */

const ExcelJS = require("exceljs");

const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
const COVER_LABEL_FONT = { bold: true, size: 11 };
const THIN_BORDER = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};
const ALTERNATING_ROW_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };

const TYPE_MAP = {
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

const COL_WIDTHS_TABLE = [25, 15, 12, 12, 45];
const COL_WIDTHS_ALL = [25, 25, 15, 12, 12, 45];
const DATA_COLS = ["Column Name", "Data Type", "Length", "Required", "Description"];

function formatCoverDate(date) {
  const d = new Date(date);
  const day = d.getDate();
  const months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec";
  const month = months.split(" ")[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function normalizeType(raw) {
  if (!raw || typeof raw !== "string") return "Text";
  const lower = String(raw).toLowerCase().trim();
  for (const [tech, friendly] of Object.entries(TYPE_MAP)) {
    if (lower.includes(tech)) return friendly;
  }
  return String(raw);
}

function requiredFromNullable(nullable) {
  const n = String(nullable ?? "").toLowerCase().trim();
  if (n === "no" || n === "not null" || n === "required") return "Yes";
  return "No";
}

function formatLength(length) {
  if (length != null && String(length).trim() !== "" && String(length) !== "-") return String(length);
  return "—";
}

function descriptionFromColumnName(columnName) {
  if (!columnName || typeof columnName !== "string") return "No description available.";
  const name = String(columnName).trim();
  const lower = name.toLowerCase();
  const words = name.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim().split(/\s+/).filter(Boolean);
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  if (lower.endsWith("_id")) return `Unique identifier for the related ${title.replace(/\s*Id\s*$/i, "").toLowerCase()} record.`;
  if (lower.endsWith("_at") || lower.endsWith("_date")) return "Date and time when this record was created or updated.";
  if (lower === "id") return "Unique identifier for this record.";
  if (lower.includes("name")) return `Name or label for the ${title.replace(/\s*Name\s*$/i, "").toLowerCase()}.`;
  if (lower.includes("code")) return `Code or short identifier for the ${title.replace(/\s*Code\s*$/i, "").toLowerCase()}.`;
  if (lower.includes("flag") || lower.includes("is_")) return `Indicates whether ${title.replace(/\s*(Flag|Is)\s*$/i, "").toLowerCase()} applies.`;
  return `Stores ${title.toLowerCase()} for this record.`;
}

function refineComment(comment) {
  if (!comment || String(comment).trim() === "" || comment === "-") return null;
  return String(comment).trim();
}

function get(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

const MAX_SHEET_NAME_LENGTH = 31;
function sanitizeSheetName(name) {
  return String(name).replace(/[\\/*?:[\]]/g, "_").slice(0, MAX_SHEET_NAME_LENGTH);
}

function uniqueSheetName(baseName, used) {
  let candidate = sanitizeSheetName(baseName);
  if (!used.has(candidate)) { used.add(candidate); return candidate; }
  const base = candidate.slice(0, MAX_SHEET_NAME_LENGTH - 4);
  let n = 2;
  while (used.has(sanitizeSheetName(`${base}_${n}`))) n++;
  candidate = sanitizeSheetName(`${base}_${n}`);
  used.add(candidate);
  return candidate;
}

function applyHeaderStyle(row, numCells) {
  for (let c = 1; c <= numCells; c++) {
    const cell = row.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BORDER;
  }
}

function applyDataRowStyle(row, numCells, rowIndex) {
  for (let c = 1; c <= numCells; c++) {
    const cell = row.getCell(c);
    cell.border = THIN_BORDER;
    if (rowIndex % 2 === 1) cell.fill = ALTERNATING_ROW_FILL;
  }
}

function rowToCells(row) {
  const colName = get(row, "Column Name", "column_name");
  const dataType = normalizeType(get(row, "Data Type", "data_type"));
  const length = formatLength(row["Length"] ?? row["length"]);
  const required = requiredFromNullable(get(row, "Nullable", "nullable", "is_nullable"));
  const comment = refineComment(get(row, "Comment", "comment", "column_comment"));
  const description = comment || descriptionFromColumnName(colName);
  return [colName, dataType, length, required, description];
}

function setAutoColumnWidths(sheet, numCols, startRow, numDataRows) {
  for (let c = 1; c <= numCols; c++) {
    let maxLen = 10;
    const headerVal = sheet.getRow(startRow).getCell(c).value;
    if (headerVal != null) maxLen = Math.max(maxLen, String(headerVal).length);
    for (let r = startRow + 1; r <= startRow + numDataRows; r++) {
      const v = sheet.getRow(r).getCell(c).value;
      if (v != null) maxLen = Math.max(maxLen, String(v).slice(0, 100).length);
    }
    sheet.getColumn(c).width = Math.min(50, Math.max(10, maxLen + 2));
  }
}

async function buildWorkbook(rows, databaseName) {
  const byTable = new Map();
  for (const row of rows) {
    const table = get(row, "Table", "table");
    if (!table) continue;
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table).push(row);
  }

  const tableNames = Array.from(byTable.keys()).sort();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Data Dictionary";
  workbook.created = new Date();

  const systemName = databaseName ?? "Database";
  const dateStr = formatCoverDate(new Date());

  const cover = workbook.addWorksheet("Cover", { views: [{ showGridLines: false }] });
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
  cover.getRow(10).getCell(2).value = rows.length;
  cover.getRow(12).getCell(1).value = "Description:";
  cover.getRow(12).getCell(1).font = COVER_LABEL_FONT;
  cover.getRow(13).getCell(1).value =
    "This document provides a structured overview of the database schema including table definitions and field-level descriptions.";
  cover.getRow(13).getCell(1).alignment = { wrapText: true };

  const allSheet = workbook.addWorksheet("All Tables", { views: [{ showGridLines: true }] });
  allSheet.columns = COL_WIDTHS_ALL.map((w) => ({ width: w }));
  const allHeaderRow = allSheet.getRow(1);
  allHeaderRow.values = ["Table Name", "Column Name", "Data Type", "Length", "Required", "Description"];
  applyHeaderStyle(allHeaderRow, 6);

  let dataRowIndex = 0;
  for (const tableName of tableNames) {
    const tableRows = byTable.get(tableName);
    for (const row of tableRows) {
      const [colName, dataType, length, required, description] = rowToCells(row);
      const r = allSheet.getRow(2 + dataRowIndex);
      r.values = [tableName, colName, dataType, length, required, description];
      applyDataRowStyle(r, 6, dataRowIndex);
      r.getCell(6).alignment = { wrapText: true };
      dataRowIndex++;
    }
  }
  setAutoColumnWidths(allSheet, 6, 1, dataRowIndex);
  allSheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];

  const usedSheetNames = new Set(["Cover", "All Tables"]);
  for (const tableName of tableNames) {
    const sheetName = uniqueSheetName(tableName, usedSheetNames);
    const sheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
    sheet.columns = COL_WIDTHS_TABLE.map((w) => ({ width: w }));

    const headerRow = sheet.getRow(1);
    headerRow.values = [...DATA_COLS];
    applyHeaderStyle(headerRow, 5);

    const tableRows = byTable.get(tableName);
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

module.exports = { buildWorkbook };
