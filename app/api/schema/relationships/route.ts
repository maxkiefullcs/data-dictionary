import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export interface RelationshipRow {
  constraint_name: string;
  source_table: string;
  source_column: string;
  target_table: string;
  target_column: string;
  update_rule: string | null;
  delete_rule: string | null;
}

interface RelationshipSuccessResponse {
  data: RelationshipRow[];
}

interface RelationshipErrorResponse {
  error: string;
}

type RelationshipResponse =
  | RelationshipSuccessResponse
  | RelationshipErrorResponse;

const RELATIONSHIP_SQL = `
SELECT
  tc.constraint_name,
  kcu.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
 AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY source_table, source_column, target_table, target_column;
`;

export async function GET(
  request: NextRequest
): Promise<NextResponse<RelationshipResponse>> {
  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const host = request.nextUrl.searchParams.get("host") ?? undefined;
    const pool = getPool(dbKey, host);
    const result = await pool.query<RelationshipRow>(RELATIONSHIP_SQL);
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch relationships";
    console.error("[api/schema/relationships]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
