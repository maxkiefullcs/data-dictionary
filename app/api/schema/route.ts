import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export interface SchemaRow {
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  column_comment: string | null;
}

interface SchemaSuccessResponse {
  data: SchemaRow[];
}

interface SchemaErrorResponse {
  error: string;
}

type SchemaResponse = SchemaSuccessResponse | SchemaErrorResponse;

const DATA_DICTIONARY_SQL = `
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.is_nullable,
  c.column_default,
  col_description(pg_class.oid, c.ordinal_position) AS column_comment
FROM information_schema.columns c
JOIN pg_class ON pg_class.relname = c.table_name
JOIN pg_namespace ns ON ns.oid = pg_class.relnamespace
WHERE c.table_schema = 'public'
AND ns.nspname = 'public'
ORDER BY c.table_name, c.ordinal_position
`;

export async function GET(
  request: NextRequest
): Promise<NextResponse<SchemaResponse>> {
  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const pool = getPool(dbKey);
    const result = await pool.query<SchemaRow>(DATA_DICTIONARY_SQL);
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch schema";
    console.error("[api/schema]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
