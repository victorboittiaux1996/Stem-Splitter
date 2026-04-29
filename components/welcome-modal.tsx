"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fonts, stemColors } from "@/components/website/theme";

const STORAGE_KEY = "44stems-welcome-shown";

const C = {
  bg: "#FFFFFF",
  text: "#000000",
  textMuted: "#999999",
  textIcon: "#666666",
  accent: "#1B10FD",
};

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Small delay so the app renders first
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="!border-none !ring-0 !shadow-none !bg-white !p-0 !max-w-[580px] !w-[calc(100vw-24px)] !gap-0"
      >
        <div className="p-6 md:p-[52px] md:pb-[44px]" style={{ position: "relative" }}>
          {/* Close button — matches auth modal */}
          <button
            type="button"
            aria-label="Close"
            data-testid="modal-close"
            onClick={handleClose}
            className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 absolute top-2 right-2 md:top-5 md:right-5 flex items-center justify-center"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.textIcon,
            }}
          >
            <X size={20} />
          </button>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <DialogTitle
              style={{
                color: C.text,
                margin: 0,
                fontFamily: fonts.heading,
                letterSpacing: "-0.02em",
              }}
              className="!text-[28px] md:!text-[38px] !font-bold !leading-[1.1]"
            >
              Welcome to 44Stems
            </DialogTitle>
          </motion.div>

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            <DialogDescription
              style={{
                fontSize: 15,
                fontWeight: 400,
                color: C.textMuted,
                margin: "16px 0 0 0",
                fontFamily: fonts.body,
                lineHeight: 1.5,
              }}
              className="!text-[15px] !font-normal"
            >
              Studio-grade AI stem separation — split any track into vocals, drums, bass, and more.
            </DialogDescription>
          </motion.div>

          {/* Stem color bar — visual accent */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            style={{
              display: "flex",
              gap: 2,
              margin: "40px 0",
              transformOrigin: "left",
            }}
          >
            {[stemColors.vocals, stemColors.drums, stemColors.bass, stemColors.guitar].map(
              (color) => (
                <div
                  key={color}
                  style={{
                    height: 4,
                    flex: 1,
                    backgroundColor: color,
                  }}
                />
              )
            )}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: "100%",
                padding: "18px 24px",
                backgroundColor: C.accent,
                color: "#FFFFFF",
                border: "none",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: fonts.body,
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Split my first track
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
