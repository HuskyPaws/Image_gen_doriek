// Lightweight IndexedDB helpers for storing large datasets (generation logs)

const DB_NAME = 'image-generator-db';
const DB_VERSION = 1;

export type ObjectStoreName = 'generationLogs';

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is not available on the server'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('generationLogs')) {
        const store = db.createObjectStore('generationLogs', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('attemptNumber', 'attemptNumber', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function withTransaction<T>(
  storeName: ObjectStoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then(result => {
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
      .catch(reject);
  });
}

export async function getAll<T = unknown>(storeName: ObjectStoreName): Promise<T[]> {
  return withTransaction(storeName, 'readonly', (store) => {
    return new Promise<T[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getByIndex<T = unknown>(
  storeName: ObjectStoreName,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  return withTransaction(storeName, 'readonly', (store) => {
    return new Promise<T[]>((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.getAll(query);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  });
}

export async function put<T = unknown>(storeName: ObjectStoreName, value: T): Promise<void> {
  return withTransaction(storeName, 'readwrite', (store) => {
    store.put(value as any);
  });
}

export async function putMany<T = unknown>(storeName: ObjectStoreName, values: T[]): Promise<void> {
  return withTransaction(storeName, 'readwrite', async (store) => {
    for (const value of values) {
      store.put(value as any);
    }
  });
}

export async function clearStore(storeName: ObjectStoreName): Promise<void> {
  return withTransaction(storeName, 'readwrite', (store) => {
    store.clear();
  });
}

export async function deleteByIndex(
  storeName: ObjectStoreName,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<void> {
  return withTransaction(storeName, 'readwrite', async (store) => {
    const index = store.index(indexName);
    const cursorRequest = index.openCursor(query);
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result as IDBCursorWithValue | null;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  });
}



