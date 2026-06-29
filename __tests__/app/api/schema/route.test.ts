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

    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh", undefined);
    expect(response.status).toBe(200);
    expect(body).toEqual({ data: [{ table_name: "patient", column_name: "id" }] });
  });

  it("givenImedDatadict_whenFetchingSchema_thenUsesDatadictAdapterQuery", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ table_name: "admit", column_name: "admit_id" }],
    });

    const response = await GET(
      createRequest("http://localhost/api/schema?db=imed_datadict&host=192.168.0.212")
    );
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith("imed_datadict", "192.168.0.212");
    expect(queryMock.mock.calls[0][0]).toContain("public.column_imed");
    expect(queryMock.mock.calls[0][0]).toContain("public.table_imed");
    expect(queryMock.mock.calls[0][0]).not.toContain("table_imedv2");
    expect(queryMock.mock.calls[0][0]).not.toContain("column_imedv2");
    expect(queryMock.mock.calls[0][0]).toContain("NULLIF(t.description, '')");
    expect(queryMock.mock.calls[0][0]).toContain("NULLIF(c.description, '')");
    expect(queryMock.mock.calls[0][0]).toContain("t.table_type");
    expect(queryMock.mock.calls[0][0]).toContain("c.column_index");
    expect(queryMock.mock.calls[0][0]).toContain("t.table_version");
    expect(response.status).toBe(200);
    expect(body).toEqual({ data: [{ table_name: "admit", column_name: "admit_id" }] });
  });

  it("givenDatabaseError_whenFetchingSchema_thenReturns500", async () => {
    queryMock.mockRejectedValueOnce(new Error("db down"));

    const response = await GET(createRequest("http://localhost/api/schema"));
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith(undefined, undefined);
    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "db down" });
  });
});
