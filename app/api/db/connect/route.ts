import { NextRequest, NextResponse } from "next/server";
import { getDefaultDatabaseName, getPool } from "@/lib/db";

type ConnectBody = {
  database?: string;
};

type ConnectResponse =
  | { status: "connected"; database: string }
  | { status: "error"; error: string };

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConnectResponse>> {
  try {
    const body = (await request.json().catch(() => ({}))) as ConnectBody;
    const requested = (body.database ?? "").trim();
    const database = requested || getDefaultDatabaseName();
    const pool = getPool(database);
    const result = await pool.query<{ current_database: string }>(
      "SELECT current_database() AS current_database"
    );
    return NextResponse.json({
      status: "connected",
      database: result.rows[0]?.current_database ?? database,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to connect database";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 400 }
    );
  }
}
