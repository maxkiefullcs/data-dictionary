import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import {
  inferRelationships,
  type InferredRelationshipRow,
} from "@/lib/infer-relationships";

type ColumnRow = {
  table_name: string;
  column_name: string;
};

interface InferredSuccessResponse {
  data: InferredRelationshipRow[];
}

interface InferredErrorResponse {
  error: string;
}

type InferredResponse = InferredSuccessResponse | InferredErrorResponse;

const COLUMNS_SQL = `
SELECT c.table_name, c.column_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position
`;

export async function GET(
  request: NextRequest
): Promise<NextResponse<InferredResponse>> {
  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const host = request.nextUrl.searchParams.get("host") ?? undefined;
    const pool = getPool(dbKey, host);
    const result = await pool.query<ColumnRow>(COLUMNS_SQL);
    const inferred = inferRelationships(result.rows);
    return NextResponse.json({ data: inferred });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to infer relationships";
    console.error("[api/schema/relationships/inferred]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
