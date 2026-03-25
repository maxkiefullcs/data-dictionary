import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { logger } from "@/lib/logger";

const IDENT_REGEX = /^[a-zA-Z0-9_]+$/;

type CommentBody = {
  table: string;
  column: string;
  comment: string;
};

type CommentResponse =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function PUT(
  request: NextRequest
): Promise<NextResponse<CommentResponse>> {

  // ✅ ย้ายออกมาอยู่นอก try
  let table = "";
  let column = "";

  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const host = request.nextUrl.searchParams.get("host") ?? undefined;
    const pool = getPool(dbKey, host);

    const body = (await request.json()) as CommentBody;

    table = typeof body.table === "string" ? body.table.trim() : "";
    column = typeof body.column === "string" ? body.column.trim() : "";
    const comment = typeof body.comment === "string" ? body.comment : "";

    if (!table || !column) {
      return NextResponse.json(
        { status: "error", error: "table and column are required" },
        { status: 400 }
      );
    }

    if (!IDENT_REGEX.test(table) || !IDENT_REGEX.test(column)) {
      return NextResponse.json(
        { status: "error", error: "Invalid table or column name" },
        { status: 400 }
      );
    }

    const trimmed = comment.trim();

    const sql =
      trimmed === ""
        ? `COMMENT ON COLUMN "public"."${table}"."${column}" IS NULL`
        : `COMMENT ON COLUMN "public"."${table}"."${column}" IS '${trimmed.replace(/'/g, "''")}'`;

    await pool.query(sql);

    logger.info("Comment updated", { table, column });

    return NextResponse.json({ status: "ok" });

  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update comment";

    // ✅ ตอนนี้ใช้ได้แล้ว
    logger.error("Comment update failed", {
      table,
      column,
      error: message,
    });

    console.error("[api/schema/comment]", message, err);

    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 }
    );
  }
}