// @source-path [fobles] src/content/foundation/cache/sitecore-data/indexed-db.ts

export const DATABASE_NAME = "fobles-sitecore-data-cache";
export const DATABASE_VERSION = 3;
export const ITEM_STORE_NAME = "sitecoreItems";
export const FACT_STORE_NAME = "sitecoreFacts";
export const LAST_ACCESSED_INDEX_NAME = "lastAccessedAt";
export const FACT_ITEM_KEY_INDEX_NAME = "itemKey";

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
      if (db.objectStoreNames.contains(ITEM_STORE_NAME)) 
db.deleteObjectStore(ITEM_STORE_NAME);
      const itemStore = db.createObjectStore(ITEM_STORE_NAME, { keyPath: "key" });
      itemStore.createIndex(LAST_ACCESSED_INDEX_NAME, "lastAccessedAt");
      if (db.objectStoreNames.contains(FACT_STORE_NAME)) 
db.deleteObjectStore(FACT_STORE_NAME);
      const factStore = db.createObjectStore(FACT_STORE_NAME, { keyPath: "key" });
      factStore.createIndex(FACT_ITEM_KEY_INDEX_NAME, "itemKey");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open the Sitecore data cache database"));
  });
  return openDatabasePromise;
}

export async function runCacheTransaction<T>(
  mode: IDBTransactionMode,
  run: (itemStore: IDBObjectStore, factStore: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction([ITEM_STORE_NAME, FACT_STORE_NAME], mode);
  const result = await Promise.resolve(run(transaction.objectStore(ITEM_STORE_NAME), transaction.objectStore(FACT_STORE_NAME)));
  await waitForTransaction(transaction);
  return result;
}

export async function runItemStoreTransaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(ITEM_STORE_NAME, mode);
  const result = await Promise.resolve(run(transaction.objectStore(ITEM_STORE_NAME)));
  await waitForTransaction(transaction);
  return result;
}

export function resetDatabaseConnectionForTests(): void {
  const pending = openDatabasePromise;
  openDatabasePromise = undefined;
  if (pending) 
void pending.then((db) => db.close()).catch(() => undefined);
}
