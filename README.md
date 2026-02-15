# Data Dictionary

A minimal web app to browse PostgreSQL schema: tables and column definitions.

## Tech stack

- **Next.js** (App Router)
- **Tailwind CSS**
- **PostgreSQL** (via `pg`)

## Setup

1. Copy environment example and set your database URL:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/your_database
   ```

2. Install and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000).

## Features

- **Dropdown**: Select a table from the public schema.
- **Load**: Load column definitions for the selected table.
- **Refresh**: Reload the list of tables from the database.
- **Export CSV**: Download the current (filtered) columns as a CSV file.
- **Search**: Filter columns by name.

## API

- `GET /api/schema` — Returns `{ tables: string[] }` (all public tables).
- `GET /api/schema?table=<name>` — Returns `{ columns: SchemaColumn[] }` for the given table.
