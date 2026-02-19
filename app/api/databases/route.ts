import { NextResponse } from "next/server";
import { getDatabaseOptions, getDefaultDatabaseKey } from "@/lib/db";

type DatabasesResponse = {
  data: Array<{ key: string; label: string }>;
  defaultKey: string;
};

export async function GET(): Promise<NextResponse<DatabasesResponse>> {
  return NextResponse.json({
    data: getDatabaseOptions(),
    defaultKey: getDefaultDatabaseKey(),
  });
}
