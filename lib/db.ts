/**
 * Server-side only. Do not import in client components.
 */
import { Pool } from "pg";

const baseConnectionString = process.env.DATABASE_URL ?? "";

if (baseConnectionString.trim() === "") {
  throw new Error("DATABASE_URL must be defined");
}

const globalForPg = globalThis as unknown as {
  pgPoolsByDatabase?: Record<string, Pool>;
};

function readDefaultDatabaseName(): string {
  const url = new URL(baseConnectionString);
  return decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
}

const defaultDatabaseName = readDefaultDatabaseName();

function isValidDatabaseName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

function resolveDatabaseName(input?: string): string {
  const value = (input ?? "").trim();
  if (!value) return defaultDatabaseName;
  if (!isValidDatabaseName(value)) {
    throw new Error(
      "Invalid database name. Allowed characters: a-z, A-Z, 0-9, underscore."
    );
  }
  return value;
}

function buildConnectionString(databaseName: string): string {
  const url = new URL(baseConnectionString);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  return url.toString();
}

const poolMap = globalForPg.pgPoolsByDatabase ?? {};

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPoolsByDatabase = poolMap;
}

export function getDatabaseOptions(): { key: string; label: string }[] {
  return [{ key: defaultDatabaseName, label: defaultDatabaseName }];
}

export function getDefaultDatabaseKey(): string {
  return defaultDatabaseName;
}

export function getPool(databaseName?: string): Pool {
  const dbName = resolveDatabaseName(databaseName);
  if (!poolMap[dbName]) {
    poolMap[dbName] = new Pool({
      connectionString: buildConnectionString(dbName),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return poolMap[dbName];
}

export function getDefaultDatabaseName(): string {
  return defaultDatabaseName;
}
