"use client";

import { AudioWaveform } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2">
          <AudioWaveform className="h-5 w-5 text-primary" />
          <span className="font-heading text-lg font-bold tracking-tight">
            Stem Splitter
          </span>
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}
