"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000;

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  // The real value last received from the server
  const targetRef = useRef(0);
  // The displayed value — animates toward target
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  // Speed in %/ms — computed from the last two real server updates
  const speedRef = useRef(0.005); // default: 5%/s until first real update

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

      if (data.status === "completed") {
        targetRef.current = 100;
        return;
      }

      if (real > targetRef.current) {
        // Compute speed from how fast the real value just moved
        const delta = real - targetRef.current;
        // delta% arrived in ~POLL_INTERVAL ms — use that as speed
        if (delta > 0) {
          speedRef.current = delta / POLL_INTERVAL;
        }
        targetRef.current = real;
      }
    } catch (err) {
      console.error("Failed to fetch job status:", err);
      setError("Failed to fetch status");
    }
  }, [jobId]);

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

  // rAF — interpolates displayRef toward targetRef at the observed speed
  useEffect(() => {
    if (!jobId || job?.status === "failed") return;

    const tick = (now: number) => {
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 16;
      lastTickRef.current = now;

      const target = job?.status === "completed" ? 100 : targetRef.current;
      const current = displayRef.current;

      if (current < target) {
        // At observed speed — never overshoot the target
        const step = elapsed * speedRef.current;
        displayRef.current = Math.min(target, current + step);
        setDisplayProgress(displayRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [jobId, job?.status]);

  const displayJob = job
    ? { ...job, progress: Math.floor(displayRef.current) }
    : null;

  return { job: displayJob, error };
}
