import { NextRequest, NextResponse } from "next/server";
import {
  getDatabaseConnectionHost,
  getDefaultDatabaseName,
  getPool,
} from "@/lib/db";

type ConnectBody = {
  database?: string;
  host?: string;
};

type ConnectResponse =
  | { status: "connected"; database: string; host: string }
  | { status: "error"; error: string };

export async function POST(
  request: NextRequest
): Promise<NextResponse<ConnectResponse>> {
  try {
    const body = (await request.json().catch(() => ({}))) as ConnectBody;
    const requested = (body.database ?? "").trim();
    const host = (body.host ?? "").trim() || undefined;
    const database = requested || getDefaultDatabaseName();
    const pool = getPool(database, host);
    const result = await pool.query<{
      current_database: string;
      server_ip: string | null;
    }>(
      "SELECT current_database() AS current_database, host(inet_server_addr()) AS server_ip"
    );
    const rawIp = result.rows[0]?.server_ip ?? "";
    const cleanIp = rawIp.replace(/\/\d+$/, "");
    return NextResponse.json({
      status: "connected",
      database: result.rows[0]?.current_database ?? database,
      host: cleanIp || getDatabaseConnectionHost(database, host),
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
