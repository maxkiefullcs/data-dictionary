import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export interface SchemaRow {
  table_name: string;
  table_comment: string | null;
  table_type: string | null;
  table_priority: string | null;
  priority_description: string | null;
  table_version: string | null;
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  column_comment: string | null;
  column_index?: string | null;
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
  obj_description(pg_class.oid, 'pg_class') AS table_comment,
  NULL::text AS table_type,
  NULL::text AS table_priority,
  NULL::text AS priority_description,
  NULL::text AS table_version,
  c.column_name,
  c.data_type,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.is_nullable,
  c.column_default,
  col_description(pg_class.oid, c.ordinal_position) AS column_comment
FROM information_schema.columns c
JOIN pg_namespace ns
  ON ns.nspname = c.table_schema
JOIN pg_class
  ON pg_class.relnamespace = ns.oid
 AND pg_class.relname = c.table_name
WHERE c.table_schema = 'public'
AND pg_class.relkind IN ('r', 'p')
ORDER BY c.table_name, c.ordinal_position
`;

const IMED_DATADICT_SQL = `
SELECT
  c.table_name::text AS table_name,
  NULLIF(t.description, '') AS table_comment,
  NULLIF(t.table_type, '') AS table_type,
  NULLIF(t.table_priority, '') AS table_priority,
  NULLIF(t.piority_description, '') AS priority_description,
  NULLIF(t.table_version, '') AS table_version,
  c.column_name::text AS column_name,
  COALESCE(NULLIF(c.column_type, ''), 'text')::text AS data_type,
  CASE
    WHEN c.column_type ~ '\\([0-9]+\\)'
      THEN substring(c.column_type from '\\(([0-9]+)\\)')::int
    ELSE NULL
  END AS character_maximum_length,
  NULL::int AS numeric_precision,
  NULL::int AS numeric_scale,
  CASE
    WHEN upper(COALESCE(c.column_null, 'YES')) = 'NO' THEN 'NO'
    ELSE 'YES'
  END AS is_nullable,
  NULL::text AS column_default,
  NULLIF(c.description, '') AS column_comment,
  NULLIF(c.column_index, '') AS column_index
FROM public.column_imed c
LEFT JOIN public.table_imed t
  ON t.table_id = c.table_id
WHERE COALESCE(c.table_name, '') <> ''
  AND COALESCE(c.column_name, '') <> ''
ORDER BY c.table_id, c.column_id, c.table_name, c.column_name
`;

function getSchemaQuery(databaseName?: string): string {
  if ((databaseName ?? "").trim().toLowerCase() === "imed_datadict") {
    return IMED_DATADICT_SQL;
  }
  return DATA_DICTIONARY_SQL;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<SchemaResponse>> {
  try {
    const dbKey = request.nextUrl.searchParams.get("db") ?? undefined;
    const host = request.nextUrl.searchParams.get("host") ?? undefined;
    const pool = getPool(dbKey, host);
    const result = await pool.query<SchemaRow>(getSchemaQuery(dbKey));
    return NextResponse.json({ data: result.rows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch schema";
    console.error("[api/schema]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
