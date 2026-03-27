"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const MAX_DURATION = 300; // 5 minutes

function getPreferredMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

function padTwo(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatSeconds(s: number): string {
  return `${Math.floor(s / 60)}:${padTwo(s % 60)}`;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  elapsedSeconds: number;
  start: () => Promise<void>;
  stop: () => Promise<File>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef("");
  const resolveStopRef = useRef<((file: File) => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const buildFile = useCallback(() => {
    const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
    const now = new Date();
    const ts = `${now.getFullYear()}${padTwo(now.getMonth() + 1)}${padTwo(now.getDate())}-${padTwo(now.getHours())}${padTwo(now.getMinutes())}${padTwo(now.getSeconds())}`;
    const ext = extensionForMime(mimeRef.current);
    return new File([blob], `recording-${ts}.${ext}`, { type: blob.type });
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
    setElapsedSeconds(0);
    setIsRecording(false);
  }, []);

  const stop = useCallback((): Promise<File> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(buildFile());
        cleanup();
        return;
      }
      resolveStopRef.current = resolve;
      recorder.stop();
    });
  }, [buildFile, cleanup]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const mime = getPreferredMimeType();
    mimeRef.current = mime;

    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const file = buildFile();
      cleanup();
      if (resolveStopRef.current) {
        resolveStopRef.current(file);
        resolveStopRef.current = null;
      }
    };

    recorder.start(250); // collect chunks every 250ms
    setIsRecording(true);
    setElapsedSeconds(0);

    let seconds = 0;
    timerRef.current = setInterval(() => {
      seconds += 1;
      setElapsedSeconds(seconds);
      if (seconds >= MAX_DURATION) {
        stop();
      }
    }, 1000);
  }, [buildFile, cleanup, stop]);

  return { isRecording, elapsedSeconds, start, stop };
}
