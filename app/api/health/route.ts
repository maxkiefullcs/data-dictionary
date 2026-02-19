import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("[api/health]", err);
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "Database unavailable" },
      { status: 503 }
    );
  }
}
