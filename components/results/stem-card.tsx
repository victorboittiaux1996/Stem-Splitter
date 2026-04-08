"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Download, Mic2, Drum, Guitar, Waves, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEM_CONFIG: Record<string, { icon: typeof Mic2; color: string; label: string }> = {
  vocals: { icon: Mic2, label: "Vocals", color: "text-violet-400" },
  drums: { icon: Drum, label: "Drums", color: "text-amber-400" },
  bass: { icon: Guitar, label: "Bass", color: "text-emerald-400" },
  other: { icon: Waves, label: "Other", color: "text-sky-400" },
  instrumental: { icon: Music, label: "Instrumental", color: "text-rose-400" },
};

interface StemCardProps {
  name: string;
  url: string;
  index: number;
}

export function StemCard({ name, url, index }: StemCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const config = STEM_CONFIG[name] || {
    icon: Music,
    label: name,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group rounded-xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm transition-colors hover:bg-card"
    >
      <audio
        ref={audioRef}
        src={`${url}${url.includes('?') ? '&' : '?'}format=mp3`}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4">
        {/* Play button */}
        <button
          onClick={togglePlay}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 transition-all hover:scale-105 ${
            isPlaying ? "bg-primary text-primary-foreground" : "bg-muted/50"
          }`}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        {/* Info + progress */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Download */}
        <a href={url} download={`${name}.wav`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Download className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </motion.div>
  );
}
