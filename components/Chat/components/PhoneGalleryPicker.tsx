"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// ── IndexedDB helpers ────────────────────────────────────────────────
const DB_NAME = "chatPhotoLibrary";
const DB_VERSION = 1;
const STORE_NAME = "photos";

type StoredPhoto = {
  id: string;
  blob: Blob;
  thumbBlob: Blob;
  name: string;
  addedAt: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("addedAt", "addedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllPhotos(): Promise<StoredPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const idx = store.index("addedAt");
    const req = idx.getAll();
    req.onsuccess = () => resolve((req.result as StoredPhoto[]).reverse());
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function addPhotos(files: File[]): Promise<StoredPhoto[]> {
  const db = await openDB();
  const items: StoredPhoto[] = [];
  for (const file of files) {
    const thumb = await createThumbnail(file, 200);
    const item: StoredPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      blob: file,
      thumbBlob: thumb,
      name: file.name,
      addedAt: Date.now(),
    };
    items.push(item);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) store.put(item);
    tx.oncomplete = () => {
      db.close();
      resolve(items);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function deletePhotos(ids: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function createThumbnail(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxSize) {
          h = (h * maxSize) / w;
          w = maxSize;
        }
      } else {
        if (h > maxSize) {
          w = (w * maxSize) / h;
          h = maxSize;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.7);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// ── Component ────────────────────────────────────────────────────────
type PhoneGalleryPickerProps = {
  onSelect: (file: File) => void;
  onClose: () => void;
};

export function PhoneGalleryPicker({
  onSelect,
  onClose,
}: PhoneGalleryPickerProps) {
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteIds, setDeleteIds] = useState<Set<string>>(new Set());
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load photos from IndexedDB
  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getAllPhotos();
      setPhotos(all);
      // Create thumbnail URLs
      const urls = new Map<string, string>();
      for (const p of all) {
        urls.set(p.id, URL.createObjectURL(p.thumbBlob));
      }
      // Revoke old URLs
      setThumbUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return urls;
      });
    } catch {
      // DB error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPhotos();
    return () => {
      // Cleanup URLs on unmount
      setThumbUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return new Map();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Import from device
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      setIsImporting(true);
      try {
        const imageFiles = Array.from(fileList).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (imageFiles.length > 0) {
          const newItems = await addPhotos(imageFiles);
          setPhotos((prev) => [...newItems.reverse(), ...prev]);
          const urls = new Map(thumbUrls);
          for (const item of newItems) {
            urls.set(item.id, URL.createObjectURL(item.thumbBlob));
          }
          setThumbUrls(urls);
        }
      } catch {
        // import error
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    },
    [thumbUrls],
  );

  // Select and send
  const handleConfirmSelect = useCallback(() => {
    if (!selectedId) return;
    const photo = photos.find((p) => p.id === selectedId);
    if (!photo) return;
    const file = new File([photo.blob], photo.name || "photo.jpg", {
      type: photo.blob.type || "image/jpeg",
    });
    onSelect(file);
  }, [selectedId, photos, onSelect]);

  // Delete selected photos
  const handleDeleteSelected = useCallback(async () => {
    if (deleteIds.size === 0) return;
    const idsArr = Array.from(deleteIds);
    await deletePhotos(idsArr);
    setPhotos((prev) => prev.filter((p) => !deleteIds.has(p.id)));
    setThumbUrls((prev) => {
      const next = new Map(prev);
      for (const id of idsArr) {
        const url = next.get(id);
        if (url) URL.revokeObjectURL(url);
        next.delete(id);
      }
      return next;
    });
    setDeleteIds(new Set());
    setDeleteMode(false);
  }, [deleteIds]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-neutral-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <h2 className="text-sm font-semibold text-white">Photo Library</h2>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDeleteMode((prev) => !prev);
                setDeleteIds(new Set());
                setSelectedId(null);
              }}
              className={`text-xs px-2 py-1 rounded-lg transition ${
                deleteMode
                  ? "bg-red-500/20 text-red-400"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {deleteMode ? "Cancel" : "Manage"}
            </button>
          )}
          {deleteMode && deleteIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="text-xs px-2 py-1 rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition"
            >
              Delete ({deleteIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Import button bar */}
      <div className="px-4 py-2.5 border-b border-white/5">
        <input
          ref={importInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImport}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:border-white/30 transition disabled:opacity-50"
        >
          {isImporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Importing…
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Import Photos from Device
            </>
          )}
        </button>
        <p className="mt-1.5 text-[10px] text-neutral-500 text-center">
          Import photos once, then pick from here anytime
        </p>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-1 py-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3 text-neutral-500">
            <svg
              className="w-12 h-12 opacity-40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">No photos yet</p>
            <p className="text-xs">
              Tap &quot;Import Photos&quot; to add from your device
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {photos.map((photo) => {
              const thumbUrl = thumbUrls.get(photo.id);
              const isSelected = deleteMode
                ? deleteIds.has(photo.id)
                : selectedId === photo.id;
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    if (deleteMode) {
                      setDeleteIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(photo.id)) next.delete(photo.id);
                        else next.add(photo.id);
                        return next;
                      });
                    } else {
                      setSelectedId((prev) =>
                        prev === photo.id ? null : photo.id,
                      );
                    }
                  }}
                  className={`relative aspect-square overflow-hidden transition-all ${
                    isSelected
                      ? deleteMode
                        ? "ring-2 ring-red-500 ring-inset opacity-80"
                        : "ring-2 ring-emerald-400 ring-inset"
                      : "hover:opacity-80"
                  }`}
                >
                  {thumbUrl && (
                    <img
                      src={thumbUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {isSelected && (
                    <div
                      className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] ${
                        deleteMode ? "bg-red-500" : "bg-emerald-500"
                      }`}
                    >
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {!deleteMode && selectedId && (
        <div className="px-4 py-3 border-t border-white/10 safe-area-inset-bottom">
          <button
            type="button"
            onClick={handleConfirmSelect}
            className="w-full rounded-xl bg-emerald-500/80 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-[0.98]"
          >
            Send Photo
          </button>
        </div>
      )}
    </div>
  );
}
