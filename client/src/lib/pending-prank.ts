const DB_NAME = "turboprank";
const STORE_NAME = "pending_prank";
const DB_VERSION = 1;
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface PendingPrank {
  prompt: string;
  images: File[];
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingPrank(data: PendingPrank): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(data, "current");
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingPrank(): Promise<PendingPrank | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("current");
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result as PendingPrank | undefined;
        if (!data) return resolve(null);
        if (Date.now() - data.timestamp > EXPIRY_MS) {
          clearPendingPrank();
          return resolve(null);
        }
        resolve(data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearPendingPrank(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete("current");
  } catch {
    // silent fail
  }
}
