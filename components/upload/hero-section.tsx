"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <div className="space-y-4 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="font-heading text-4xl font-bold tracking-tight sm:text-5xl"
      >
        Split any song into{" "}
        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
          stems
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="mx-auto max-w-sm text-base text-muted-foreground sm:text-lg"
      >
        Studio-grade AI separation. Vocals, drums, bass & instruments in
        seconds. Built for producers.
      </motion.p>
    </div>
  );
}
