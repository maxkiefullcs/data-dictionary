/**
 * Generates a client-ready Excel Data Dictionary (same format as Professional_Data_Dictionary_Template.xlsx).
 * Uses lib/build-excel-dictionary.js for workbook building.
 *
 * Expected CSV columns: Table, Column Name, Data Type, Length, Precision, Nullable, Default, Comment
 *
 * Usage:
 *   node scripts/generate-excel-data-dictionary.js <input.csv> [output.xlsx]
 *   SYSTEM_NAME="My System" PREPARED_FOR="Client Name" node scripts/generate-excel-data-dictionary.js schema.csv
 *
 * Requires: npm install exceljs
 */

const fs = require("fs");
const readline = require("readline");
const path = require("path");
const { buildWorkbook } = require(path.join(__dirname, "..", "lib", "build-excel-dictionary.js"));

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
      } else inQuotes = !inQuotes;
    } else if (inQuotes) current += ch;
    else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

async function readCSV(filePath) {
  const lines = [];
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, "utf8"), crlfDelay: Infinity });
  for await (const line of rl) lines.push(line);
  return lines;
}

function parseRows(lines) {
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, "").trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]).map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
    const row = {};
    headers.forEach((h, j) => { row[h] = cells[j] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

function get(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  const outputPath = args[1] || "Data_Dictionary.xlsx";

  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error("Usage: node generate-excel-data-dictionary.js <input.csv> [output.xlsx]");
    console.error("       DATABASE_NAME='mydb' node scripts/generate-excel-data-dictionary.js schema.csv");
    process.exit(1);
  }

  const lines = await readCSV(inputPath);
  const { rows } = parseRows(lines);
  const dataRows = rows.filter((r) => get(r, "Table", "table"));
  if (dataRows.length === 0) {
    console.error("No rows with a 'Table' column found in the CSV.");
    process.exit(1);
  }

  const databaseName = process.env.DATABASE_NAME || process.env.SYSTEM_NAME || undefined;
  const workbook = await buildWorkbook(dataRows, databaseName);
  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync(outputPath, buffer);
  console.log(`Written: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
