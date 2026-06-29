import { buildWorkbook, type DictionaryRow } from "@/lib/build-excel-dictionary";

describe("buildWorkbook", () => {
  it("givenValidRows_whenBuildWorkbook_thenCreatesOnlyMainSheets", async () => {
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
    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Cover",
      "All Tables",
      "Human Tables",
      "Animal Tables",
    ]);
    expect(workbook.getWorksheet("patient")).toBeUndefined();
    expect(workbook.getWorksheet("visit_log")).toBeUndefined();
    expect(workbook.getWorksheet("Cover")!.getCell("B4").value).toBe("imed_bhh");
    expect(workbook.getWorksheet("All Tables")!.getCell("A3").value).toBe(
      "ชื่อตาราง : patient"
    );
    expect(workbook.getWorksheet("All Tables")!.getCell("B4").value).toBe(
      "ข้อมูลผู้ป่วย"
    );
    expect(workbook.getWorksheet("All Tables")!.getCell("B9").value).toBe("integer");
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
      "ชื่อตาราง : admit"
    );
    expect(workbook.getWorksheet("All Tables")!.getCell("B4").value).toBe(
      "DB comment should win"
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
      "ชื่อตาราง : appointment"
    );
    expect(workbook.getWorksheet("All Tables")!.getCell("B4").value).toBe(
      "ข้อมูลการทำนัด"
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
    expect(allTables.getCell("A3").value).toBe("ชื่อตาราง : orders");
    expect(allTables.getCell("B4").value).toBe("-");
    expect(allTables.getCell("D9").value).toBe("-");
    expect(allTables.getCell("C9").value).toBe("NO");
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
    expect(allTables.getCell("D9").value).toBe("-");
  });

  it("givenTableVersions_whenBuildWorkbook_thenCreatesHumanAndAnimalSheets", async () => {
    const workbook = await buildWorkbook([
      {
        table: "patient_only",
        table_version: "0",
        column_name: "patient_id",
        data_type: "bigint",
        is_nullable: "NO",
      },
      {
        table: "animal_only",
        table_version: "1",
        column_name: "animal_id",
        data_type: "bigint",
        is_nullable: "NO",
      },
      {
        table: "shared_table",
        table_version: "2",
        column_name: "id",
        data_type: "bigint",
        is_nullable: "NO",
      },
    ]);

    const humanSheet = workbook.getWorksheet("Human Tables")!;
    const animalSheet = workbook.getWorksheet("Animal Tables")!;

    expect(humanSheet).toBeDefined();
    expect(animalSheet).toBeDefined();
    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Cover",
      "All Tables",
      "Human Tables",
      "Animal Tables",
    ]);
    expect(humanSheet.getCell("A3").value).toBe("ชื่อตาราง : patient_only");
    expect(humanSheet.getCell("A11").value).toBe("ชื่อตาราง : shared_table");
    expect(animalSheet.getCell("A3").value).toBe("ชื่อตาราง : animal_only");
    expect(animalSheet.getCell("A11").value).toBe("ชื่อตาราง : shared_table");
  });

  it("givenTableNamesDifferOnlyByCase_whenBuildWorkbook_thenDoesNotCreatePerTableSheets", async () => {
    const workbook = await buildWorkbook([
      {
        table: "Export_Worksheet",
        column_name: "id",
        data_type: "bigint",
        is_nullable: "NO",
      },
      {
        table: "export_worksheet",
        column_name: "id",
        data_type: "bigint",
        is_nullable: "NO",
      },
    ]);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Cover",
      "All Tables",
      "Human Tables",
      "Animal Tables",
    ]);
    expect(workbook.getWorksheet("Export_Worksheet")).toBeUndefined();
    expect(workbook.getWorksheet("export_worksheet")).toBeUndefined();
  });

  it("givenEmptyInput_whenBuildWorkbook_thenReturnsWorkbookWithBaseSheetsOnly", async () => {
    const workbook = await buildWorkbook([]);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Cover",
      "All Tables",
      "Human Tables",
      "Animal Tables",
    ]);
    expect(workbook.getWorksheet("Cover")!.getCell("B10").value).toBe(0);
  });
});
