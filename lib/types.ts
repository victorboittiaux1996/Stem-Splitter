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
}

export interface StemDownload {
  name: string;
  url: string;
}
