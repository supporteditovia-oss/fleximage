const DB_NAME = "larpking";
const STORE_NAME = "pending_prank";
const DB_VERSION = 1;
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export type PendingPrankGenerationMode = "image" | "video";

export interface PendingPrank {
  prompt: string;
  images: File[];
  generationMode?: PendingPrankGenerationMode;
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
  try {
    const imageBuffers = await Promise.all(
      data.images.map(async (f) => ({
        name: f.name,
        type: f.type,
        buffer: await f.arrayBuffer(),
      }))
    );
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({
      prompt: data.prompt,
      images: imageBuffers,
      generationMode: data.generationMode ?? "image",
      timestamp: data.timestamp,
    }, "current");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("IDB save error:", err);
    throw err;
  }
}

export async function getPendingPrank(): Promise<PendingPrank | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get("current");
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const rawData = request.result as any;
        if (!rawData) return resolve(null);
        if (Date.now() - rawData.timestamp > EXPIRY_MS) {
          clearPendingPrank();
          return resolve(null);
        }
        
        let restoredImages: File[] = [];
        if (rawData.images) {
          restoredImages = rawData.images.map((item: any) => {
            if (item instanceof File) return item;
            if (item.buffer) {
              return new File([item.buffer], item.name, { type: item.type });
            }
            return item;
          });
        }
        
        resolve({
          prompt: rawData.prompt,
          images: restoredImages,
          generationMode: rawData.generationMode === "video" ? "video" : "image",
          timestamp: rawData.timestamp,
        });
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
