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
const defaultConnectionHost = new URL(baseConnectionString).hostname;

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

function isValidDatabaseHost(host: string): boolean {
  return /^[a-zA-Z0-9.-]+$/.test(host);
}

function resolveDatabaseHost(input?: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return defaultConnectionHost;
  const value = raw.replace(/\/\d+$/, "");
  if (!isValidDatabaseHost(value)) {
    throw new Error(
      "Invalid host. Allowed characters: a-z, A-Z, 0-9, dot, hyphen."
    );
  }
  return value;
}

function buildConnectionString(databaseName: string, host?: string): string {
  const url = new URL(baseConnectionString);
  url.pathname = `/${encodeURIComponent(databaseName)}`;
  url.hostname = resolveDatabaseHost(host);
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

export function getPool(databaseName?: string, host?: string): Pool {
  const dbName = resolveDatabaseName(databaseName);
  const dbHost = resolveDatabaseHost(host);
  const cacheKey = `${dbHost}/${dbName}`;
  if (!poolMap[cacheKey]) {
    poolMap[cacheKey] = new Pool({
      connectionString: buildConnectionString(dbName, dbHost),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return poolMap[cacheKey];
}

export function getDefaultDatabaseName(): string {
  return defaultDatabaseName;
}

export function getDatabaseConnectionHost(
  databaseName?: string,
  host?: string
): string {
  const dbName = resolveDatabaseName(databaseName);
  const connectionString = buildConnectionString(dbName, host);
  const url = new URL(connectionString);
  return url.hostname;
}
