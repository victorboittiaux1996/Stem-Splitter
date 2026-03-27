"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Job } from "@/lib/types";

const POLL_INTERVAL = 1000;
const MAX_PCT_PER_SEC = 1;     // 1%/s — toujours 1 par 1, jamais de saut
const FINISH_PCT_PER_SEC = 10; // accélération finale quand completed (~2-3s pour finir)

export function useJobStatus(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);

  const targetRef = useRef(0);   // vraie valeur reçue du serveur
  const displayRef = useRef(0);  // valeur affichée, monte à MAX_PCT_PER_SEC
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
      // target ne recule jamais
      if (real > targetRef.current) {
        targetRef.current = real;
      }
      if (data.status === "completed") {
        targetRef.current = 100;
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

  // rAF — monte displayRef vers targetRef à vitesse max 1%/s
  useEffect(() => {
    if (!jobId || job?.status === "failed") return;

    const tick = (now: number) => {
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 16;
      lastTickRef.current = now;

      const isCompleted = job?.status === "completed";
      const target = isCompleted ? 100 : targetRef.current;
      const current = displayRef.current;

      if (current < target) {
        const speed = isCompleted ? FINISH_PCT_PER_SEC : MAX_PCT_PER_SEC;
        const maxStep = (elapsed / 1000) * speed;
        const step = Math.min(maxStep, target - current);
        displayRef.current = current + step;
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
