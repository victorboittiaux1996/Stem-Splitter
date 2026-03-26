"use client";

import { useState, useEffect } from "react";

/**
 * Downsample an AudioBuffer's channel data into `count` peak amplitude values (0–1).
 * Uses max-abs in each bucket — standard approach for waveform visualization.
 */
function extractPeaks(buffer: AudioBuffer, count: number): number[] {
  // Mix to mono if stereo
  const ch0 = buffer.getChannelData(0);
  let samples: Float32Array;
  if (buffer.numberOfChannels >= 2) {
    const ch1 = buffer.getChannelData(1);
    samples = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) {
      samples[i] = (ch0[i] + ch1[i]) / 2;
    }
  } else {
    samples = ch0;
  }

  const bucketSize = Math.floor(samples.length / count);
  const peaks = new Array<number>(count);
  let globalMax = 0;

  for (let i = 0; i < count; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
    if (max > globalMax) globalMax = max;
  }

  // Normalize to 0–1
  if (globalMax > 0) {
    for (let i = 0; i < count; i++) {
      peaks[i] = peaks[i] / globalMax;
    }
  }

  return peaks;
}

/**
 * Resample a peaks array to a different length (for variants with different bar counts).
 * Uses max-in-bucket when downsampling, linear interpolation when upsampling.
 */
export function resamplePeaks(data: number[], targetCount: number): number[] {
  if (data.length === targetCount) return data;

  const result = new Array<number>(targetCount);
  const ratio = data.length / targetCount;

  if (ratio > 1) {
    // Downsampling: take max in each bucket
    for (let i = 0; i < targetCount; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(Math.floor((i + 1) * ratio), data.length);
      let max = 0;
      for (let j = start; j < end; j++) {
        if (data[j] > max) max = data[j];
      }
      result[i] = max;
    }
  } else {
    // Upsampling: linear interpolation
    for (let i = 0; i < targetCount; i++) {
      const pos = i * ratio;
      const low = Math.floor(pos);
      const high = Math.min(low + 1, data.length - 1);
      const frac = pos - low;
      result[i] = data[low] * (1 - frac) + data[high] * frac;
    }
  }

  return result;
}

interface UseAudioPeaksResult {
  peaks: number[] | null;
  loading: boolean;
  error: string | null;
  duration: number | null;
}

/**
 * Hook: decode an audio File and extract peak amplitude data.
 * Returns 1000 peaks by default — variants resample to their own count.
 */
export function useAudioPeaks(
  file: File | null,
  peakCount = 1000,
): UseAudioPeaksResult {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!file) {
      setPeaks(null);
      setError(null);
      setDuration(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      if (cancelled) return;
      try {
        const ctx = new AudioContext();
        const arrayBuffer = reader.result as ArrayBuffer;
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (cancelled) return;
        const extracted = extractPeaks(audioBuffer, peakCount);
        setPeaks(extracted);
        setDuration(audioBuffer.duration);
        await ctx.close();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to decode audio");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    reader.onerror = () => {
      if (!cancelled) {
        setError("Failed to read file");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);

    return () => { cancelled = true; };
  }, [file, peakCount]);

  return { peaks, loading, error, duration };
}
