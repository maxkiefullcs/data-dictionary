# Data Dictionary – Client-Ready Export

This folder contains tools and templates to turn a raw schema export (Excel/CSV) into a **client-ready Data Dictionary** document.

## Quick Start

1. **Export your schema** from the database or the Data Dictionary app as CSV with columns:
   - `Table`, `Column Name`, `Data Type`, `Length`, `Precision`, `Nullable`, `Default`, `Comment`

2. **Generate the document:**
   ```bash
   node scripts/generate-data-dictionary.js your-export.csv docs/Data_Dictionary_Client.md
   ```

3. **Optional:** Set system name for the header:
   ```bash
   SYSTEM_NAME="My Application" node scripts/generate-data-dictionary.js export.csv output.md
   ```

4. **Convert to PDF:** Open the generated `.md` in Word, Google Docs, or use a Markdown-to-PDF tool (e.g. Pandoc, VS Code extension) for a polished PDF report.

## What the Script Does

- **Groups** all rows by **Table** and adds a `## Table: <Name>` section for each.
- **Maps technical types** to client-friendly terms (e.g. `character` → Text, `double precision` → Number, `timestamp` → DateTime, `NOT NULL` → Required).
- **Builds a single table per section** with columns: **Column Name | Data Type | Length | Required | Description**.
- **Descriptions:** Uses **Comment** when present; otherwise generates a short business description from the column name.
- **Adds a summary** at the top: Document title, System Name, Total Tables, Total Columns, Version, Date.

## Template

See `DATA_DICTIONARY_TEMPLATE.md` for the exact structure and placeholders. The script outputs Markdown in that format so it can be turned into a PDF or Word document for clients.

## CSV Format

Your CSV should have a header row and columns matching (case-insensitive where supported):

| Table | Column Name | Data Type | Length | Precision | Nullable | Default | Comment |
|-------|-------------|-----------|--------|-----------|----------|---------|---------|
| CounterVisit | Period_ID | varchar | 7 | | NOT NULL | | |
| CounterVisit | BU | varchar | 5 | | NULL | | Business unit code |

The script accepts both quoted and unquoted values and normalizes common column name variants (`Column Name`, `column_name`, etc.).

---

## Excel Data Dictionary (client-ready workbook)

A separate script generates a **formatted Excel workbook** suitable for enterprise clients.

### Setup

```bash
npm install
```

(The project includes the `exceljs` dependency.)

### Usage

```bash
node scripts/generate-excel-data-dictionary.js your-export.csv output.xlsx
```

Or with a system name:

```bash
SYSTEM_NAME="Sales Analytics System" node scripts/generate-excel-data-dictionary.js schema.csv docs/Data_Dictionary.xlsx
```

### Workbook structure

1. **Cover** – Document Title (Data Dictionary), System Name, Version (1.0), Date, Total Tables, Total Columns.
2. **Table Index** – Table Name, Business Description, Number of Columns.
3. **One sheet per table** – Each sheet includes:
   - Title: `Table: <Table Name>`
   - Short business-friendly table description
   - Columns: **Column Name | Data Type | Length | Required | Description**
   - Data types converted to Text / Number / DateTime; NOT NULL → Yes, NULL → No
   - Header row frozen for scrolling

### Formatting

- Dark blue header row (`#1E3A5F`) with white bold text
- Consistent column widths; description column wraps
- No grid lines on Cover; clean layout
- Sheet names sanitized for Excel (no `\ / * ? : [ ]`, max 31 chars)

---

## Docker deployment

The app can run in Docker for production. The database is expected on your internal network (not in the same compose stack).

1. **Create `.env`** from `.env.example` and set `DATABASE_URL` to your internal PostgreSQL (host, port, user, password, database). Do not hardcode credentials in the image.
2. **Build and run:**
   ```bash
   docker compose up -d
   ```
3. The app listens on `0.0.0.0:3000` inside the container; port mapping is `3000:3000` in `docker-compose.yml`. Restart policy is `unless-stopped`.
4. To rebuild after code changes: `docker compose up -d --build`.
