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
  engineUsed: "puter" | "standalone-rag";
}

interface ResumeDB extends DBSchema {
  resumes: {
    key: string;
    value: ResumeRecord;
  };
}

const DB_NAME = "resumind_standalone_db";
const DB_VERSION = 1;

async function getDB() {
  if (typeof window === "undefined") return null;
  return openDB<ResumeDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("resumes")) {
        db.createObjectStore("resumes", { keyPath: "id" });
      }
    },
  });
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
}

export const resumeStorage = {
  async saveResume(
    record: ResumeRecord,
    puterStore: any,
    usePuter: boolean = false
  ): Promise<void> {
    if (usePuter && puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      await puterStore.kv.set(`resume:${record.id}`, JSON.stringify(record));
      return;
    }

    // Local IndexedDB fallback
    const db = await getDB();
    if (db) {
      await db.put("resumes", record);
    } else {
      localStorage.setItem(`resume:${record.id}`, JSON.stringify(record));
    }
  },

  async getResume(
    id: string,
    puterStore: any
  ): Promise<{ data: ResumeRecord; pdfUrl: string; imageUrl: string } | null> {
    let record: ResumeRecord | null = null;
    let pdfUrl = "";
    let imageUrl = "";

    // 1. Try Puter KV first if puter store is authenticated
    if (puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      try {
        const raw = await puterStore.kv.get(`resume:${id}`);
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

    // 2. Fallback to IndexedDB / LocalStorage if not found on Puter
    if (!record) {
      const db = await getDB();
      if (db) {
        record = (await db.get("resumes", id)) || null;
      }
      if (!record) {
        const localRaw = localStorage.getItem(`resume:${id}`);
        if (localRaw) {
          record = JSON.parse(localRaw);
        }
      }

      if (record) {
        if (record.resumeDataUrl) {
          const pdfBlob = dataUrlToBlob(record.resumeDataUrl);
          pdfUrl = URL.createObjectURL(pdfBlob);
        }
        if (record.imageDataUrl) {
          imageUrl = record.imageDataUrl;
        }
      }
    }

    if (!record) return null;

    return {
      data: record,
      pdfUrl,
      imageUrl,
    };
  },

  async listResumes(puterStore: any): Promise<ResumeRecord[]> {
    const list: ResumeRecord[] = [];

    // 1. Check Puter KV if authenticated
    if (puterStore?.auth?.isAuthenticated && puterStore?.kv) {
      try {
        const keys = await puterStore.kv.list("resume:*");
        if (Array.isArray(keys)) {
          for (const key of keys) {
            const keyStr = typeof key === "string" ? key : (key as any).name;
            if (!keyStr) continue;
            const raw = await puterStore.kv.get(keyStr);
            if (raw) {
              try {
                list.push(JSON.parse(raw));
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
          if (!list.some((r) => r.id === item.id)) {
            list.push(item);
          }
        }
      }
    } catch (e) {}

    // Sort by newest first
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  async deleteResume(id: string, puterStore: any): Promise<void> {
    if (puterStore?.kv) {
      try {
        await puterStore.kv.delete(`resume:${id}`);
      } catch (e) {}
    }
    const db = await getDB();
    if (db) {
      await db.delete("resumes", id);
    }
    localStorage.removeItem(`resume:${id}`);
  },
};
