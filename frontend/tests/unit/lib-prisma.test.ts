import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `src/lib/prisma.ts` runs all of its logic as side effects at module load
// time: it reads `process.env.DATABASE_URL` / `NODE_ENV`, may throw or warn,
// constructs a `pg.Pool`, a `PrismaPg` adapter, and (conditionally) a
// `PrismaClient`, and reads/writes a global cache (`globalForPrisma.prisma`).
// To exercise each branch we must reset the module registry and re-import
// the module fresh for every scenario, with mocks that let us assert on
// construction args without touching a real database.
//
// `vi.mock` factories are hoisted and registered once for the whole file;
// they remain in effect across `vi.resetModules()` calls (resetModules only
// clears the *module registry*, not mock registrations), so we only need to
// declare them once here and reset their call state per-test.

const mockPoolCtor = vi.fn();
const mockPrismaPgCtor = vi.fn();
const mockPrismaClientCtor = vi.fn();

vi.mock("pg", () => ({
  Pool: mockPoolCtor,
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: mockPrismaPgCtor,
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: mockPrismaClientCtor,
}));

/** Distinguishable marker instances so we can assert on identity/wiring. */
interface PoolInstance {
  __isPool: true;
  connectionString: string | undefined;
}
interface PrismaPgInstance {
  __isPrismaPg: true;
  pool: unknown;
}
interface PrismaClientInstance {
  __isPrismaClient: true;
  id: number;
  adapter: unknown;
}

let prismaClientCallCount = 0;

// `pool.ts`, `adapter-pg`, and `@prisma/client` are all invoked with `new`
// in the module under test, so the mock implementations must be regular
// `function` expressions — arrow functions have no `[[Construct]]` and
// throw "is not a constructor" when called via `new`.
function configureMocks() {
  mockPoolCtor.mockImplementation(function (
    this: PoolInstance,
    opts: { connectionString: string | undefined }
  ) {
    this.__isPool = true;
    this.connectionString = opts.connectionString;
  });
  mockPrismaPgCtor.mockImplementation(function (this: PrismaPgInstance, pool: unknown) {
    this.__isPrismaPg = true;
    this.pool = pool;
  });
  mockPrismaClientCtor.mockImplementation(function (
    this: PrismaClientInstance,
    opts: { adapter: unknown }
  ) {
    this.__isPrismaClient = true;
    this.id = ++prismaClientCallCount;
    this.adapter = opts.adapter;
  });
}

// Keys we mutate that are process-wide / global rather than module-local, so
// they must be saved and restored around every test to avoid leaking state
// into other test files in the same Vitest worker.
const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const globalForPrisma = globalThis as unknown as { prisma?: unknown };
const ORIGINAL_GLOBAL_PRISMA = globalForPrisma.prisma;

function setDatabaseUrl(value: string | undefined) {
  if (value === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = value;
  }
}

// `@types/node` declares `NODE_ENV` as a readonly property (to discourage
// mutating it in application code), but at runtime it's a plain env var and
// Vitest does not freeze or define-replace it for code reading
// `process.env.NODE_ENV` directly (only Vite's `import.meta.env` is
// define-replaced) — confirmed by running these tests. Cast to a mutable
// view purely to satisfy the type checker for this test-only helper.
const mutableEnv = process.env as { NODE_ENV?: string; DATABASE_URL?: string };

function setNodeEnv(value: string | undefined) {
  if (value === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = value;
  }
}

beforeEach(() => {
  vi.resetModules();
  prismaClientCallCount = 0;
  mockPoolCtor.mockReset();
  mockPrismaPgCtor.mockReset();
  mockPrismaClientCtor.mockReset();
  configureMocks();
  delete globalForPrisma.prisma;
});

afterEach(() => {
  setDatabaseUrl(ORIGINAL_DATABASE_URL);
  setNodeEnv(ORIGINAL_NODE_ENV);
  if (ORIGINAL_GLOBAL_PRISMA === undefined) {
    delete globalForPrisma.prisma;
  } else {
    globalForPrisma.prisma = ORIGINAL_GLOBAL_PRISMA;
  }
  vi.restoreAllMocks();
});

describe("src/lib/prisma.ts", () => {
  describe("missing DATABASE_URL", () => {
    it("throws when NODE_ENV is production", async () => {
      setDatabaseUrl(undefined);
      setNodeEnv("production");

      await expect(import("@/lib/prisma")).rejects.toThrow("DATABASE_URL is not set");
    });

    it("does not throw and warns via console.warn when NODE_ENV is not production", async () => {
      setDatabaseUrl(undefined);
      setNodeEnv("test");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(import("@/lib/prisma")).resolves.toBeDefined();

      expect(warnSpy).toHaveBeenCalledWith(
        "DATABASE_URL is not set. PrismaClient may fail to initialize."
      );
    });
  });

  describe("DATABASE_URL present", () => {
    it("does not throw and does not warn", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/db");
      setNodeEnv("test");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await expect(import("@/lib/prisma")).resolves.toBeDefined();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("Pool / PrismaPg / PrismaClient wiring", () => {
    it("constructs Pool with { connectionString: DATABASE_URL }", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/wiring-db");
      setNodeEnv("test");

      await import("@/lib/prisma");

      expect(mockPoolCtor).toHaveBeenCalledTimes(1);
      expect(mockPoolCtor).toHaveBeenCalledWith({
        connectionString: "postgresql://user:pass@localhost:5432/wiring-db",
      });
    });

    it("constructs PrismaPg with the Pool instance", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/wiring-db");
      setNodeEnv("test");

      await import("@/lib/prisma");

      const poolInstance = mockPoolCtor.mock.results[0]?.value as PoolInstance;
      expect(mockPrismaPgCtor).toHaveBeenCalledTimes(1);
      expect(mockPrismaPgCtor).toHaveBeenCalledWith(poolInstance);
    });

    it("constructs PrismaClient with { adapter } when no global instance pre-exists", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/wiring-db");
      setNodeEnv("test");
      delete globalForPrisma.prisma;

      await import("@/lib/prisma");

      const adapterInstance = mockPrismaPgCtor.mock.results[0]?.value as PrismaPgInstance;
      expect(mockPrismaClientCtor).toHaveBeenCalledTimes(1);
      expect(mockPrismaClientCtor).toHaveBeenCalledWith({ adapter: adapterInstance });
    });
  });

  describe("global caching", () => {
    it("sets globalThis.prisma to the exported instance when NODE_ENV !== production", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/cache-db");
      setNodeEnv("development");
      delete globalForPrisma.prisma;

      const mod = await import("@/lib/prisma");

      expect(globalForPrisma.prisma).toBe(mod.prisma);
    });

    it("does not set globalThis.prisma when NODE_ENV === production", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/cache-db");
      setNodeEnv("production");
      delete globalForPrisma.prisma;

      await import("@/lib/prisma");

      expect(globalForPrisma.prisma).toBeUndefined();
    });

    it("reuses a pre-existing globalThis.prisma instead of constructing a new PrismaClient", async () => {
      setDatabaseUrl("postgresql://user:pass@localhost:5432/cache-db");
      setNodeEnv("development");
      const existing: PrismaClientInstance = {
        __isPrismaClient: true,
        id: -1,
        adapter: null,
      };
      globalForPrisma.prisma = existing;

      const mod = await import("@/lib/prisma");

      expect(mod.prisma).toBe(existing);
      expect(mockPrismaClientCtor).not.toHaveBeenCalled();
    });
  });
});
