import { POST } from "@/app/api/db/connect/route";
import {
  getDatabaseConnectionHost,
  getDefaultDatabaseName,
  getPool,
} from "@/lib/db";
import type { NextRequest } from "next/server";

jest.mock("@/lib/db", () => ({
  getPool: jest.fn(),
  getDefaultDatabaseName: jest.fn(),
  getDatabaseConnectionHost: jest.fn(),
}));

const queryMock = jest.fn();
const getPoolMock = getPool as jest.MockedFunction<typeof getPool>;
const getDefaultDatabaseNameMock =
  getDefaultDatabaseName as jest.MockedFunction<typeof getDefaultDatabaseName>;
const getDatabaseConnectionHostMock =
  getDatabaseConnectionHost as jest.MockedFunction<
    typeof getDatabaseConnectionHost
  >;

function createRequest(body: unknown): NextRequest {
  return {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /api/db/connect", () => {
  beforeEach(() => {
    queryMock.mockReset();
    getPoolMock.mockClear();
    getDefaultDatabaseNameMock.mockClear();
    getDatabaseConnectionHostMock.mockClear();
    getPoolMock.mockReturnValue({ query: queryMock } as never);
    getDefaultDatabaseNameMock.mockReturnValue("imed_bhh");
    getDatabaseConnectionHostMock.mockReturnValue("192.168.0.212");
  });

  it("givenExplicitDatabase_whenConnect_thenReturnsConnectedDatabase", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ current_database: "imed_reporting", server_ip: "192.168.0.212" }],
    });

    const response = await POST(createRequest({ database: "imed_reporting" }));
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith("imed_reporting", undefined);
    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "connected",
      database: "imed_reporting",
      host: "192.168.0.212",
    });
  });

  it("givenNoDatabase_whenConnect_thenUsesDefaultDatabase", async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const response = await POST(createRequest({}));
    const body = await response.json();

    expect(getDefaultDatabaseNameMock).toHaveBeenCalled();
    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh", undefined);
    expect(body).toEqual({
      status: "connected",
      database: "imed_bhh",
      host: "192.168.0.212",
    });
  });

  it("givenHostInRequest_whenConnect_thenUsesProvidedHost", async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ current_database: "imed_bhh", server_ip: "192.168.0.99" }],
    });

    const response = await POST(
      createRequest({ database: "imed_bhh", host: "192.168.0.99" })
    );
    const body = await response.json();

    expect(getPoolMock).toHaveBeenCalledWith("imed_bhh", "192.168.0.99");
    expect(body).toEqual({
      status: "connected",
      database: "imed_bhh",
      host: "192.168.0.99",
    });
  });

  it("givenInvalidRequestOrPoolFailure_whenConnect_thenReturns400WithError", async () => {
    queryMock.mockRejectedValueOnce(new Error("invalid database"));
    const request = {
      json: jest.fn().mockRejectedValue(new Error("bad json")),
    } as unknown as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ status: "error", error: "invalid database" });
  });
});
