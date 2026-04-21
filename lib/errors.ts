/**
 * Structured import error codes + English user-facing messages.
 * Error codes are set by the Modal worker (classify_error in worker/app.py)
 * and propagated through the job JSON as `error_code`.
 */

export type ImportErrorCode =
  | "bot_detected"
  | "private"
  | "removed"
  | "geo_blocked"
  | "age_restricted"
  | "rate_limited"
  | "network"
  | "unsupported"
  | "unknown";

interface ErrorInfo {
  message: string;
  /** If true, retrying will not help — only offer "Upload file instead" */
  terminal: boolean;
}

const ERROR_MAP: Record<ImportErrorCode, ErrorInfo> = {
  bot_detected: {
    message: "The source is temporarily blocking this request. Try again in a few minutes or upload the audio file directly.",
    terminal: false,
  },
  private: {
    message: "This video is private and cannot be imported.",
    terminal: true,
  },
  removed: {
    message: "This video is no longer available.",
    terminal: true,
  },
  geo_blocked: {
    message: "This video is geo-restricted and cannot be imported.",
    terminal: true,
  },
  age_restricted: {
    message: "This video is age-restricted and cannot be imported.",
    terminal: true,
  },
  rate_limited: {
    message: "Too many requests. Please wait a minute and try again.",
    terminal: false,
  },
  network: {
    message: "Could not reach the source. Please try again.",
    terminal: false,
  },
  unsupported: {
    message: "This URL is not supported.",
    terminal: true,
  },
  unknown: {
    message: "Import failed. Please try again or upload the audio file. Contact hello@44stems.com if the problem persists.",
    terminal: true,
  },
};

export function formatImportError(code?: string | null): string {
  if (!code) return "Import failed. Please try again or upload the audio file directly.";
  return ERROR_MAP[code as ImportErrorCode]?.message ?? ERROR_MAP.unknown.message;
}

export function isTerminalError(code?: string | null): boolean {
  // When errorCode is null/absent (upload-phase network error, not a YT error),
  // treat as retryable — hiding RETRY for transient upload failures is wrong.
  if (!code) return false;
  return ERROR_MAP[code as ImportErrorCode]?.terminal ?? true;
}
