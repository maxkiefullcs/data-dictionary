import { GET } from "@/app/api/databases/route";

jest.mock("@/lib/db", () => ({
  getDatabaseOptions: jest.fn(() => [{ key: "imed_bhh", label: "imed_bhh" }]),
  getDefaultDatabaseKey: jest.fn(() => "imed_bhh"),
}));

describe("GET /api/databases", () => {
  it("givenConfiguredDatabases_whenRequested_thenReturnsOptionsAndDefault", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: [{ key: "imed_bhh", label: "imed_bhh" }],
      defaultKey: "imed_bhh",
    });
  });
});
