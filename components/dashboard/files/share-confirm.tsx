"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Theme } from "./theme";

interface Props {
  open: boolean;
  onClose: () => void;
  C: Theme;
  fileId: string | null;
  fileName: string | null;
  generating: boolean;
  onConfirm: () => void;
}

/**
 * Pre-creation gate for public share links. Anyone with the URL can listen
 * to the stems publicly, so we ask the user to confirm — same UX pattern as
 * DeleteConfirm.
 */
export function ShareConfirm({ open, onClose, C, fileId, fileName, generating, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {open && fileId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={generating ? undefined : onClose}
        >
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[calc(100vw-24px)] max-w-[420px] overflow-hidden"
            style={{ backgroundColor: C.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-[20px] py-[14px]"
              style={{ backgroundColor: C.bgHover }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "0.05em" }}>
                CREATE PUBLIC LINK
              </p>
              <button
                onClick={onClose}
                className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-[4px] flex items-center justify-center"
                style={{ color: C.textMuted }}
                disabled={generating}
                aria-label="Close"
                data-testid="modal-close"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.6} />
              </button>
            </div>

            <div className="px-[20px] py-[18px]">
              <p style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 8 }}>
                Share &quot;{fileName ?? "this track"}&quot;?
              </p>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                A public URL will be generated. Anyone with the link can preview and download
                the stems. The link counts toward your monthly quota.
              </p>
            </div>

            <div
              className="flex items-center justify-end gap-[8px] px-[20px] py-[12px]"
              style={{ backgroundColor: C.bgSubtle }}
            >
              <button
                onClick={onClose}
                disabled={generating}
                className="px-[16px] py-[8px] transition-colors"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.textSec,
                  letterSpacing: "0.03em",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={onConfirm}
                disabled={generating}
                className="px-[16px] py-[8px] transition-all disabled:opacity-50"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.accentText,
                  backgroundColor: C.accent,
                  letterSpacing: "0.03em",
                }}
              >
                {generating ? "CREATING..." : "CREATE LINK"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
