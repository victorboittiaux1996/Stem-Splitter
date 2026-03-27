"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000; // 1 second
// Simulated linear speed: covers 5%→95% in ~45s = ~2%/3s ≈ 0.044%/tick (250ms)
const SIM_TICK_MS = 250;
const SIM_PCT_PER_TICK = 0.044; // ~2% per 3s

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Smoothed display progress — never goes backward, drives the UI
  const [displayProgress, setDisplayProgress] = useState(0);
  const displayRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Job not found");
          return;
        }
        throw new Error(`Status ${res.status}`);
      }
      const data: Job = await res.json();
      setJob(data);
      setError(null);

      // If real progress is ahead of simulation, jump forward immediately
      const real = data.progress ?? 0;
      if (real > displayRef.current) {
        displayRef.current = real;
        setDisplayProgress(real);
      }
    } catch (err) {
      console.error("Failed to fetch job status:", err);
      setError("Failed to fetch status");
    }
  }, [jobId]);

  // Polling
  useEffect(() => {
    if (!jobId) return;
    fetchStatus();
    const interval = setInterval(() => {
      if (job?.status === "completed" || job?.status === "failed") {
        clearInterval(interval);
        return;
      }
      fetchStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [jobId, fetchStatus, job?.status]);

  // Linear simulation ticker — runs while job is active
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const timer = setInterval(() => {
      const current = displayRef.current;
      // Cap simulation at 95% — the real 100% comes from the worker
      if (current >= 95) return;
      const next = Math.min(95, current + SIM_PCT_PER_TICK);
      displayRef.current = next;
      setDisplayProgress(next);
    }, SIM_TICK_MS);

    return () => clearInterval(timer);
  }, [job?.status]);

  // Snap to 100% when completed
  useEffect(() => {
    if (job?.status === "completed") {
      displayRef.current = 100;
      setDisplayProgress(100);
    }
  }, [job?.status]);

  // Expose a patched job with the smoothed display progress
  const displayJob = job
    ? { ...job, progress: Math.round(displayProgress) }
    : null;

  return { job: displayJob, error };
}
