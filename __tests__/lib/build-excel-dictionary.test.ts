import { buildWorkbook, type DictionaryRow } from "@/lib/build-excel-dictionary";

describe("buildWorkbook", () => {
  it("givenValidRows_whenBuildWorkbook_thenCreatesCoverAllTablesAndPerTableSheets", async () => {
    const rows: DictionaryRow[] = [
      {
        Table: "patient",
        "Column Name": "patient_id",
        "Data Type": "integer",
        Length: 10,
        Nullable: "NO",
        Comment: "",
      },
      {
        Table: "patient",
        "Column Name": "patient_name",
        "Data Type": "character varying",
        Length: 255,
        Nullable: "YES",
        Comment: "Display name",
      },
      {
        Table: "visit/log",
        "Column Name": "created_at",
        "Data Type": "timestamp without time zone",
        Length: null,
        Nullable: "NO",
      },
    ];

    const workbook = await buildWorkbook(rows, "imed_bhh");

    expect(workbook.getWorksheet("Cover")).toBeDefined();
    expect(workbook.getWorksheet("All Tables")).toBeDefined();
    expect(workbook.worksheets.length).toBe(4);
    expect(workbook.getWorksheet("Cover")!.getCell("B4").value).toBe("imed_bhh");
    expect(workbook.getWorksheet("All Tables")!.getCell("C2").value).toBe("Number");
  });

  it("givenRowsWithoutComments_whenBuildWorkbook_thenUsesPlaceholderDescription", async () => {
    const workbook = await buildWorkbook([
      {
        table: "orders",
        column_name: "order_id",
        data_type: "bigint",
        length: 20,
        is_nullable: "NO",
        column_comment: null,
      },
    ]);

    const allTables = workbook.getWorksheet("All Tables")!;
    expect(allTables.getCell("F2").value).toBe("-");
    expect(allTables.getCell("E2").value).toBe("Yes");
  });

  it("givenRowsWithLegacyAutoDescription_whenBuildWorkbook_thenUsesPlaceholderDescription", async () => {
    const workbook = await buildWorkbook([
      {
        table: "orders",
        column_name: "order_id",
        data_type: "bigint",
        length: 20,
        is_nullable: "NO",
        column_comment: "Unique identifier for the related order record.",
      },
    ]);

    const allTables = workbook.getWorksheet("All Tables")!;
    expect(allTables.getCell("F2").value).toBe("-");
  });

  it("givenEmptyInput_whenBuildWorkbook_thenReturnsWorkbookWithBaseSheetsOnly", async () => {
    const workbook = await buildWorkbook([]);

    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Cover", "All Tables"]);
    expect(workbook.getWorksheet("Cover")!.getCell("B10").value).toBe(0);
  });
});
