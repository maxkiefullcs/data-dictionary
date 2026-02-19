import ExcelJS from "exceljs";

export type RelationshipExportRow = {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  update_rule: string | null;
  delete_rule: string | null;
};

type BuildRelationshipWorkbookOptions = {
  sourceMode: "constraints" | "inferred";
  selectedTable: string;
  allTablesValue: string;
};

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

const ALT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF4F6F8" },
};

function toDirection(
  row: RelationshipExportRow,
  selectedTable: string,
  allTablesValue: string
): string {
  if (!selectedTable || selectedTable === allTablesValue) return "All";
  if (row.source_table === selectedTable) return "Outbound";
  if (row.target_table === selectedTable) return "Inbound";
  return "Related";
}

function styleHeader(row: ExcelJS.Row, count: number): void {
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }
}

function styleDataRow(row: ExcelJS.Row, count: number, index: number): void {
  for (let i = 1; i <= count; i++) {
    const cell = row.getCell(i);
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: "top", wrapText: true };
    if (index % 2 === 1) cell.fill = ALT_FILL;
  }
}

export async function buildRelationshipWorkbook(
  rows: RelationshipExportRow[],
  options: BuildRelationshipWorkbookOptions
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Data Dictionary";
  workbook.created = new Date();

  const cover = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
  });
  cover.columns = [{ width: 24 }, { width: 60 }];
  cover.mergeCells("A2:B2");
  cover.getCell("A2").value = "Data Dictionary - Relationships Export";
  cover.getCell("A2").font = { bold: true, size: 20 };
  cover.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  cover.getCell("A4").value = "Generated At:";
  cover.getCell("A5").value = "Relationship Source:";
  cover.getCell("A6").value = "Selected Table:";
  cover.getCell("A7").value = "Total Relationships:";
  for (const key of ["A4", "A5", "A6", "A7"]) {
    cover.getCell(key).font = { bold: true };
  }
  cover.getCell("B4").value = new Date().toISOString().replace("T", " ").slice(0, 19);
  cover.getCell("B5").value =
    options.sourceMode === "constraints" ? "Database Constraints" : "Inferred";
  cover.getCell("B6").value =
    options.selectedTable === options.allTablesValue
      ? "All Tables"
      : options.selectedTable || "-";
  cover.getCell("B7").value = rows.length;

  const sheet = workbook.addWorksheet("Relationships", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });
  sheet.columns = [
    { width: 12 }, // Direction
    { width: 22 }, // Source Table
    { width: 24 }, // Source Column
    { width: 22 }, // Target Table
    { width: 24 }, // Target Column
    { width: 42 }, // Constraint/Inference
    { width: 14 }, // On Update
    { width: 14 }, // On Delete
  ];

  const header = sheet.getRow(1);
  header.values = [
    "Direction",
    "Source Table",
    "Source Column",
    "Target Table",
    "Target Column",
    "Constraint / Inference",
    "On Update",
    "On Delete",
  ];
  styleHeader(header, 8);

  rows.forEach((row, idx) => {
    const r = sheet.getRow(idx + 2);
    r.values = [
      toDirection(row, options.selectedTable, options.allTablesValue),
      row.source_table,
      row.source_column,
      row.target_table,
      row.target_column,
      row.constraint_name,
      row.update_rule ?? "-",
      row.delete_rule ?? "-",
    ];
    styleDataRow(r, 8, idx);
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  };

  return workbook;
}
