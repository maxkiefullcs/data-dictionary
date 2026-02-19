import { NextRequest, NextResponse } from "next/server";
import { buildWorkbook } from "@/lib/build-excel-dictionary";
import { getPool } from "@/lib/db";

export interface SchemaRowForExport {
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length?: number | null;
  numeric_precision?: number | null;
  numeric_scale?: number | null;
  is_nullable: string;
  column_default?: string | null;
  column_comment?: string | null;
}

interface ExportBody {
  rows: SchemaRowForExport[];
}

/** Normalize API schema rows to the shape expected by buildWorkbook (Table, Column Name, etc.) */
function toWorkbookRows(
  rows: SchemaRowForExport[]
): Record<string, string | number>[] {
  return rows.map((r) => ({
    Table: r.table_name,
    "Column Name": r.column_name,
    "Data Type": r.data_type,
    Length:
      r.character_maximum_length != null
        ? r.character_maximum_length
        : r.numeric_precision != null
          ? r.numeric_precision
          : "-",
    Precision: r.numeric_precision ?? "-",
    Nullable: r.is_nullable === "NO" ? "NOT NULL" : "NULL",
    Default: r.column_default ?? "-",
    Comment: r.column_comment ?? "-",
  }));
}

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * POST /api/export/excel
 * Body: { rows: SchemaRowForExport[] }
 * System Name on Cover is set from the connected database (current_database()).
 * Returns: Excel file attachment (Data_Dictionary_YYYY-MM-DD.xlsx)
 */
export async function POST(request: NextRequest) {
  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const pool = getPool(dbKey);
    const body = (await request.json()) as ExportBody;
    const { rows = [] } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'rows' array." },
        { status: 400 }
      );
    }

    let databaseName = "Database";
    try {
      const dbResult = await pool.query<{ current_database: string }>(
        "SELECT current_database() AS current_database"
      );
      databaseName = dbResult.rows[0]?.current_database ?? databaseName;
    } catch {
      // use default if DB unavailable
    }

    const workbookRows = toWorkbookRows(rows);
    const workbook = await buildWorkbook(workbookRows, databaseName);
    const buffer = await workbook.xlsx.writeBuffer();
    const fileBody =
      buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(buffer as ArrayBuffer);
    const filename = `Data_Dictionary_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(fileBody, {
      status: 200,
      headers: {
        "Content-Type": EXCEL_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    console.error("[api/export/excel]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
