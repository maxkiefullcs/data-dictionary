import { GET } from "@/app/api/health/route";

const queryMock = jest.fn();

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(() => ({ query: queryMock })),
}));

describe("GET /api/health", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("givenDatabaseAvailable_whenHealthCalled_thenReturnsOk", async () => {
    queryMock.mockResolvedValueOnce({});
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(queryMock).toHaveBeenCalledWith("SELECT 1");
  });

  it("givenDatabaseUnavailable_whenHealthCalled_thenReturns503", async () => {
    queryMock.mockRejectedValueOnce(new Error("timeout"));
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: "error", message: "timeout" });
  });
});
