describe("lib/db", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete (globalThis as { pgPoolsByDatabase?: unknown }).pgPoolsByDatabase;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function mockPgPool() {
    const query = jest.fn();
    const Pool = jest.fn().mockImplementation(() => ({ query }));
    jest.doMock("pg", () => ({ Pool }));
    return { Pool, query };
  }

  it("givenMissingDatabaseUrl_whenImporting_thenThrows", async () => {
    process.env.DATABASE_URL = "";
    mockPgPool();

    await expect(import("@/lib/db")).rejects.toThrow("DATABASE_URL must be defined");
  });

  it("givenValidUrl_whenGettingDefaults_thenReturnsDatabaseMetadata", async () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/imed_bhh";
    mockPgPool();

    const db = await import("@/lib/db");
    expect(db.getDefaultDatabaseName()).toBe("imed_bhh");
    expect(db.getDefaultDatabaseKey()).toBe("imed_bhh");
    expect(db.getDatabaseOptions()).toEqual([{ key: "imed_bhh", label: "imed_bhh" }]);
  });

  it("givenSameDatabase_whenGetPoolCalledTwice_thenReusesPoolInstance", async () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/imed_bhh";
    const { Pool } = mockPgPool();
    const db = await import("@/lib/db");

    const first = db.getPool("imed_bhh");
    const second = db.getPool("imed_bhh");
    expect(first).toBe(second);
    expect(Pool).toHaveBeenCalledTimes(1);
  });

  it("givenDifferentDatabaseNames_whenGetPoolCalled_thenBuildsConnectionStringPerDatabase", async () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/default_db";
    const { Pool } = mockPgPool();
    const db = await import("@/lib/db");

    db.getPool("imed_reporting");
    db.getPool("imed_reporting_2");
    expect(Pool).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        connectionString: "postgresql://u:p@localhost:5432/imed_reporting",
      })
    );
    expect(Pool).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        connectionString: "postgresql://u:p@localhost:5432/imed_reporting_2",
      })
    );
  });

  it("givenInvalidDatabaseName_whenGetPool_thenThrowsValidationError", async () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/default_db";
    mockPgPool();
    const db = await import("@/lib/db");

    expect(() => db.getPool("bad-name!")).toThrow("Invalid database name");
  });
});
