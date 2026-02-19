import { POST } from "@/app/api/export/relationships/route";
import { buildRelationshipWorkbook } from "@/lib/build-relationship-workbook";
import type { NextRequest } from "next/server";

jest.mock("@/lib/build-relationship-workbook", () => ({
  buildRelationshipWorkbook: jest.fn(),
}));

const writeBufferMock = jest.fn();
const buildRelationshipWorkbookMock =
  buildRelationshipWorkbook as jest.MockedFunction<typeof buildRelationshipWorkbook>;

function createRequest(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/export/relationships", () => {
  beforeEach(() => {
    writeBufferMock.mockReset();
    buildRelationshipWorkbookMock.mockClear();
    buildRelationshipWorkbookMock.mockReturnValue({
      xlsx: { writeBuffer: writeBufferMock },
    } as never);
  });

  it("givenValidBody_whenExporting_thenReturnsExcelAttachment", async () => {
    writeBufferMock.mockResolvedValueOnce(new Uint8Array([1, 2, 3]));

    const response = await POST(
      createRequest({
        rows: [{ constraint_name: "fk", source_table: "a" }],
        sourceMode: "inferred",
        selectedTable: "patient",
        allTablesValue: "ALL",
      })
    );

    expect(response.status).toBe(200);
    expect(buildRelationshipWorkbookMock).toHaveBeenCalledWith(
      [{ constraint_name: "fk", source_table: "a" }],
      {
        sourceMode: "inferred",
        selectedTable: "patient",
        allTablesValue: "ALL",
      }
    );
    expect(response.headers.get("Content-Type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("givenInvalidSourceModeAndRows_whenExporting_thenUsesDefaults", async () => {
    writeBufferMock.mockResolvedValueOnce(new ArrayBuffer(2));

    await POST(createRequest({ rows: null, sourceMode: "bad-value" }));

    expect(buildRelationshipWorkbookMock).toHaveBeenCalledWith([], {
      sourceMode: "constraints",
      selectedTable: "",
      allTablesValue: "ALL",
    });
  });

  it("givenWorkbookBuildFailure_whenExporting_thenReturns500", async () => {
    buildRelationshipWorkbookMock.mockImplementationOnce(() => {
      throw new Error("cannot build");
    });

    const response = await POST(createRequest({ rows: [] }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "cannot build" });
  });
});
