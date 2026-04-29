"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Mobile-friendly variant of HeroDemo.
 * The desktop HeroDemo has a 880px-wide internal layout that doesn't scale
 * to <md viewports. This component cycles between 3 pre-captured PNGs
 * (split / results / files) with a 5s interval, mirroring the desktop
 * cycling behavior. Re-capture via:
 *   npx playwright test tests/e2e/capture-hero-demo.spec.ts --project=Desktop
 */

const VIEWS = [
  { src: "/hero-demo-split.png", alt: "Split Audio — drop zone and stem controls" },
  { src: "/hero-demo-results.png", alt: "Results — separated stems with waveforms" },
  { src: "/hero-demo-files.png", alt: "My Files — recent splits library" },
] as const;

export function HeroDemoMobile() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % VIEWS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", backgroundColor: "#111111" }}>
      <AnimatePresence mode="sync">
        <motion.div
          key={VIEWS[index].src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", inset: 0 }}
        >
          <Image
            src={VIEWS[index].src}
            alt={VIEWS[index].alt}
            fill
            priority={index === 0}
            sizes="(max-width: 767px) 100vw, 880px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
