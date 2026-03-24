"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Download,
  Mic2,
  Drum,
  Guitar,
  Piano,
  Waves,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { StemDownload } from "@/lib/types";

const STEM_CONFIG: Record<
  string,
  { icon: typeof Mic2; color: string; bgColor: string; label: string }
> = {
  vocals: { icon: Mic2, color: "text-violet-400", bgColor: "bg-violet-400/10 border-violet-400/20", label: "Vocals" },
  drums: { icon: Drum, color: "text-amber-400", bgColor: "bg-amber-400/10 border-amber-400/20", label: "Drums" },
  bass: { icon: Guitar, color: "text-emerald-400", bgColor: "bg-emerald-400/10 border-emerald-400/20", label: "Bass" },
  guitar: { icon: Guitar, color: "text-orange-400", bgColor: "bg-orange-400/10 border-orange-400/20", label: "Guitar" },
  piano: { icon: Piano, color: "text-sky-400", bgColor: "bg-sky-400/10 border-sky-400/20", label: "Piano" },
  other: { icon: Waves, color: "text-rose-400", bgColor: "bg-rose-400/10 border-rose-400/20", label: "Other" },
  instrumental: { icon: Music, color: "text-indigo-400", bgColor: "bg-indigo-400/10 border-indigo-400/20", label: "Instrumental" },
};

interface MultiTrackPlayerProps {
  stems: StemDownload[];
  jobId: string;
}

export function MultiTrackPlayer({ stems, jobId }: MultiTrackPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const animFrameRef = useRef<number>(0);

  // Stem order
  const stemOrder = ["vocals", "drums", "bass", "guitar", "piano", "other", "instrumental"];
  const sortedStems = [...stems].sort(
    (a, b) => stemOrder.indexOf(a.name) - stemOrder.indexOf(b.name)
  );

  // Init volumes
  useEffect(() => {
    const v: Record<string, number> = {};
    stems.forEach((s) => (v[s.name] = 1));
    setVolumes(v);
  }, [stems]);

  // Check readiness when audio elements load
  const handleLoadedMetadata = useCallback((name: string) => {
    const audio = audioRefs.current[name];
    if (audio && audio.duration > 0) {
      setDuration((prev) => Math.max(prev, audio.duration));
    }
    // Check if all are ready
    const allReady = stems.every((s) => {
      const a = audioRefs.current[s.name];
      return a && a.readyState >= 1;
    });
    if (allReady) setReady(true);
  }, [stems]);

  // Update time loop
  useEffect(() => {
    const tick = () => {
      const first = audioRefs.current[stems[0]?.name];
      if (first && !first.paused) {
        setCurrentTime(first.currentTime);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stems]);

  // Apply solo/mute/volume
  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([name, audio]) => {
      if (!audio) return;
      if (soloTrack) {
        audio.volume = name === soloTrack ? (volumes[name] ?? 1) : 0;
      } else if (mutedTracks.has(name)) {
        audio.volume = 0;
      } else {
        audio.volume = volumes[name] ?? 1;
      }
    });
  }, [soloTrack, mutedTracks, volumes]);

  const togglePlay = () => {
    const audios = Object.values(audioRefs.current).filter(Boolean) as HTMLAudioElement[];
    if (isPlaying) {
      audios.forEach((a) => a.pause());
    } else {
      // Sync all to same time before playing
      const time = audioRefs.current[stems[0]?.name]?.currentTime || 0;
      audios.forEach((a) => {
        a.currentTime = time;
        a.play().catch(() => {});
      });
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (value: number | readonly number[]) => {
    const time = Array.isArray(value) ? value[0] : value;
    Object.values(audioRefs.current).forEach((a) => {
      if (a) a.currentTime = time;
    });
    setCurrentTime(time);
  };

  const toggleMute = (name: string) => {
    if (soloTrack === name) { setSoloTrack(null); return; }
    setMutedTracks((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleSolo = (name: string) => {
    setSoloTrack((prev) => (prev === name ? null : name));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Hidden audio elements in the DOM */}
      <div className="hidden">
        {stems.map((stem) => (
          <audio
            key={stem.name}
            ref={(el) => { audioRefs.current[stem.name] = el; }}
            src={stem.url}
            preload="metadata"
            onLoadedMetadata={() => handleLoadedMetadata(stem.name)}
            onEnded={() => setIsPlaying(false)}
          />
        ))}
      </div>

      {/* Transport bar */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:scale-105"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>

          <div className="flex-1 space-y-1">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={seek}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Track strips */}
      <div className="space-y-2">
        {sortedStems.map((stem, i) => {
          const config = STEM_CONFIG[stem.name] || {
            icon: Music, color: "text-muted-foreground", bgColor: "bg-muted/10 border-border/20", label: stem.name,
          };
          const Icon = config.icon;
          const isMuted = mutedTracks.has(stem.name);
          const isSolo = soloTrack === stem.name;
          const isActive = soloTrack ? isSolo : !isMuted;

          return (
            <motion.div
              key={stem.name}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                isActive ? config.bgColor : "bg-muted/5 border-border/10 opacity-40"
              }`}
            >
              <div className="flex w-24 items-center gap-2">
                <Icon className={`h-4 w-4 ${config.color}`} />
                <span className="text-sm font-medium">{config.label}</span>
              </div>

              <button
                onClick={() => toggleSolo(stem.name)}
                className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                  isSolo ? "bg-amber-400 text-black" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                S
              </button>

              <button
                onClick={() => toggleMute(stem.name)}
                className={`rounded px-2 py-0.5 text-xs font-bold transition-colors ${
                  isMuted ? "bg-red-400 text-white" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                M
              </button>

              <div className="flex-1">
                <Slider
                  value={[volumes[stem.name] ?? 1]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={(v: number | readonly number[]) =>
                    setVolumes((prev) => ({ ...prev, [stem.name]: Array.isArray(v) ? v[0] : v }))
                  }
                  className="cursor-pointer"
                />
              </div>

              <div className="w-20 h-1 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isActive ? "bg-primary/60" : "bg-muted/20"}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <a href={stem.url} download={`${stem.name}.wav`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </a>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
