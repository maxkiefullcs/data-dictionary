import { GET } from "@/app/api/schema/relationships/inferred/route";
import { getPool } from "@/lib/db";
import { inferRelationships } from "@/lib/infer-relationships";
import type { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(),
}));

const queryMock = jest.fn();
const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;

function createRequest(
  url = "http://localhost/api/schema/relationships/inferred?db=imed_bhh"
): NextRequest {
  return {
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("inferRelationships", () => {
  it("givenColumnsWithForeignKeyNaming_whenInfer_thenBuildsExpectedRelationships", () => {
    const result = inferRelationships([
      { table_name: "visit", column_name: "patient_id" },
      { table_name: "patient", column_name: "id" },
      { table_name: "visit", column_name: "doctor_id" },
      { table_name: "doctors", column_name: "id" },
      { table_name: "visit", column_name: "id" },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_table: "visit",
          source_column: "patient_id",
          target_table: "patient",
          target_column: "id",
        }),
        expect.objectContaining({
          source_table: "visit",
          source_column: "doctor_id",
          target_table: "doctors",
          target_column: "id",
        }),
      ])
    );
  });

  it("givenDuplicateOrInvalidCandidates_whenInfer_thenSkipsDuplicatesAndPlainId", () => {
    const result = inferRelationships([
      { table_name: "order_items", column_name: "order_id" },
      { table_name: "orders", column_name: "id" },
      { table_name: "order_items", column_name: "order_id" },
      { table_name: "order_items", column_name: "id" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].source_column).toBe("order_id");
  });
});

describe("GET /api/schema/relationships/inferred", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getPoolMock.mockClear();
    getPoolMock.mockReturnValue({ query: queryMock } as never);
  });

  it("givenQueryResult_whenRequested_thenReturnsInferredData", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { table_name: "visit", column_name: "patient_id" },
        { table_name: "patient", column_name: "id" },
      ],
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh");
    expect(body.data).toHaveLength(1);
  });

  it("givenQueryError_whenRequested_thenReturns500", async () => {
    queryMock.mockRejectedValueOnce(new Error("inference failed"));
    const response = await GET(
      createRequest("http://localhost/api/schema/relationships/inferred")
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "inference failed" });
  });
});
