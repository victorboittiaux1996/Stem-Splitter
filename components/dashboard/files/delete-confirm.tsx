"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { Theme } from "./theme";

interface Props {
  open: boolean;
  onClose: () => void;
  C: Theme;
  fileId: string | null;
  fileName: string | null;
  onDeleted: (id: string) => void;
}

export function DeleteConfirm({ open, onClose, C, fileId, fileName, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!fileId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/history/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      toast.success("File deleted");
      onDeleted(fileId);
      onClose();
    } catch (err) {
      console.error("[delete]", err);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && fileId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={deleting ? undefined : onClose}
        >
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[400px] overflow-hidden"
            style={{ backgroundColor: C.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-[20px] py-[14px]"
              style={{ backgroundColor: C.bgHover }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "0.05em" }}>
                DELETE FILE
              </p>
              <button
                onClick={onClose}
                className="p-[4px]"
                style={{ color: C.textMuted }}
                disabled={deleting}
                aria-label="Close"
              >
                <X className="h-[14px] w-[14px]" strokeWidth={1.6} />
              </button>
            </div>

            <div className="px-[20px] py-[18px]">
              <p style={{ fontSize: 15, fontWeight: 500, color: C.text, marginBottom: 8 }}>
                Delete &quot;{fileName ?? "this file"}&quot;?
              </p>
              <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5 }}>
                This cannot be undone. All stems and the original file will be permanently removed.
              </p>
            </div>

            <div
              className="flex items-center justify-end gap-[8px] px-[20px] py-[12px]"
              style={{ backgroundColor: C.bgSubtle }}
            >
              <button
                onClick={onClose}
                disabled={deleting}
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
                onClick={handleDelete}
                disabled={deleting}
                className="px-[16px] py-[8px] transition-all disabled:opacity-50"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  backgroundColor: "#D63030",
                  letterSpacing: "0.03em",
                }}
              >
                {deleting ? "DELETING..." : "DELETE"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
