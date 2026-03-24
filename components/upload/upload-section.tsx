"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Music, Disc3, Mic2, Drum, Guitar, Waves, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { useUpload } from "@/hooks/use-upload";
import { toast } from "sonner";

const ACCEPTED_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

type SplitMode = "2stem" | "4stem";

export function UploadSection() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SplitMode>("4stem");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, uploadProgress } = useUpload();

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_EXTENSIONS.test(f.name)) {
      toast.error("Unsupported format", {
        description: "Please upload MP3, WAV, FLAC, OGG, or M4A files.",
      });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File too large", {
        description: "Maximum file size is 50MB.",
      });
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stemIcons = [
    { icon: Mic2, label: "Vocals", color: "text-violet-400" },
    { icon: Drum, label: "Drums", color: "text-amber-400" },
    { icon: Guitar, label: "Bass", color: "text-emerald-400" },
    { icon: Waves, label: "Other", color: "text-sky-400" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-6"
    >
      {/* Drop zone */}
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        whileHover={{ scale: file ? 1 : 1.005 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => inputRef.current?.click()}
        className="relative block cursor-pointer overflow-hidden rounded-2xl border border-border bg-card/30 transition-all hover:border-primary/30 hover:shadow-[0_0_40px_-12px] hover:shadow-primary/20"
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* Background gradient */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            isDragging || file ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex flex-col items-center justify-center gap-4 p-14">
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <Disc3 className="h-12 w-12 text-primary" />
                </motion.div>
                <div className="space-y-1 text-center">
                  <p className="font-heading text-lg font-semibold">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearFile();
                  }}
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Choose a different file
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-3"
              >
                <motion.div
                  animate={isDragging ? { y: -4, scale: 1.1 } : { y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                </motion.div>
                <div className="space-y-1 text-center">
                  <p className="font-heading text-lg font-medium">
                    {isDragging ? "Drop it here" : "Drop your audio file here"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    MP3, WAV, FLAC, OGG, M4A &mdash; up to 50 MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Mode selector */}
      <div className="flex items-center justify-center">
        <div className="relative flex rounded-xl border border-border/50 bg-muted/30 p-1">
          <motion.div
            className="absolute inset-y-1 rounded-lg bg-primary/15 border border-primary/20"
            animate={{
              left: mode === "4stem" ? "4px" : "50%",
              right: mode === "2stem" ? "4px" : "50%",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
          <button
            type="button"
            onClick={() => setMode("4stem")}
            className={`relative z-10 flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              mode === "4stem" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            4 Stems
          </button>
          <button
            type="button"
            onClick={() => setMode("2stem")}
            className={`relative z-10 flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              mode === "2stem" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Mic2 className="h-3.5 w-3.5" />
            Vocals Only
          </button>
        </div>
      </div>

      {/* Stem preview pills */}
      <AnimatePresence>
        {mode === "4stem" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-center gap-3"
          >
            {stemIcons.map(({ icon: Icon, label, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/20 px-3 py-1"
              >
                <Icon className={`h-3 w-3 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      {isUploading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${uploadProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Submit button */}
      <ShimmerButton
        className="h-12 w-full text-base"
        disabled={!file || isUploading}
        onClick={() => file && upload(file, mode)}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : file ? (
          mode === "4stem" ? "Split into 4 Stems" : "Extract Vocals"
        ) : (
          "Select a file to start"
        )}
      </ShimmerButton>
    </motion.div>
  );
}
