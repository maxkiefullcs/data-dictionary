import { buildRelationshipWorkbook } from "@/lib/build-relationship-workbook";

describe("buildRelationshipWorkbook", () => {
  it("givenSpecificTable_whenBuildWorkbook_thenSetsInboundOutboundDirections", async () => {
    const workbook = await buildRelationshipWorkbook(
      [
        {
          constraint_name: "fk_a_b",
          source_table: "a",
          source_column: "b_id",
          target_table: "b",
          target_column: "id",
          update_rule: "CASCADE",
          delete_rule: null,
        },
        {
          constraint_name: "fk_c_a",
          source_table: "c",
          source_column: "a_id",
          target_table: "a",
          target_column: "id",
          update_rule: null,
          delete_rule: "SET NULL",
        },
      ],
      {
        sourceMode: "constraints",
        selectedTable: "a",
        allTablesValue: "ALL",
      }
    );

    const sheet = workbook.getWorksheet("Relationships")!;
    expect(sheet.getCell("A2").value).toBe("Outbound");
    expect(sheet.getCell("A3").value).toBe("Inbound");
    expect(sheet.getCell("G2").value).toBe("CASCADE");
    expect(sheet.getCell("H2").value).toBe("-");
  });

  it("givenAllTables_whenBuildWorkbook_thenDirectionIsAll", async () => {
    const workbook = await buildRelationshipWorkbook(
      [
        {
          constraint_name: "fk_a_b",
          source_table: "a",
          source_column: "b_id",
          target_table: "b",
          target_column: "id",
          update_rule: null,
          delete_rule: null,
        },
      ],
      {
        sourceMode: "inferred",
        selectedTable: "ALL",
        allTablesValue: "ALL",
      }
    );

    const summary = workbook.getWorksheet("Summary")!;
    const sheet = workbook.getWorksheet("Relationships")!;
    expect(summary.getCell("B5").value).toBe("Inferred");
    expect(summary.getCell("B6").value).toBe("All Tables");
    expect(sheet.getCell("A2").value).toBe("All");
  });

  it("givenEmptyRows_whenBuildWorkbook_thenCreatesSheetsAndHeaders", async () => {
    const workbook = await buildRelationshipWorkbook([], {
      sourceMode: "constraints",
      selectedTable: "",
      allTablesValue: "ALL",
    });

    expect(workbook.getWorksheet("Summary")).toBeDefined();
    expect(workbook.getWorksheet("Relationships")).toBeDefined();
    expect(workbook.getWorksheet("Relationships")!.getCell("A1").value).toBe(
      "Direction"
    );
  });
});
