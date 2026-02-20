import { GET } from "@/app/api/schema/relationships/route";
import { getPool } from "@/lib/db";
import type { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(),
}));

const queryMock = jest.fn();
const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;

function createRequest(
  url = "http://localhost/api/schema/relationships?db=imed_bhh"
): NextRequest {
  return {
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/schema/relationships", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getPoolMock.mockClear();
    getPoolMock.mockReturnValue({ query: queryMock } as never);
  });

  it("givenValidRequest_whenFetchingRelationships_thenReturnsData", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ constraint_name: "fk_patient_visit" }],
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh", undefined);
    expect(body).toEqual({ data: [{ constraint_name: "fk_patient_visit" }] });
  });

  it("givenQueryFailure_whenFetchingRelationships_thenReturns500", async () => {
    queryMock.mockRejectedValueOnce(new Error("timeout"));

    const response = await GET(createRequest("http://localhost/api/schema/relationships"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "timeout" });
  });
});
