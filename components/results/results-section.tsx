"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { MultiTrackPlayer } from "./multi-track-player";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { StemDownload } from "@/lib/types";

interface ResultsSectionProps {
  jobId: string;
  stems: StemDownload[];
}

export function ResultsSection({ jobId, stems }: ResultsSectionProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const downloadAll = async () => {
    setIsDownloadingAll(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      await Promise.all(
        stems.map(async (stem) => {
          const response = await fetch(stem.url);
          const blob = await response.blob();
          zip.file(`${stem.name}.wav`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stems-${jobId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to create ZIP:", err);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Success header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-2"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <h2 className="font-heading text-2xl font-bold">Separation Complete</h2>
        <p className="text-sm text-muted-foreground">
          {stems.length} stems ready — solo, mute, and compare
        </p>
      </motion.div>

      {/* Multi-track player */}
      <MultiTrackPlayer stems={stems} jobId={jobId} />

      {/* Download all */}
      <ShimmerButton
        className="h-12 w-full text-base"
        onClick={downloadAll}
        disabled={isDownloadingAll}
      >
        {isDownloadingAll ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating ZIP...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Download All as ZIP
          </>
        )}
      </ShimmerButton>
    </motion.div>
  );
}
