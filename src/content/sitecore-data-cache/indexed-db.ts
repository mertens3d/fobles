// @source-path [fobles] src/content/sitecore-data-cache/indexed-db.ts

export const DATABASE_NAME = "fobles-sitecore-data-cache";
export const DATABASE_VERSION = 1;
export const ITEM_STORE_NAME = "sitecoreItems";
export const LAST_ACCESSED_INDEX_NAME = "lastAccessedAt";

let openDatabasePromise: Promise<IDBDatabase> | undefined;

export function getRequestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  openDatabasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(ITEM_STORE_NAME)) {
        const store = db.createObjectStore(ITEM_STORE_NAME, { keyPath: "key" });
        store.createIndex(LAST_ACCESSED_INDEX_NAME, "lastAccessedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open the Sitecore data cache database"));
  });

  return openDatabasePromise;
}

// Runs `run` against the item store inside one transaction - callers that need "read current
// record, merge, write it back" (e.g. putFact) must do all three steps inside a single `run`
// call, since that's what gives IndexedDB's own per-store transaction serialization the chance
// to prevent a lost update between two concurrent writes.
export async function runItemStoreTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(ITEM_STORE_NAME, mode);
  const store = transaction.objectStore(ITEM_STORE_NAME);

  const [result] = await Promise.all([
    Promise.resolve(run(store)),
    waitForTransaction(transaction),
  ]);

  return result;
}

// Test-only: drops the cached connection so a test can reopen against a freshly reset
// fake-indexeddb factory instead of inheriting state left by a previous test.
export function resetDatabaseConnectionForTests(): void {
  const pending = openDatabasePromise;
  openDatabasePromise = undefined;

  if (pending) {
    void pending.then((db) => db.close()).catch(() => undefined);
  }
}
