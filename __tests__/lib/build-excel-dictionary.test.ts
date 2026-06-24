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
    expect(workbook.getWorksheet("All Tables")!.getCell("A3").value).toBe(
      "TABLE: patient (ข้อมูลผู้ป่วย)"
    );
    expect(workbook.getWorksheet("All Tables")!.getCell("B5").value).toBe("Number");
  });

  it("givenTableComment_whenBuildWorkbook_thenUsesDbCommentInGroupedTableLabel", async () => {
    const workbook = await buildWorkbook([
      {
        table: "admit",
        table_comment: "DB comment should win",
        column_name: "admit_id",
        data_type: "bigint",
        length: 20,
        is_nullable: "NO",
      },
    ]);

    expect(workbook.getWorksheet("All Tables")!.getCell("A3").value).toBe(
      "TABLE: admit (DB comment should win)"
    );
  });

  it("givenNoTableCommentButExcelMappingExists_whenBuildWorkbook_thenUsesMappingComment", async () => {
    const workbook = await buildWorkbook([
      {
        table: "appointment",
        column_name: "appointment_id",
        data_type: "bigint",
        length: 20,
        is_nullable: "NO",
      },
    ]);

    expect(workbook.getWorksheet("All Tables")!.getCell("A3").value).toBe(
      "TABLE: appointment (ข้อมูลการทำนัด)"
    );
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
    expect(allTables.getCell("A3").value).toBe("TABLE: orders (-)");
    expect(allTables.getCell("E5").value).toBe("-");
    expect(allTables.getCell("D5").value).toBe("Yes");
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
    expect(allTables.getCell("E5").value).toBe("-");
  });

  it("givenEmptyInput_whenBuildWorkbook_thenReturnsWorkbookWithBaseSheetsOnly", async () => {
    const workbook = await buildWorkbook([]);

    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Cover", "All Tables"]);
    expect(workbook.getWorksheet("Cover")!.getCell("B10").value).toBe(0);
  });
});
