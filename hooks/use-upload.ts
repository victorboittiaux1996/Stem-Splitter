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
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", mode);

        // Simulate upload progress (real progress would need XMLHttpRequest)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Upload failed");
        }

        setUploadProgress(100);
        const { jobId } = await res.json();

        // Navigate to processing page
        router.push(`/processing/${jobId}`);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        toast.error("Upload failed", { description: message });
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [router]
  );

  return { upload, isUploading, uploadProgress };
}
