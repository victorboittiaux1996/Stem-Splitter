"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000;
const MAX_PCT_PER_SEC = 1.5;      // normal speed: never jump, always 1%/1%
const FINISH_PCT_PER_SEC = 15;    // fast finish once completed: reaches 100% in ~2s

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Target = last real value received from server (float, 0–100)
  const targetRef = useRef(0);
  // Current animated value (float, advances at MAX_PCT_PER_SEC toward target)
  const displayRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

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

      // Only move target forward — never backward
      if (real > targetRef.current) {
        targetRef.current = real;
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

  // rAF loop — advances displayRef toward targetRef at the observed real speed
  // Starts as soon as jobId is known, before first poll returns
  useEffect(() => {
    if (!jobId || job?.status === "failed") return;

    const tick = (now: number) => {
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      const target = targetRef.current;
      const current = displayRef.current;

      if (current < target || (job?.status === "completed" && current < 100)) {
        const isCompleted = job?.status === "completed";
        const effectiveTarget = isCompleted ? 100 : target;
        const speed = isCompleted ? FINISH_PCT_PER_SEC : MAX_PCT_PER_SEC;
        const maxStep = (elapsed / 1000) * speed;
        const step = Math.min(maxStep, effectiveTarget - current);
        if (step > 0) {
          displayRef.current = current + step;
          setDisplayProgress(displayRef.current);
        }
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
