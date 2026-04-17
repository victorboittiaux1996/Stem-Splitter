"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { MultiTrackPlayer } from "./multi-track-player";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import type { Job, StemDownload } from "@/lib/types";
import { downloadStemsZip } from "@/lib/download";

interface ResultsSectionProps {
  jobId: string;
  stems: StemDownload[];
  job?: Job | null;
}

export function ResultsSection({ jobId, stems, job }: ResultsSectionProps) {
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const downloadAll = async () => {
    setIsDownloadingAll(true);
    const trackName = job?.fileName ? job.fileName.replace(/\.[^/.]+$/, "") : "Track";
    const prefs = (() => { try { return JSON.parse(localStorage.getItem("44stems-preferences") || "{}"); } catch { return {}; } })();
    const fmt: "wav" | "mp3" = prefs.outputFormat === "mp3" ? "mp3" : "wav";
    try {
      await downloadStemsZip(stems, trackName, fmt);
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
        {job && (job.bpm != null || job.key != null) && (
          <div className="flex items-center gap-2 mt-1">
            {job.bpm != null && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {job.bpm} BPM
              </span>
            )}
            {job.key != null && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground" title={job.key_raw || undefined}>
                {job.key}
              </span>
            )}
            {job.key_raw && job.key_raw !== job.key && (
              <span className="text-xs text-muted-foreground/60">
                ({job.key_raw})
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Multi-track player */}
      <MultiTrackPlayer stems={stems} jobId={jobId} fileName={job?.fileName} />

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
