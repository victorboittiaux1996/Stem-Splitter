"use client";

import type { Theme } from "./theme";

interface Props {
  C: Theme;
  onSplit: () => void;
}

export function FilesEmptyState({ C, onSplit }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        padding: "96px 24px",
        backgroundColor: C.bgCard,
      }}
    >
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: C.text,
          marginBottom: 12,
        }}
      >
        NO FILES YET
      </p>
      <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 28, textAlign: "center" }}>
        Split a track to get started. Your files will show up here.
      </p>
      <button
        onClick={onSplit}
        className="px-[24px] py-[12px] transition-all cursor-pointer"
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: C.accentText,
          backgroundColor: C.accent,
        }}
      >
        SPLIT A TRACK
      </button>
    </div>
  );
}
