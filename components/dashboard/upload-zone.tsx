"use client";

import { useState, useCallback, useRef } from "react";
import { FileUp, FileAudio, X, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const ACCEPTED = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MAX_SIZE = 50 * 1024 * 1024;

interface UploadZoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
}

export function UploadZone({ file, onFileSelect, onFileClear }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.test(f.name)) { toast.error("Unsupported format", { description: "Upload MP3, WAV, FLAC, OGG, or M4A." }); return; }
    if (f.size > MAX_SIZE) { toast.error("File too large", { description: "Maximum size is 50MB." }); return; }
    onFileSelect(f);
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !file && inputRef.current?.click()}
      style={{
        border: isDragging ? "1.5px dashed #949494" : "1.5px dashed #D4D4D8",
        borderRadius: "16px",
        backgroundColor: isDragging ? "#FAFAFA" : undefined,
        cursor: file ? undefined : "pointer",
      }}
      className="relative w-full transition-colors duration-150"
    >
      <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      <div className="flex flex-col items-center justify-center gap-[14px] px-[32px] py-[64px]">
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }} className="flex flex-col items-center gap-[10px]">
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px]" style={{ backgroundColor: "#F4F4F5" }}>
                <FileAudio className="h-[20px] w-[20px] text-[#6B6B73]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-[#0F0F10]">{file.name}</p>
                <p className="mt-[2px] text-[13px] text-[#949494]">{formatSize(file.size)}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onFileClear(); if (inputRef.current) inputRef.current.value = ""; }}
                className="flex items-center gap-[4px] rounded-[8px] px-[10px] py-[4px] text-[13px] text-[#949494] transition-colors hover:bg-[#F4F4F5] hover:text-[#6B6B73]">
                <X className="h-[12px] w-[12px]" /> Remove
              </button>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="flex flex-col items-center gap-[12px]">
              <motion.div animate={isDragging ? { y: -3, scale: 1.04 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px]" style={{ backgroundColor: "#F4F4F5" }}>
                  <FileUp className="h-[20px] w-[20px] text-[#949494]" strokeWidth={1.5} />
                </div>
              </motion.div>
              <div className="text-center">
                <p className="text-[15px] font-medium text-[#0F0F10]">
                  {isDragging ? "Drop it here" : "Click to upload, or drag and drop"}
                </p>
                <p className="mt-[4px] text-[13px] text-[#949494]">Audio or video files up to 50MB each</p>
              </div>

              {/* "or" — just text, no lines, like ElevenLabs */}
              <span className="text-[13px] text-[#BBBBC4] py-[2px]">or</span>

              {/* Record audio */}
              <button onClick={(e) => e.stopPropagation()}
                style={{ border: "1px solid #E5E5E8" }}
                className="flex items-center gap-[8px] rounded-[12px] px-[16px] py-[10px] text-[14px] font-medium text-[#3D3D42] transition-colors hover:bg-[#FAFAFA]">
                <Mic className="h-[16px] w-[16px] text-[#6B6B73]" strokeWidth={1.8} />
                Record audio
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
