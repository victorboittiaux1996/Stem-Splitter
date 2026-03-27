"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000;

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  // Target = last real value received from server (float, 0–100)
  const targetRef = useRef(0);
  // Current animated value (float, advances toward target at constant speed)
  const displayRef = useRef(0);
  // ms per 1% — derived from observed speed between the last two real updates
  // Start at 200ms/pct (5%/s) so the initial 0→5% cold-start is consumed quickly
  const msPerPctRef = useRef(200);
  const lastRealRef = useRef<{ pct: number; ts: number } | null>(null);
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
      const now = Date.now();

      if (data.status === "completed") {
        targetRef.current = 100;
        return;
      }

      // Update speed estimate from two consecutive real values
      if (lastRealRef.current && real > lastRealRef.current.pct) {
        const deltaPct = real - lastRealRef.current.pct;
        const deltaMs = now - lastRealRef.current.ts;
        if (deltaMs > 0 && deltaPct > 0) {
          // Smooth the speed: blend new observation with current estimate
          const observed = deltaMs / deltaPct;
          msPerPctRef.current = msPerPctRef.current * 0.4 + observed * 0.6;
        }
      }

      // Only move target forward
      if (real > targetRef.current) {
        targetRef.current = real;
        lastRealRef.current = { pct: real, ts: now };
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

      if (current < target) {
        // Advance at observed speed, never overshoot target
        const step = elapsed / msPerPctRef.current;
        displayRef.current = Math.min(target, current + step);
        setDisplayProgress(displayRef.current);
      } else if (job?.status === "completed" && current < 100) {
        // Final push to 100% at fixed speed (0.5%/frame ≈ 30 frames)
        displayRef.current = Math.min(100, current + 0.5);
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
