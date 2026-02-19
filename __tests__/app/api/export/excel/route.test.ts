import { POST } from "@/app/api/export/excel/route";
import { getPool } from "@/lib/db";
import { buildWorkbook } from "@/lib/build-excel-dictionary";
import type { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(),
}));

jest.mock("@/lib/build-excel-dictionary", () => ({
  buildWorkbook: jest.fn(),
}));

const queryMock = jest.fn();
const writeBufferMock = jest.fn();
const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;
const buildWorkbookMock = buildWorkbook as jest.MockedFunction<typeof buildWorkbook>;

function createRequest(body: unknown, db = "imed_bhh"): NextRequest {
  return {
    nextUrl: new URL(`http://localhost/api/export/excel?db=${db}`),
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/export/excel", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getPoolMock.mockClear();
    buildWorkbookMock.mockClear();
    writeBufferMock.mockReset();
    getPoolMock.mockReturnValue({ query: queryMock } as never);
    buildWorkbookMock.mockReturnValue({
      xlsx: { writeBuffer: writeBufferMock },
    } as never);
  });

  it("givenEmptyRows_whenExportRequested_thenReturns400", async () => {
    const response = await POST(createRequest({ rows: [] }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("non-empty 'rows' array");
  });

  it("givenValidRows_whenExportRequested_thenBuildsWorkbookAndReturnsFile", async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ current_database: "imed_reporting" }] });
    writeBufferMock.mockResolvedValueOnce(new Uint8Array([1, 2]));

    const response = await POST(
      createRequest({
        rows: [
          {
            table_name: "patient",
            column_name: "patient_id",
            data_type: "integer",
            character_maximum_length: 10,
            numeric_precision: null,
            is_nullable: "NO",
            column_default: null,
            column_comment: null,
          },
        ],
      })
    );

    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh");
    expect(buildWorkbookMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          Table: "patient",
          "Column Name": "patient_id",
          Nullable: "NOT NULL",
        }),
      ],
      "imed_reporting"
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("Data_Dictionary_");
  });

  it("givenCurrentDatabaseQueryFails_whenExportRequested_thenFallsBackToDefaultName", async () => {
    queryMock.mockRejectedValueOnce(new Error("db name unavailable"));
    writeBufferMock.mockResolvedValueOnce(new ArrayBuffer(8));

    await POST(
      createRequest({
        rows: [
          {
            table_name: "patient",
            column_name: "name",
            data_type: "varchar",
            is_nullable: "YES",
          },
        ],
      })
    );

    expect(buildWorkbookMock).toHaveBeenCalledWith(expect.any(Array), "Database");
  });

  it("givenUnexpectedError_whenExportRequested_thenReturns500", async () => {
    getPoolMock.mockImplementationOnce(() => {
      throw new Error("pool unavailable");
    });

    const response = await POST(createRequest({ rows: [{ table_name: "x" }] }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "pool unavailable" });
  });
});
