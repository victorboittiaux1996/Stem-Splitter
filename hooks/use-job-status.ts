"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000;
const INTERP_TICK_MS = 100; // UI refresh rate for smooth animation

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Real progress values received from the server
  const prevReal = useRef<{ pct: number; ts: number } | null>(null);
  const nextReal = useRef<{ pct: number; ts: number } | null>(null);
  // Current displayed value (never goes backward)
  const displayRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        if (res.status === 404) { setError("Job not found"); return; }
        throw new Error(`Status ${res.status}`);
      }
      const data: Job = await res.json();
      setJob(data);
      setError(null);

      const real = data.progress ?? 0;
      const now = Date.now();

      if (data.status === "completed") {
        // Jump straight to 100
        prevReal.current = { pct: 100, ts: now };
        nextReal.current = null;
        displayRef.current = 100;
        setDisplayProgress(100);
        return;
      }

      // Only update target if real value moved forward
      if (real > (nextReal.current?.pct ?? displayRef.current)) {
        prevReal.current = { pct: displayRef.current, ts: now };
        nextReal.current = { pct: real, ts: now + POLL_INTERVAL };
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

  // Interpolation ticker — smoothly moves displayProgress toward the real target
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const timer = setInterval(() => {
      const prev = prevReal.current;
      const next = nextReal.current;
      if (!prev || !next) return;

      const now = Date.now();
      const t = Math.min(1, (now - prev.ts) / (next.ts - prev.ts));
      const interpolated = prev.pct + t * (next.pct - prev.pct);
      // Never go backward
      const clamped = Math.max(displayRef.current, interpolated);
      displayRef.current = clamped;
      setDisplayProgress(clamped);
    }, INTERP_TICK_MS);

    return () => clearInterval(timer);
  }, [job?.status]);

  const displayJob = job
    ? { ...job, progress: Math.round(displayRef.current) }
    : null;

  return { job: displayJob, error };
}
