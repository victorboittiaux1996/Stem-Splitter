export type SplitMode = "2stem" | "4stem" | "6stem";

export type JobStatus =
  | "uploading"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface Job {
  id: string;
  status: JobStatus;
  mode: SplitMode;
  progress: number;
  stage: string;
  createdAt: number;
  completedAt?: number;
  stems?: string[];
  error?: string;
  fileName?: string;
  bpm?: number | null;
  key?: string | null;
  key_raw?: string | null;
  duration?: number | null;
  peaks?: Record<string, number[]>;
  workspaceId?: string;
}

export interface StemDownload {
  name: string;
  url: string;
}

// ─── Queue System ──────────────────────────────────────────────────────────

export type StemCount = 2 | 4 | 6;
export type OutputFormat = "wav" | "mp3";
export type QueueItemStatus = "pending" | "uploading" | "processing" | "completed" | "failed";

export interface QueueItem {
  id: string;
  file: File | null;
  url?: string;
  fileName: string;
  fileSize: number;
  jobId: string | null;
  status: QueueItemStatus;
  progress: number;
  stage: string;
  error: string | null;
  mode: SplitMode;
  outputFormat: OutputFormat;
  job: Job | null;
  stemDownloads: StemDownload[];
  addedAt: number;
  completedAt: number | null;
  workspaceId?: string;
}

export interface QueueNotification {
  id: string;
  queueItemId: string;
  fileName: string;
  stemCount: number;
  completedAt: number;
  read: boolean;
}

// ─── History ───────────────────────────────────────────────────────────────

export interface HistoryItem {
  id: string;
  name: string;
  date: string;
  stems: number;
  stemList: string[];
  format: string;
  bpm: number | null;
  key: string | null;
  key_raw: string | null;
  mode: string;
  model: string;
  createdAt: number;
  completedAt: number;
  duration?: string;
  quality?: number;
  stability?: number;
  workspaceId?: string;
}
