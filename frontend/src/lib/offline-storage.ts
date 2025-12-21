"use client";

const DB_NAME = "bgclive-offline";
const STORE_NAME = "feed-cache";
const DB_VERSION = 1;

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init() {
    if (this.db) return;

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject("Failed to open IndexedDB");
    });
  }

  async saveFeed(posts: any[]) {
    await this.init();
    if (!this.db) return;

    const transaction = this.db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    try {
      // Clear old cache first to keep it fresh
      store.clear();
      posts.slice(0, 50).forEach((post) => {
        store.put(post);
      });
    } catch (e: any) {
      if (e.name === "QuotaExceededError") {
        console.error("Offline storage quota exceeded");
        // T021 logic: show warning or prune more aggressively
      }
    }
  }

  async getFeed(): Promise<any[]> {
    await this.init();
    const db = this.db;
    if (!db) return [];

    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve([]);
    });
  }
}

export const offlineStorage = new OfflineStorage();
