"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useJobStatus } from "@/hooks/use-job-status";
import { ProgressDisplay } from "@/components/processing/progress-display";
import { ResultsSection } from "@/components/results/results-section";
import { Button } from "@/components/ui/button";
import type { StemDownload } from "@/lib/types";

export default function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { job, error } = useJobStatus(jobId);
  const [stems, setStems] = useState<StemDownload[]>([]);

  // Fetch download URLs when job completes
  useEffect(() => {
    if (job?.status !== "completed") return;

    fetch(`/api/download/${jobId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stems) setStems(data.stems);
      })
      .catch(console.error);
  }, [job?.status, jobId]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="mx-auto w-full max-w-xl space-y-8">
        <AnimatePresence mode="wait">
          {/* Error state */}
          {(error || job?.status === "failed") && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-2">
                <h2 className="font-heading text-2xl font-bold">
                  Something went wrong
                </h2>
                <p className="text-sm text-muted-foreground">
                  {job?.error || error || "An unexpected error occurred."}
                </p>
              </div>
              <a href="/">
                <Button variant="outline">Try again</Button>
              </a>
            </motion.div>
          )}

          {/* Processing state */}
          {job && job.status !== "completed" && job.status !== "failed" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-4"
            >
              <ProgressDisplay
                progress={job.progress}
                stage={job.stage || "Processing..."}
              />
              {job.fileName && (
                <p className="text-xs text-muted-foreground/60 truncate max-w-xs">
                  {job.fileName}
                </p>
              )}
            </motion.div>
          )}

          {/* Completed state */}
          {job?.status === "completed" && stems.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ResultsSection jobId={jobId} stems={stems} />
            </motion.div>
          )}

          {/* Loading state (no job data yet) */}
          {!job && !error && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <ProgressDisplay progress={0} stage="Connecting..." />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
