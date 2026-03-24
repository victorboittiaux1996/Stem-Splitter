"use client";

import { motion } from "framer-motion";
import { Shield, Clock, Zap } from "lucide-react";

const signals = [
  { icon: Zap, text: "WAV lossless output" },
  { icon: Shield, text: "No account needed" },
  { icon: Clock, text: "Files deleted after 24h" },
];

export function TrustSignals() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
    >
      {signals.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm"
        >
          <Icon className="h-3.5 w-3.5 text-primary/60" />
          <span>{text}</span>
        </div>
      ))}
    </motion.div>
  );
}
