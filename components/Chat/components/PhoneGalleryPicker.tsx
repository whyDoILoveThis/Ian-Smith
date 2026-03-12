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

async function addPhotoBlob(blob: Blob, name: string): Promise<StoredPhoto> {
  const thumb = await createThumbnail(blob, 200);
  const item: StoredPhoto = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blob,
    thumbBlob: thumb,
    name,
    addedAt: Date.now(),
  };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => {
      db.close();
      resolve(item);
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

function createThumbnail(blob: Blob, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
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
      canvas.toBlob((b) => resolve(b || blob), "image/jpeg", 0.7);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

// ── Camera Capture sub-component ─────────────────────────────────────
function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch {
      setError("Camera access denied. Check your browser permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFlip = useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleSnap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9,
    );
  }, [onCapture]);

  return (
    <div className="fixed inset-0 z-[210] bg-black flex flex-col">
      {error ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="flex-1 object-cover"
        />
      )}
      <div className="flex items-center justify-center gap-8 py-6 bg-black/80">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={handleSnap}
          disabled={!!error}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:bg-white/40 transition disabled:opacity-30"
        />
        <button
          type="button"
          onClick={handleFlip}
          disabled={!!error}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Main PhoneGalleryPicker component ────────────────────────────────
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
  const [showCamera, setShowCamera] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const singleFileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // Add a blob to the library + UI state
  const addToLibrary = useCallback(
    async (blob: Blob, name: string) => {
      setIsImporting(true);
      try {
        const item = await addPhotoBlob(blob, name);
        setPhotos((prev) => [item, ...prev]);
        const url = URL.createObjectURL(item.thumbBlob);
        setThumbUrls((prev) => {
          const next = new Map(prev);
          next.set(item.id, url);
          return next;
        });
        showToast("Photo added!");
      } catch {
        showToast("Failed to save photo");
      } finally {
        setIsImporting(false);
      }
    },
    [showToast],
  );

  // Load photos from IndexedDB
  const loadPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await getAllPhotos();
      setPhotos(all);
      const urls = new Map<string, string>();
      for (const p of all) {
        urls.set(p.id, URL.createObjectURL(p.thumbBlob));
      }
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
      setThumbUrls((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return new Map();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single file import (one photo at a time — much less likely to crash)
  const handleSingleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        e.target.value = "";
        return;
      }
      await addToLibrary(file, file.name);
      e.target.value = "";
    },
    [addToLibrary],
  );

  // Camera capture
  const handleCameraCapture = useCallback(
    async (blob: Blob) => {
      setShowCamera(false);
      await addToLibrary(blob, `camera-${Date.now()}.jpg`);
    },
    [addToLibrary],
  );

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          await addToLibrary(blob, `pasted-${Date.now()}.png`);
          return;
        }
      }
      showToast("No image found in clipboard");
    } catch {
      showToast("Clipboard access denied");
    }
  }, [addToLibrary, showToast]);

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
    <>
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
                {deleteMode ? "Done" : "Manage"}
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

        {/* Add photos toolbar */}
        <div className="px-3 py-2.5 border-b border-white/5 flex gap-2">
          {/* Hidden single-file input */}
          <input
            ref={singleFileRef}
            type="file"
            accept="image/*"
            onChange={handleSingleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => singleFileRef.current?.click()}
            disabled={isImporting}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-40"
          >
            <svg
              className="w-3.5 h-3.5"
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
            Add Photo
          </button>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            disabled={isImporting}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-40"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Camera
          </button>
          <button
            type="button"
            onClick={handlePaste}
            disabled={isImporting}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-40"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Paste
          </button>
        </div>

        {/* Importing spinner */}
        {isImporting && (
          <div className="px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-white/60">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving…
          </div>
        )}

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
              <p className="text-xs text-center px-8">
                Add photos with the buttons above — they&apos;re saved here so
                you can pick from them anytime without reopening your gallery
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

        {/* Toast */}
        {toastMsg && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full bg-white/10 backdrop-blur-md px-4 py-2 text-xs text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toastMsg}
          </div>
        )}
      </div>

      {/* Camera overlay */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
