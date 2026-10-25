import { openDB, type DBSchema } from "idb";

export interface ResumeRecord {
  id: string;
  resumePath?: string;
  imagePath?: string;
  resumeDataUrl?: string;
  imageDataUrl?: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  feedback: any;
  createdAt: number;
  engineUsed: "puter" | "standalone" | "standalone-rag";
}

interface ResumeDB extends DBSchema {
  resumes: {
    key: string;
    value: ResumeRecord;
  };
}

const DB_NAME = "resumind_standalone_db";
const DB_VERSION = 1;
const STORAGE_PREFIX = "resume:";
const INDEX_KEY = "resumind_resume_ids";
const LATEST_KEY = "resumind_latest_id";
const SESSION_KEY = "resumind_session_latest";

async function getDB() {
  if (typeof window === "undefined") return null;
  try {
    return await openDB<ResumeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("resumes")) {
          db.createObjectStore("resumes", { keyPath: "id" });
        }
      },
    });
  } catch (err) {
    console.warn("IndexedDB initialization failed, falling back to LocalStorage:", err);
    return null;
  }
}

// Convert Blob/File to Data URL for IndexedDB storage
export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert Data URL back to Blob
export function dataUrlToBlob(dataUrl: string): Blob {
  try {
    const arr = dataUrl.split(",");
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn("Failed to convert dataUrl to Blob:", e);
    return new Blob([], { type: "application/octet-stream" });
  }
}

function updateLocalStorageIndex(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.unshift(id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(list));
    }
    localStorage.setItem(LATEST_KEY, id);
  } catch (e) {
    console.warn("Could not update localStorage resume index:", e);
  }
}

function removeFromLocalStorageIndex(id: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) {
      const list: string[] = JSON.parse(raw);
      const filtered = list.filter((item) => item !== id);
      localStorage.setItem(INDEX_KEY, JSON.stringify(filtered));
    }
    if (localStorage.getItem(LATEST_KEY) === id) {
      localStorage.removeItem(LATEST_KEY);
    }
  } catch (e) {}
}

export const resumeStorage = {
  async saveResume(
    record: ResumeRecord,
    puterStore: any,
    usePuter: boolean = false
  ): Promise<void> {
    if (typeof window === "undefined") return;

    // 1. If using Puter and authenticated, persist to Puter KV
    if (usePuter && puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      try {
        await puterStore.kv.set(`${STORAGE_PREFIX}${record.id}`, JSON.stringify(record));
      } catch (err) {
        console.warn("Failed to save resume to Puter KV:", err);
      }
    }

    // 2. Always persist full record to IndexedDB (supports large PDFs and high-res images)
    try {
      const db = await getDB();
      if (db) {
        await db.put("resumes", record);
      }
    } catch (dbErr) {
      console.warn("Failed to write to IndexedDB:", dbErr);
    }

    // 3. Save copy to LocalStorage & SessionStorage for instant refresh resilience
    try {
      // Create a storage-safe copy without extremely huge base64 blobs if quota is tight
      let serialized = JSON.stringify(record);
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${record.id}`, serialized);
      } catch (quotaErr) {
        // If quota exceeded, strip raw PDF dataUrl from localStorage but keep thumbnail & full analysis
        const compactRecord = {
          ...record,
          resumeDataUrl: undefined,
        };
        localStorage.setItem(`${STORAGE_PREFIX}${record.id}`, JSON.stringify(compactRecord));
      }

      updateLocalStorageIndex(record.id);

      // SessionStorage for active tab refresh preservation
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
      } catch (e) {}
    } catch (err) {
      console.warn("Failed to save resume in LocalStorage:", err);
    }
  },

  async getResume(
    id: string,
    puterStore: any
  ): Promise<{ data: ResumeRecord; pdfUrl: string; imageUrl: string } | null> {
    if (typeof window === "undefined") return null;

    let record: ResumeRecord | null = null;
    let pdfUrl = "";
    let imageUrl = "";

    // 1. Try Puter KV if puter store is authenticated
    if (puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      try {
        const raw = await puterStore.kv.get(`${STORAGE_PREFIX}${id}`);
        if (raw) {
          record = JSON.parse(raw);
          if (record?.resumePath && puterStore?.fs) {
            const resumeBlob = await puterStore.fs.read(record.resumePath);
            if (resumeBlob) {
              const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
              pdfUrl = URL.createObjectURL(pdfBlob);
            }
          }
          if (record?.imagePath && puterStore?.fs) {
            const imageBlob = await puterStore.fs.read(record.imagePath);
            if (imageBlob) {
              imageUrl = URL.createObjectURL(imageBlob);
            }
          }
        }
      } catch (e) {
        console.warn("Puter KV get failed, falling back to local DB:", e);
      }
    }

    // 2. Try IndexedDB
    if (!record) {
      try {
        const db = await getDB();
        if (db) {
          record = (await db.get("resumes", id)) || null;
        }
      } catch (e) {
        console.warn("IndexedDB read failed:", e);
      }
    }

    // 3. Fallback to LocalStorage
    if (!record) {
      try {
        const localRaw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
        if (localRaw) {
          record = JSON.parse(localRaw);
        }
      } catch (e) {}
    }

    // 4. Fallback to SessionStorage
    if (!record) {
      try {
        const sessionRaw = sessionStorage.getItem(SESSION_KEY);
        if (sessionRaw) {
          const sessionRecord = JSON.parse(sessionRaw);
          if (sessionRecord?.id === id) {
            record = sessionRecord;
          }
        }
      } catch (e) {}
    }

    if (!record) return null;

    // Resolve URLs
    if (record.resumeDataUrl && !pdfUrl) {
      try {
        const pdfBlob = dataUrlToBlob(record.resumeDataUrl);
        pdfUrl = URL.createObjectURL(pdfBlob);
      } catch (e) {}
    }

    if (record.imageDataUrl && !imageUrl) {
      imageUrl = record.imageDataUrl;
    }

    return {
      data: record,
      pdfUrl,
      imageUrl,
    };
  },

  async listResumes(puterStore: any): Promise<ResumeRecord[]> {
    if (typeof window === "undefined") return [];

    const list: ResumeRecord[] = [];
    const seenIds = new Set<string>();

    const addRecord = (item: any) => {
      if (!item || !item.id || seenIds.has(item.id)) return;
      seenIds.add(item.id);
      list.push(item);
    };

    // 1. Check Puter KV if authenticated
    if (puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      try {
        const keys = await puterStore.kv.list(`${STORAGE_PREFIX}*`);
        if (Array.isArray(keys)) {
          for (const key of keys) {
            const keyStr = typeof key === "string" ? key : (key as any).name;
            if (!keyStr) continue;
            const raw = await puterStore.kv.get(keyStr);
            if (raw) {
              try {
                addRecord(JSON.parse(raw));
              } catch (e) {}
            }
          }
        }
      } catch (e) {
        console.warn("Failed to list Puter KV resumes:", e);
      }
    }

    // 2. Check IndexedDB
    try {
      const db = await getDB();
      if (db) {
        const localItems = await db.getAll("resumes");
        for (const item of localItems) {
          addRecord(item);
        }
      }
    } catch (e) {
      console.warn("Error reading resumes from IndexedDB:", e);
    }

    // 3. Check LocalStorage (both index list and individual resume: keys)
    try {
      // Check indexed keys
      const indexRaw = localStorage.getItem(INDEX_KEY);
      if (indexRaw) {
        const ids: string[] = JSON.parse(indexRaw);
        for (const id of ids) {
          if (!seenIds.has(id)) {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
            if (raw) {
              try {
                addRecord(JSON.parse(raw));
              } catch (e) {}
            }
          }
        }
      }

      // Check all localStorage keys starting with resume:
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              addRecord(JSON.parse(raw));
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn("Error reading resumes from LocalStorage:", e);
    }

    // 4. Check SessionStorage
    try {
      const sessionRaw = sessionStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        addRecord(JSON.parse(sessionRaw));
      }
    } catch (e) {}

    // Sort by newest first
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async deleteResume(id: string, puterStore: any): Promise<void> {
    if (typeof window === "undefined") return;

    if (puterStore?.kv) {
      try {
        await puterStore.kv.delete(`${STORAGE_PREFIX}${id}`);
      } catch (e) {}
    }

    try {
      const db = await getDB();
      if (db) {
        await db.delete("resumes", id);
      }
    } catch (e) {}

    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
      removeFromLocalStorageIndex(id);
    } catch (e) {}

    try {
      const sessionRaw = sessionStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (parsed?.id === id) {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (e) {}
  },
};
