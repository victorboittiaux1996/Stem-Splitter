"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SplitMode } from "@/lib/types";

export function useUpload() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const upload = useCallback(
    async (file: File, mode: SplitMode) => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        // Step 1 — get presigned URL from Vercel (tiny JSON request, no file)
        const initRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            contentType: file.type || "audio/mpeg",
            mode,
          }),
        });

        if (!initRes.ok) {
          const data = await initRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to initialize upload");
        }

        const { jobId, uploadUrl } = await initRes.json();

        // Step 2 — upload file directly to R2 (bypasses Vercel entirely)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              // Reserve 0–90% for the actual file upload
              setUploadProgress(Math.round((e.loaded / e.total) * 90));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`R2 upload failed (${xhr.status})`));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
          xhr.send(file);
        });

        setUploadProgress(95);

        // Step 3 — confirm upload and trigger Modal worker
        const confirmRes = await fetch("/api/upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        });

        if (!confirmRes.ok) {
          const data = await confirmRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to start processing");
        }

        setUploadProgress(100);
        router.push(`/processing/${jobId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        toast.error("Upload failed", { description: message });
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [router]
  );

  return { upload, isUploading, uploadProgress };
}
