const DB_NAME = "larpking";
const STORE_NAME = "pending_larp";
const DB_VERSION = 1;
const EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export type PendingLarpGenerationMode = "image" | "video";

export interface PendingLarp {
  prompt: string;
  videoPrompt?: string | null;
  images: File[];
  generationMode?: PendingLarpGenerationMode;
  templateId?: string | null;
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

/** Shrink photos before IndexedDB — large HEIC/JPEG from phones often fail on Safari. */
async function compressImageForIdb(file: File, maxEdge = 1280): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(maxEdge / bitmap.width, maxEdge / bitmap.height, 1);
    if (scale >= 1 && file.size < 1_200_000) {
      bitmap.close();
      return file;
    }
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg") || "photo.jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

export async function savePendingLarp(data: PendingLarp): Promise<void> {
  try {
    const compressed = await Promise.all(
      data.images.map((f) => compressImageForIdb(f)),
    );
    const imageBuffers = await Promise.all(
      compressed.map(async (f) => ({
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
      videoPrompt: data.videoPrompt ?? null,
      images: imageBuffers,
      generationMode: data.generationMode ?? "image",
      templateId: data.templateId ?? null,
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

export async function getPendingLarp(): Promise<PendingLarp | null> {
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
          clearPendingLarp();
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
          videoPrompt:
            typeof rawData.videoPrompt === "string"
              ? rawData.videoPrompt
              : null,
          images: restoredImages,
          generationMode: rawData.generationMode === "video" ? "video" : "image",
          templateId:
            typeof rawData.templateId === "string" ? rawData.templateId : null,
          timestamp: rawData.timestamp,
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearPendingLarp(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete("current");
  } catch {
    // silent fail
  }
}
