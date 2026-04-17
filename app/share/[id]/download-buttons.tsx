"use client";

import { downloadBlob } from "@/lib/download";

interface ShareDownloadButtonsProps {
  wavUrl: string;
  mp3Url?: string | null;
  stemName: string;
  trackName: string;
  accent: string;
  textSec: string;
  bgHover: string;
}

export function ShareDownloadButtons({ wavUrl, mp3Url, stemName, trackName, accent, textSec, bgHover }: ShareDownloadButtonsProps) {
  const label = stemName.charAt(0).toUpperCase() + stemName.slice(1);
  const track = trackName.replace(/\.[^/.]+$/, "");

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {mp3Url && (
        <button
          onClick={() => downloadBlob(mp3Url, `${track} - ${label}.mp3`)}
          style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", color: textSec, padding: "5px 10px", backgroundColor: bgHover, border: "none", cursor: "pointer" }}
        >
          MP3
        </button>
      )}
      <button
        onClick={() => downloadBlob(wavUrl, `${track} - ${label}.wav`)}
        style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", padding: "5px 10px", backgroundColor: accent, color: "#FFFFFF", border: "none", cursor: "pointer" }}
      >
        WAV
      </button>
    </div>
  );
}
