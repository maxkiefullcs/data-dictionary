# Excel Export Refactor

## File structure (correct)

```
app/
  api/
    export/
      excel/
        route.ts          # POST handler; static import from @/lib
lib/
  build-excel-dictionary.ts   # ESM module used by Next.js (App Router)
  build-excel-dictionary.js   # CommonJS module used by CLI script only
scripts/
  generate-excel-data-dictionary.js   # CLI: requires lib .js via path relative to __dirname
```

- **App Router** uses `lib/build-excel-dictionary.ts` via the `@/` path alias (no file-system paths).
- **CLI script** uses `lib/build-excel-dictionary.js` via `path.join(__dirname, "..", "lib", "build-excel-dictionary.js")` (relative to the script file only).

## Fixed import in the API route

**Before (problematic):**

```ts
const pathModule = require("path");
const { buildWorkbook } = require(pathModule.join(process.cwd(), "lib", "build-excel-dictionary.js"));
```

**After (correct):**

```ts
import { buildWorkbook } from "@/lib/build-excel-dictionary";
```

- Uses **static ESM import** and the **`@/` path alias** from `tsconfig.json` (`"paths": { "@/*": ["./*"] }`).
- Next.js resolves `@/lib/build-excel-dictionary` at build time in both development and production, so no runtime path resolution or absolute paths are needed.

## Why the original error occurred

1. **Absolute path via `process.cwd()`**  
   The route used `require(path.join(process.cwd(), "lib", "build-excel-dictionary.js"))`.  
   - `process.cwd()` is the **current working directory** when the Node process starts (e.g. where you run `next dev` or `next start`), not necessarily the project root.  
   - In production, the app is often run from a different directory (e.g. `/app`, or a subfolder), so `process.cwd() + "/lib/..."` can point to a path that does not exist or to the wrong project.  
   - That leads to **"Cannot find module"** or loading the wrong file.

2. **Mixing ESM route with dynamic CommonJS `require()`**  
   The route is part of the App Router (ESM). Using `require()` with a constructed path bypasses the bundler’s resolution and depends on Node’s runtime resolution, which is not aligned with how Next.js resolves modules (path aliases, bundling, and output layout).

3. **Bundler and output layout**  
   In production, Next compiles the API route into the server bundle. The compiled code does not assume a fixed filesystem layout under `process.cwd()`. Relying on `process.cwd()` + `"lib/..."` is fragile and can break after build.

Using a **static import** from **`@/lib/build-excel-dictionary`** fixes this: the module is part of the same project and is resolved by the build (and path alias) in both dev and production, with no absolute or runtime path construction.

## Full working `route.ts` example

```ts
import { NextRequest, NextResponse } from "next/server";
import { buildWorkbook } from "@/lib/build-excel-dictionary";

export interface SchemaRowForExport {
  table_name: string;
  column_name: string;
  data_type: string;
  character_maximum_length?: number | null;
  numeric_precision?: number | null;
  is_nullable: string;
  column_default?: string | null;
  column_comment?: string | null;
}

interface ExportBody {
  rows: SchemaRowForExport[];
  systemName?: string;
  preparedFor?: string;
}

function toWorkbookRows(rows: SchemaRowForExport[]): Record<string, string | number>[] {
  return rows.map((r) => ({
    Table: r.table_name,
    "Column Name": r.column_name,
    "Data Type": r.data_type,
    Length: r.character_maximum_length ?? r.numeric_precision ?? "-",
    Precision: r.numeric_precision ?? "-",
    Nullable: r.is_nullable === "NO" ? "NOT NULL" : "NULL",
    Default: r.column_default ?? "-",
    Comment: r.column_comment ?? "-",
  }));
}

const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportBody;
    const { rows = [], systemName, preparedFor } = body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'rows' array." },
        { status: 400 }
      );
    }
    const workbook = await buildWorkbook(toWorkbookRows(rows), systemName, preparedFor);
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Data_Dictionary_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(buffer as Buffer, {
      status: 200,
      headers: {
        "Content-Type": EXCEL_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    console.error("[api/export/excel]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## Response headers (attachment)

The route returns the Excel file as a downloadable attachment with:

- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition:** `attachment; filename="Data_Dictionary_YYYY-MM-DD.xlsx"`
- **Cache-Control:** `no-store` (optional, to avoid caching the export)

Browsers will offer to download the file with the given filename.
