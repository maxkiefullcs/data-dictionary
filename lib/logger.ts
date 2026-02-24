/**
 * Server-side operation logger. Writes to a log file and optionally console.
 * Log file: LOG_DIR/app.log (default: ./logs/app.log relative to cwd).
 */

import fs from "fs";
import path from "path";

const LOG_LEVELS = ["error", "warn", "info", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

const currentLevel = (): LogLevel => {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env && LOG_LEVELS.includes(env as LogLevel)) return env as LogLevel;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
};

const levelOrdinal = (l: LogLevel): number => LOG_LEVELS.indexOf(l);

function getLogDir(): string | null {
  const dir = process.env.LOG_DIR?.trim() || path.join(process.cwd(), "logs");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    return null;
  }
}

function formatPayload(payload?: Record<string, unknown>): string {
  if (payload == null || Object.keys(payload).length === 0) return "";
  try {
    return " " + JSON.stringify(payload);
  } catch {
    return "";
  }
}

function write(level: LogLevel, message: string, payload?: Record<string, unknown>): void {
  const minLevel = currentLevel();
  if (levelOrdinal(level) > levelOrdinal(minLevel)) return;

  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${message}${formatPayload(payload)}\n`;

  if (process.env.NODE_ENV !== "production") {
    const out = level === "error" ? process.stderr : process.stdout;
    out.write(line);
  }

  const dir = getLogDir();
  if (dir) {
    const file = path.join(dir, "app.log");
    fs.appendFile(file, line, (err) => {
      if (err) process.stderr.write(`[logger] appendFile failed: ${err.message}\n`);
    });
  }
}

export const logger = {
  info(message: string, payload?: Record<string, unknown>): void {
    write("info", message, payload);
  },
  warn(message: string, payload?: Record<string, unknown>): void {
    write("warn", message, payload);
  },
  error(message: string, payload?: Record<string, unknown>): void {
    write("error", message, payload);
  },
  debug(message: string, payload?: Record<string, unknown>): void {
    write("debug", message, payload);
  },
};
