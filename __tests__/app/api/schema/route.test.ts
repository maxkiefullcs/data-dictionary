import { GET } from "@/app/api/schema/route";
import { getPool } from "@/lib/db";
import type { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(),
}));

const queryMock = jest.fn();
const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;

function createRequest(url = "http://localhost/api/schema?db=imed_bhh"): NextRequest {
  return {
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/schema", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getPoolMock.mockClear();
    getPoolMock.mockReturnValue({ query: queryMock } as never);
  });

  it("givenValidDbKey_whenFetchingSchema_thenReturnsRows", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ table_name: "patient", column_name: "id" }],
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh");
    expect(response.status).toBe(200);
    expect(body).toEqual({ data: [{ table_name: "patient", column_name: "id" }] });
  });

  it("givenDatabaseError_whenFetchingSchema_thenReturns500", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));

    const response = await GET(createRequest("http://localhost/api/schema"));
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith(undefined);
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "db down" });
  });
});
