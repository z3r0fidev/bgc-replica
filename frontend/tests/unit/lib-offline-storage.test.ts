import { describe, it, expect, vi, afterEach } from "vitest";
import { OfflineStorage, offlineStorage } from "@/lib/offline-storage";
import type { FeedPost } from "@/types/feed";

// Mirrors the private constants inside src/lib/offline-storage.ts. Not exported
// by the source module, so duplicated here to assert against the real values.
const DB_NAME = "bgclive-offline";
const STORE_NAME = "feed-cache";
const DB_VERSION = 1;

function makePosts(count: number, prefix = "p"): FeedPost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    author_id: "author-1",
    content: `content ${prefix}-${i}`,
    created_at: new Date().toISOString(),
  }));
}

/**
 * Minimal fake IDBOpenDBRequest. The real request has onupgradeneeded /
 * onsuccess / onerror assigned by the caller (OfflineStorage#init), and we
 * trigger them manually from the test to drive the fake open() lifecycle.
 */
function createFakeIndexedDB() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const request: any = {};
  const open = vi.fn(() => request);
  return { open, request };
}

function createFakeStore(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    clear: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
    ...overrides,
  };
}

function createFakeDb({
  storeNames = [] as string[],
  store,
}: {
  storeNames?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any;
}) {
  const transactionObj = { objectStore: vi.fn(() => store) };
  return {
    objectStoreNames: { contains: (name: string) => storeNames.includes(name) },
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => transactionObj),
  };
}

describe("OfflineStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("init", () => {
    it("opens the database with the correct name and version", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.init();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p;

      expect(open).toHaveBeenCalledWith(DB_NAME, DB_VERSION);
    });

    it("creates the object store on upgrade when it does not already exist", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [], store });
      const storage = new OfflineStorage();

      const p = storage.init();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p;

      expect(db.createObjectStore).toHaveBeenCalledWith(STORE_NAME, { keyPath: "id" });
    });

    it("does not recreate the object store on upgrade when it already exists", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.init();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p;

      expect(db.createObjectStore).not.toHaveBeenCalled();
    });

    it("resolves once onsuccess fires and stores the resulting db instance", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.init();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });

      await expect(p).resolves.toBeUndefined();
    });

    it("rejects when opening the database fails", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const storage = new OfflineStorage();

      const p = storage.init();
      request.onerror();

      await expect(p).rejects.toBe("Failed to open IndexedDB");
    });

    it("does not call indexedDB.open again once already initialized", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p1 = storage.saveFeed(makePosts(1));
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p1;

      await storage.saveFeed(makePosts(1));

      expect(open).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveFeed", () => {
    it("opens a readwrite transaction, clears the store, and puts each post", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();
      const posts = makePosts(3);

      const p = storage.saveFeed(posts);
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p;

      expect(db.transaction).toHaveBeenCalledWith(STORE_NAME, "readwrite");
      expect(store.clear).toHaveBeenCalledTimes(1);
      expect(store.put).toHaveBeenCalledTimes(3);
      posts.forEach((post) => {
        expect(store.put).toHaveBeenCalledWith(post);
      });
    });

    it("only puts the first 50 posts when given more than 50", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore();
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();
      const posts = makePosts(75);

      const p = storage.saveFeed(posts);
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });
      await p;

      expect(store.put).toHaveBeenCalledTimes(50);
      expect(store.put).toHaveBeenCalledWith(posts[0]);
      expect(store.put).toHaveBeenCalledWith(posts[49]);
      expect(store.put).not.toHaveBeenCalledWith(posts[50]);
    });

    it("swallows a QuotaExceededError DOMException and logs it without throwing", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const store = createFakeStore({
        clear: vi.fn(() => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }),
      });
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.saveFeed(makePosts(2));
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });

      await expect(p).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Offline storage quota exceeded");

      consoleErrorSpy.mockRestore();
    });

    it("propagates rejection when the database fails to open (init() rejects)", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      const storage = new OfflineStorage();

      const p = storage.saveFeed(makePosts(1));
      request.onerror();

      // saveFeed does `await this.init()` first with no surrounding try/catch,
      // so a rejected init() propagates straight out of saveFeed. There is no
      // reachable "this.db is null after a successful init()" path, since db
      // is only ever assigned inside the same onsuccess handler that resolves
      // init()'s promise.
      await expect(p).rejects.toBe("Failed to open IndexedDB");
    });
  });

  describe("getFeed", () => {
    it("resolves with the posts returned by store.getAll()'s onsuccess", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getAllRequest: any = {};
      const posts = makePosts(2);
      const store = createFakeStore({ getAll: vi.fn(() => getAllRequest) });
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.getFeed();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });

      // Let init()'s resolved promise's continuation (the rest of getFeed)
      // run before we drive the getAll() request's callbacks.
      await new Promise((resolve) => setTimeout(resolve, 0));

      getAllRequest.result = posts;
      getAllRequest.onsuccess();

      await expect(p).resolves.toEqual(posts);
      expect(db.transaction).toHaveBeenCalledWith(STORE_NAME, "readonly");
    });

    it("resolves to an empty array when store.getAll() errors", async () => {
      const { open, request } = createFakeIndexedDB();
      vi.stubGlobal("indexedDB", { open });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getAllRequest: any = {};
      const store = createFakeStore({ getAll: vi.fn(() => getAllRequest) });
      const db = createFakeDb({ storeNames: [STORE_NAME], store });
      const storage = new OfflineStorage();

      const p = storage.getFeed();
      request.onupgradeneeded({ target: { result: db } });
      request.onsuccess({ target: { result: db } });

      await new Promise((resolve) => setTimeout(resolve, 0));

      getAllRequest.onerror();

      await expect(p).resolves.toEqual([]);
    });

    // Note: "resolves to [] when this.db is null after init()" (spec case 8)
    // is not reachable and is intentionally not tested. `db` is only ever
    // assigned inside the onsuccess handler that also resolves init()'s
    // promise, so a successfully-resolved init() always leaves `this.db`
    // set. The only way for db to stay null is for init() to reject (onerror
    // path), which throws out of `await this.init()` inside getFeed rather
    // than falling through to the `if (!db) return []` early-return branch.
  });

  describe("offlineStorage singleton", () => {
    it("is an instance of OfflineStorage", () => {
      expect(offlineStorage).toBeInstanceOf(OfflineStorage);
    });
  });
});
