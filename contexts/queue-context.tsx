"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { Job, QueueItem, QueueNotification, SplitMode, OutputFormat, StemDownload } from "@/lib/types";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface QueueConfig {
  mode: SplitMode;
  outputFormat: OutputFormat;
  overlap?: number;
  title?: string;
}

interface QueueContextValue {
  items: QueueItem[];
  activeItemId: string | null;
  notifications: QueueNotification[];
  unreadCount: number;
  displayProgress: number;

  enqueue: (files: File[], config: QueueConfig) => void;
  enqueueUrl: (url: string, config: QueueConfig) => void;
  removeFromQueue: (itemId: string) => void;
  retry: (itemId: string) => void;
  clearCompleted: () => void;
  markAllRead: () => void;
  setCurrentWorkspace: (workspaceId: string) => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "ws-1";
    return localStorage.getItem("44stems-active-workspace") || "ws-1";
  });
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;

  const setCurrentWorkspace = useCallback((id: string) => {
    setWorkspaceIdState(id);
    // Clear completed/failed items when switching workspaces; keep active processing
    setItems(prev => prev.filter(i => i.status === "processing" || i.status === "uploading"));
  }, []);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<QueueNotification[]>([]);
  const [displayProgress, setDisplayProgress] = useState(0);

  const processingLockRef = useRef(false);
  const progressTargetRef = useRef(0);
  const progressDisplayRef = useRef(0);
  const progressRafRef = useRef(0);
  const progressLastTickRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const unreadCount = notifications.filter(n => !n.read).length;

  // ─── Persist active jobs to localStorage ────────────────────────────────

  const STORAGE_KEY = "44stems-active-jobs";

  // ─── Restore active jobs on mount (MUST run before persistence effect) ──

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    localStorage.removeItem(STORAGE_KEY);

    let saved: { jobId: string | null; fileName: string; mode: string; addedAt: number; status?: string; url?: string | null }[];
    try { saved = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(saved) || saved.length === 0) return;

    // Split into items with jobId (need API query) and pending items (restore directly)
    const withJobId = saved.filter(s => s.jobId);
    const pending = saved.filter(s => !s.jobId || s.status === "pending");

    const wsId = workspaceIdRef.current;
    Promise.allSettled(
      withJobId.map(s =>
        fetch(`/api/jobs/${s.jobId}`, { headers: { "x-workspace-id": wsId } })
          .then(r => r.ok ? r.json() : null)
          .then(job => ({ ...s, job }))
      )
    ).then(results => {
      const restored: QueueItem[] = [];

      // Restore items that have a jobId (processing/completed/failed)
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value.job) continue;
        const { jobId, fileName, mode, addedAt, job } = r.value;
        const status = job.status === "completed" ? "completed" as const
          : job.status === "failed" ? "failed" as const
          : "processing" as const;
        restored.push({
          id: nanoid(8),
          file: null,
          fileName,
          fileSize: 0,
          jobId,
          status,
          progress: job.progress ?? 0,
          stage: job.stage ?? "",
          error: job.error ?? null,
          mode: mode as QueueConfig["mode"],
          outputFormat: "wav",
          job: status === "completed" ? job : null,
          stemDownloads: [],
          addedAt,
          completedAt: status === "completed" ? Date.now() : null,
        });
      }

      // Restore pending items (waiting in queue, not yet sent to worker)
      for (const p of pending) {
        const hasUrl = !!p.url;
        restored.push({
          id: nanoid(8),
          file: null,
          url: p.url ?? undefined,
          fileName: p.fileName,
          fileSize: 0,
          jobId: null,
          // URL items can be reprocessed; file items can't (File object is lost on refresh)
          status: hasUrl ? "pending" as const : "failed" as const,
          progress: 0,
          stage: "",
          error: hasUrl ? null : "File lost after page refresh — please re-add",
          mode: (p.mode || "4stem") as QueueConfig["mode"],
          outputFormat: "wav",
          job: null,
          stemDownloads: [],
          addedAt: p.addedAt,
          completedAt: null,
        });
      }

      if (restored.length > 0) {
        setItems(prev => {
          const existingJobIds = new Set(prev.map(i => i.jobId).filter(Boolean));
          const deduped = restored.filter(i => !i.jobId || !existingJobIds.has(i.jobId));
          return [...prev, ...deduped];
        });
        // Pick up the first processing item to resume polling
        const next = restored.find(i => i.status === "processing");
        if (next && !processingLockRef.current) {
          progressTargetRef.current = next.progress;
          progressDisplayRef.current = next.progress;
          setDisplayProgress(next.progress);
          setActiveItemId(next.id);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Persist active jobs to localStorage ────────────────────────────────
  // MUST be declared AFTER restore effect so it doesn't clear localStorage before restore runs

  const lastPersistedRef = useRef("");
  useEffect(() => {
    if (!restoredRef.current) return; // don't persist until restore has run
    const active = items
      .filter(i => i.status === "processing" || i.status === "uploading" || i.status === "pending")
      .map(i => ({ jobId: i.jobId, fileName: i.fileName, mode: i.mode, addedAt: i.addedAt, status: i.status, url: i.url ?? null }));
    const serialized = JSON.stringify(active);
    if (serialized === lastPersistedRef.current) return;
    lastPersistedRef.current = serialized;
    if (active.length > 0) {
      localStorage.setItem(STORAGE_KEY, serialized);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [items]);

  // ─── Helpers ────────────────────────────────────────────────────────────

  const updateItem = useCallback((id: string, updates: Partial<QueueItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  // ─── Enqueue ────────────────────────────────────────────────────────────

  const enqueue = useCallback((files: File[], config: QueueConfig) => {
    const newItems: QueueItem[] = files.map(f => ({
      id: nanoid(8),
      file: f,
      fileName: f.name,
      fileSize: f.size,
      jobId: null,
      status: "pending" as const,
      progress: 0,
      stage: "",
      error: null,
      mode: config.mode,
      outputFormat: config.outputFormat,
      overlap: config.overlap,
      job: null,
      stemDownloads: [],
      addedAt: Date.now(),
      completedAt: null,
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const enqueueUrl = useCallback((url: string, config: QueueConfig) => {
    const item: QueueItem = {
      id: nanoid(8),
      file: null,
      url,
      fileName: config.title || url,
      fileSize: 0,
      jobId: null,
      status: "pending",
      progress: 0,
      stage: "",
      error: null,
      mode: config.mode,
      outputFormat: config.outputFormat,
      overlap: config.overlap,
      job: null,
      stemDownloads: [],
      addedAt: Date.now(),
      completedAt: null,
    };
    setItems(prev => [...prev, item]);
  }, []);

  const removeFromQueue = useCallback((itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId || i.status !== "pending"));
  }, []);

  const retry = useCallback((itemId: string) => {
    setItems(prev => prev.map(item =>
      item.id === itemId && item.status === "failed"
        ? { ...item, status: "pending" as const, progress: 0, stage: "", error: null, jobId: null, job: null, stemDownloads: [] }
        : item
    ));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(i => i.status !== "completed"));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // ─── Process a single item (upload + trigger Modal) ─────────────────────

  const processItem = useCallback(async (item: QueueItem) => {
    const overlap = item.overlap ?? 8;

    try {
      const wsId = workspaceIdRef.current;
      if (item.url && !item.file) {
        // URL mode
        updateItem(item.id, { status: "uploading", stage: "Downloading audio..." });
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-workspace-id": wsId },
          body: JSON.stringify({ url: item.url, mode: item.mode, overlap, workspaceId: wsId, title: item.fileName }),
        });
        if (!res.ok) {
          let msg = "Upload failed";
          try { const d = await res.json(); msg = d.error || msg; } catch { /* */ }
          throw new Error(msg);
        }
        const { jobId } = await res.json();
        updateItem(item.id, { jobId, status: "processing", stage: "Processing..." });
      } else if (item.file) {
        // File mode: presigned upload
        updateItem(item.id, { status: "uploading", stage: "Uploading..." });

        // Step 1: get presigned URL
        const initRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-workspace-id": wsId },
          body: JSON.stringify({
            filename: item.file.name,
            size: item.file.size,
            contentType: item.file.type || "audio/mpeg",
            mode: item.mode,
            overlap,
            workspaceId: wsId,
          }),
        });
        if (!initRes.ok) {
          let msg = "Upload failed";
          try { const d = await initRes.json(); msg = d.error || msg; } catch { /* */ }
          throw new Error(msg);
        }
        const { jobId, uploadUrl } = await initRes.json();
        updateItem(item.id, { jobId });

        // Step 2: upload directly to R2
        const file = item.file;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const p = Math.round((e.loaded / e.total) * 20);
              updateItem(item.id, { progress: p });
              progressTargetRef.current = p;
            }
          });
          xhr.addEventListener("load", () => {
            xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload error (${xhr.status})`));
          });
          xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
          xhr.send(file);
        });

        // Step 3: confirm and trigger Modal
        const confirmRes = await fetch("/api/upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-workspace-id": wsId },
          body: JSON.stringify({ jobId }),
        });
        if (!confirmRes.ok) {
          let msg = "Failed to start processing";
          try { const d = await confirmRes.json(); msg = d.error || msg; } catch { /* */ }
          throw new Error(msg);
        }

        progressTargetRef.current = 22;
        updateItem(item.id, { status: "processing", progress: 22, stage: "Sending to GPU..." });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      updateItem(item.id, { status: "failed", error: msg, stage: "" });
      processingLockRef.current = false;
      setActiveItemId(null);
    }
  }, [updateItem]);

  // ─── Pick next pending item ─────────────────────────────────────────────

  useEffect(() => {
    if (processingLockRef.current) return;
    if (activeItemId) return;

    const next = items.find(i => i.status === "pending");
    if (!next) return;

    processingLockRef.current = true;
    setActiveItemId(next.id);
    progressTargetRef.current = 0;
    progressDisplayRef.current = 0;
    setDisplayProgress(0);

    processItem(next).then(() => {
      processingLockRef.current = false;
    });
  }, [items, activeItemId, processItem]);

  // ─── Poll active job ────────────────────────────────────────────────────

  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!activeItemId) return;

    const activeItem = items.find(i => i.id === activeItemId);
    if (!activeItem?.jobId || activeItem.status !== "processing") return;

    const jobId = activeItem.jobId;
    const itemId = activeItem.id;

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          headers: { "x-workspace-id": workspaceIdRef.current },
        });
        if (!res.ok) return;
        const job: Job = await res.json();

        const mapped = job.status === "completed" ? 100 : Math.round(22 + (job.progress / 100) * 78);
        if (mapped > progressTargetRef.current) progressTargetRef.current = mapped;

        updateItem(itemId, {
          job,
          progress: mapped,
          stage: job.stage || "",
        });

        if (job.status === "completed") {
          if (pollingRef.current) clearInterval(pollingRef.current);

          // Fetch stem download URLs
          let stemDownloads: StemDownload[] = [];
          try {
            const dlRes = await fetch(`/api/download/${jobId}`, {
              headers: { "x-workspace-id": workspaceIdRef.current },
            });
            if (dlRes.ok) {
              const dlData = await dlRes.json();
              stemDownloads = dlData.stems || [];
            }
          } catch { /* */ }

          updateItem(itemId, {
            status: "completed",
            progress: 100,
            stemDownloads,
            completedAt: Date.now(),
          });

          // Toast notification
          toast.success(activeItem.fileName, {
            description: `${job.stems?.length || 0} stems ready`,
          });

          // Push notification
          setNotifications(prev => [{
            id: nanoid(8),
            queueItemId: itemId,
            fileName: activeItem.fileName,
            stemCount: job.stems?.length || 0,
            completedAt: Date.now(),
            read: false,
          }, ...prev]);

          // Refresh usage minutes (triggers useSubscription re-fetch)
          window.dispatchEvent(new Event("usage-updated"));

          // Refresh history (triggers page.tsx to re-fetch My Files)
          window.dispatchEvent(new Event("history-updated"));

          setActiveItemId(null);
        } else if (job.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);

          updateItem(itemId, {
            status: "failed",
            error: job.error || "Processing failed",
            stage: "",
          });

          setActiveItemId(null);
        }
      } catch { /* polling error — will retry */ }
    };

    poll();
    pollingRef.current = setInterval(poll, 1000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItemId, items.find(i => i.id === activeItemId)?.jobId, items.find(i => i.id === activeItemId)?.status]);

  // ─── rAF progress animation ────────────────────────────────────────────

  useEffect(() => {
    const tick = (now: number) => {
      const elapsed = progressLastTickRef.current ? now - progressLastTickRef.current : 16;
      progressLastTickRef.current = now;
      const target = progressTargetRef.current;
      const current = progressDisplayRef.current;

      if (current < target) {
        const speed = Math.max(15, (target - current) * 3);
        const step = Math.min((elapsed / 1000) * speed, target - current);
        progressDisplayRef.current = current + step;
      } else if (target > 0 && target < 100) {
        const trickleMax = Math.min(target + 4, 98);
        if (current < trickleMax) {
          progressDisplayRef.current = Math.min(current + (elapsed / 1000) * 0.5, trickleMax);
        }
      }

      setDisplayProgress(progressDisplayRef.current);
      progressRafRef.current = requestAnimationFrame(tick);
    };
    progressRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(progressRafRef.current);
  }, []);

  // ─── Context value ──────────────────────────────────────────────────────

  const value: QueueContextValue = {
    items,
    activeItemId,
    notifications,
    unreadCount,
    displayProgress,
    enqueue,
    enqueueUrl,
    removeFromQueue,
    retry,
    clearCompleted,
    markAllRead,
    setCurrentWorkspace,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error("useQueue must be used within QueueProvider");
  return ctx;
}
