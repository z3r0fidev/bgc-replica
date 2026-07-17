import { describe, it, expect, vi } from "vitest";
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

// `src/lib/auth.ts` imports `@/lib/prisma`, which constructs a real `pg.Pool`
// and `PrismaClient` at module load time. Mock every module that touches the
// database or network so importing the auth config is side-effect free.
vi.mock("@/lib/prisma", () => ({
  prisma: { __mockPrismaClient: true },
}));

vi.mock("next-auth", () => ({
  default: vi.fn((config: unknown) => config),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn((prismaClient: unknown) => ({
    type: "prisma-adapter",
    prismaClient,
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config: unknown) => ({ ...(config as object), id: "google", type: "google" })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => ({
    ...(config as object),
    id: "credentials",
    type: "credentials",
  })),
}));

// Import after mocks are registered so the module under test picks them up.
import { prisma } from "@/lib/prisma";
import "@/lib/auth";

/**
 * `NextAuth(config)` is mocked to be the identity function, so the config
 * object built by `src/lib/auth.ts` is exactly the first argument it was
 * called with. Grabbing it here lets us exercise the real callbacks and
 * providers defined in that file directly.
 */
const nextAuthMock = vi.mocked(NextAuth);
const config = nextAuthMock.mock.calls[0][0] as unknown as {
  session: { strategy: string };
  callbacks: {
    session: (args: { session: Record<string, unknown>; token: Record<string, unknown> }) => unknown;
    jwt: (args: { token: Record<string, unknown> }) => unknown;
  };
  providers: Array<{ id?: string; authorize?: (credentials?: unknown) => unknown }>;
};

describe("src/lib/auth.ts", () => {
  it("calls NextAuth exactly once to build the config", () => {
    expect(nextAuthMock).toHaveBeenCalledTimes(1);
  });

  describe("session strategy", () => {
    it("uses JWT session strategy", () => {
      expect(config.session.strategy).toBe("jwt");
    });
  });

  describe("PrismaAdapter wiring", () => {
    it("was constructed with the shared prisma client from @/lib/prisma", () => {
      expect(PrismaAdapter).toHaveBeenCalledWith(prisma);
    });
  });

  describe("callbacks.session", () => {
    it("sets session.user.id from token.sub when both are present", async () => {
      const session = { user: { name: "Alice" } };
      const token = { sub: "user-123" };

      const result = await config.callbacks.session({ session, token });

      expect((result as { user: { id: string } }).user.id).toBe("user-123");
      expect(result).toBe(session);
    });

    it("does not set session.user.id when token.sub is missing", async () => {
      const session = { user: { name: "Bob" } };
      const token = {};

      const result = await config.callbacks.session({ session, token });

      expect((result as { user: Record<string, unknown> }).user).not.toHaveProperty("id");
      expect(result).toBe(session);
    });

    it("does not throw and returns session unchanged when session.user is missing", async () => {
      const session = {} as Record<string, unknown>;
      const token = { sub: "user-123" };

      const result = await config.callbacks.session({ session, token });

      expect(result).toBe(session);
      expect(result).not.toHaveProperty("user");
    });
  });

  describe("callbacks.jwt", () => {
    it("returns the token unchanged, including arbitrary extra fields (passthrough)", async () => {
      const token = { sub: "user-123", email: "alice@example.com", customField: "keep-me" };

      const result = await config.callbacks.jwt({ token });

      expect(result).toBe(token);
      expect(result).toEqual({
        sub: "user-123",
        email: "alice@example.com",
        customField: "keep-me",
      });
    });
  });

  describe("Credentials provider authorize()", () => {
    it("always returns null regardless of input (unimplemented placeholder)", async () => {
      const credentialsProvider = config.providers.find((p) => p.id === "credentials");
      expect(credentialsProvider).toBeDefined();

      await expect(
        credentialsProvider!.authorize!({ email: "a@b.com", password: "secret" })
      ).resolves.toBeNull();
      await expect(credentialsProvider!.authorize!(undefined)).resolves.toBeNull();
    });
  });
});
