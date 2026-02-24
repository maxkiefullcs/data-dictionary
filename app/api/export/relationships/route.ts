import { NextRequest, NextResponse } from "next/server";
import {
  buildRelationshipWorkbook,
  type RelationshipExportRow,
} from "@/lib/build-relationship-workbook";
import { logger } from "@/lib/logger";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ExportRelationshipsBody = {
  rows: RelationshipExportRow[];
  sourceMode: "constraints" | "inferred";
  selectedTable: string;
  allTablesValue: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportRelationshipsBody;
    const rows = Array.isArray(body.rows) ? body.rows : [];
    const sourceMode =
      body.sourceMode === "inferred" ? "inferred" : "constraints";
    const selectedTable = body.selectedTable ?? "";
    const allTablesValue = body.allTablesValue ?? "ALL";

    const workbook = await buildRelationshipWorkbook(rows, {
      sourceMode,
      selectedTable,
      allTablesValue,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileBody =
      buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(buffer as ArrayBuffer);
    const filename = `Relationships_${new Date().toISOString().slice(0, 10)}.xlsx`;

    logger.info("Relationships Excel exported", {
      rows: rows.length,
      sourceMode,
      selectedTable,
      filename,
    });
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
    logger.error("Relationships export failed", { error: message });
    console.error("[api/export/relationships]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
