/**
 * Transforms a CSV export (from Excel) of database schema into a
 * client-ready Data Dictionary in Markdown.
 *
 * Expected CSV columns: Table, Column Name, Data Type, Length, Precision, Nullable, Default, Comment
 *
 * Usage:
 *   node scripts/generate-data-dictionary.js <input.csv> [output.md]
 *   Or pipe: cat schema.csv | node scripts/generate-data-dictionary.js
 *
 * If no output path is given, writes to stdout.
 */

const fs = require("fs");
const readline = require("readline");

// Map technical types to client-friendly terms
const TYPE_MAP = {
  character: "Text",
  "character varying": "Text",
  varchar: "Text",
  char: "Text",
  text: "Text",
  "double precision": "Number",
  double: "Number",
  integer: "Number",
  int: "Number",
  bigint: "Number",
  smallint: "Number",
  numeric: "Number",
  decimal: "Number",
  real: "Number",
  "timestamp without time zone": "DateTime",
  "timestamp with time zone": "DateTime",
  timestamp: "DateTime",
  date: "Date",
  time: "Time",
  boolean: "Yes/No",
  bool: "Yes/No",
};

function normalizeType(raw) {
  if (!raw || typeof raw !== "string") return "Text";
  const lower = raw.toLowerCase().trim();
  for (const [tech, friendly] of Object.entries(TYPE_MAP)) {
    if (lower.includes(tech)) return friendly;
  }
  return raw;
}

function requiredFromNullable(nullable) {
  const n = String(nullable || "").toLowerCase().trim();
  if (n === "no" || n === "not null" || n === "required") return "Yes";
  return "No";
}

function formatLength(length, precision) {
  if (length != null && String(length).trim() !== "" && String(length) !== "-") return String(length);
  if (precision != null && String(precision).trim() !== "" && String(precision) !== "-") return String(precision);
  return "—";
}

/** Generate a business-friendly description from column name when Comment is empty */
function descriptionFromColumnName(columnName) {
  if (!columnName || typeof columnName !== "string") return "No description available.";
  const name = columnName.trim();
  const lower = name.toLowerCase();
  const words = name.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim().split(/\s+/).filter(Boolean);
  const title = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  if (lower.endsWith("_id")) return `Unique identifier for the related ${title.replace(/\s*Id\s*$/i, "").toLowerCase()} record.`;
  if (lower.endsWith("_at") || lower.endsWith("_date")) return `Date and time when this record was created or updated.`;
  if (lower === "id") return "Unique identifier for this record.";
  if (lower.includes("name")) return `Name or label for the ${title.replace(/\s*Name\s*$/i, "").toLowerCase()}.`;
  if (lower.includes("code")) return `Code or short identifier for the ${title.replace(/\s*Code\s*$/i, "").toLowerCase()}.`;
  if (lower.includes("flag") || lower.includes("is_")) return `Indicates whether ${title.replace(/\s*(Flag|Is)\s*$/i, "").toLowerCase()} applies.`;
  return `Stores ${title.toLowerCase()} for this record.`;
}

function refineComment(comment) {
  if (!comment || String(comment).trim() === "" || comment === "-") return null;
  const c = String(comment).trim();
  if (c.length < 3) return null;
  return c;
}

function escapePipe(s) {
  return String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (inQuotes) {
      current += ch;
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function readCSV(path) {
  const lines = [];
  const rl = readline.createInterface({ input: fs.createReadStream(path, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) lines.push(line);
  return lines;
}

function parseRows(lines) {
  if (lines.length < 2) return { headers: [], rows: [] };
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]).map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
    const row = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

function buildDoc(rows, systemName) {
  const byTable = new Map();
  for (const row of rows) {
    const table = row["Table"] ?? row["table"] ?? "";
    if (!table) continue;
    if (!byTable.has(table)) byTable.set(table, []);
    byTable.get(table).push(row);
  }

  const tables = Array.from(byTable.keys()).sort();
  let totalColumns = 0;

  const sections = [];

  for (const tableName of tables) {
    const cols = byTable.get(tableName);
    totalColumns += cols.length;

    const tableRows = cols.map((row) => {
      const colName = row["Column Name"] ?? row["column_name"] ?? row["Column Name"] ?? "";
      const dataType = normalizeType(row["Data Type"] ?? row["data_type"] ?? "");
      const length = formatLength(row["Length"] ?? row["length"], row["Precision"] ?? row["precision"]);
      const required = requiredFromNullable(row["Nullable"] ?? row["nullable"] ?? row["is_nullable"]);
      const rawComment = row["Comment"] ?? row["comment"] ?? row["column_comment"] ?? "";
      const refined = refineComment(rawComment);
      const description = refined ?? descriptionFromColumnName(colName);

      return { colName, dataType, length, required, description };
    });

    let md = `## Table: ${escapePipe(tableName)}\n\n`;
    md += `This table stores data related to **${tableName.replace(/_/g, " ")}**. It is used by the system to maintain records and support business processes.\n\n`;
    md += "| Column Name | Data Type | Length | Required | Description |\n";
    md += "|-------------|-----------|--------|----------|-------------|\n";

    for (const r of tableRows) {
      md += `| ${escapePipe(r.colName)} | ${escapePipe(r.dataType)} | ${escapePipe(r.length)} | ${escapePipe(r.required)} | ${escapePipe(r.description)} |\n`;
    }

    md += "\n---\n\n";
    sections.push(md);
  }

  const today = new Date().toISOString().slice(0, 10);
  let doc = `# Data Dictionary\n\n`;
  doc += `**System Name:** ${systemName || "[Insert System Name]"}  \n`;
  doc += `**Document Version:** 1.0  \n`;
  doc += `**Date of Document:** ${today}\n\n`;
  doc += "---\n\n## Summary\n\n";
  doc += "| Metric | Count |\n|--------|-------|\n";
  doc += `| **Total Number of Tables** | ${tables.length} |\n`;
  doc += `| **Total Number of Columns** | ${totalColumns} |\n\n`;
  doc += "This document provides a business-friendly overview of the data structures used in the system. ";
  doc += "Each table is described below with its columns, data types, and business descriptions suitable for stakeholders and external clients.\n\n---\n\n";
  doc += sections.join("");
  doc += "\n*End of Data Dictionary*\n";

  return doc;
}

async function main() {
  const args = process.argv.slice(2);
  let inputPath = args[0];
  let outputPath = args[1];
  const systemName = process.env.SYSTEM_NAME || "";

  let lines;
  if (inputPath && fs.existsSync(inputPath)) {
    lines = await readCSV(inputPath);
  } else if (!process.stdin.isTTY) {
    lines = [];
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) lines.push(line);
  } else {
    console.error("Usage: node generate-data-dictionary.js <input.csv> [output.md]");
    console.error("       Or: cat schema.csv | node generate-data-dictionary.js > output.md");
    process.exit(1);
  }

  const { rows } = parseRows(lines);
  const doc = buildDoc(rows, systemName);

  if (outputPath) {
    fs.writeFileSync(outputPath, doc, "utf8");
    console.error(`Written: ${outputPath}`);
  } else {
    process.stdout.write(doc);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
