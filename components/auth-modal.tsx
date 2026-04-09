"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fonts, stemColors } from "@/components/website/theme";

const C = {
  bg: "#FFFFFF",
  bgPage: "#F3F3F3",
  text: "#000000",
  textSec: "#999999",
  textMuted: "#666666",
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
  standalone?: boolean;
  error?: string | null;
}

export function AuthModal({ isOpen, onClose, redirectTo = "/app", standalone = false, error }: AuthModalProps) {
  const [authError] = useState("");

  const handleOAuth = async (provider: "google" | "apple" | "facebook") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
  };

  const content = (
    <motion.div
      key="auth-modal-card"
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: 580,
        maxWidth: "calc(100vw - 32px)",
        backgroundColor: C.bg,
        padding: "52px 52px 44px",
        position: "relative",
        zIndex: 1001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      {!standalone && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: C.textMuted,
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={20} />
        </button>
      )}

      {/* Welcome to 44Stems — large title, left-aligned, lots of whitespace below */}
      <h2 style={{
        fontSize: 38,
        fontWeight: 700,
        color: C.text,
        margin: "0 0 100px 0",
        fontFamily: fonts.heading,
        letterSpacing: "-0.02em",
        lineHeight: 1.1,
      }}>
        Welcome to 44Stems
      </h2>

      {/* Error */}
      {(error || authError) && (
        <div style={{
          padding: "10px 14px",
          marginBottom: 20,
          backgroundColor: "#FF336610",
          fontSize: 11,
          fontWeight: 600,
          color: "#FF3366",
          letterSpacing: "0.02em",
          fontFamily: fonts.body,
        }}>
          {authError || "AUTHENTICATION FAILED. PLEASE TRY AGAIN."}
        </div>
      )}

      {/* Continue with */}
      <p style={{
        fontSize: 19,
        fontWeight: 500,
        color: C.text,
        margin: "0 0 16px 0",
        fontFamily: fonts.body,
      }}>
        Continue with
      </p>

      {/* Product updates opt-in */}
      <NewsletterToggle />

      {/* OAuth cards grid — 4 square cards like LALAL.AI */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 8,
        marginBottom: 24,
      }}>
        <OAuthCard label="Google" color={stemColors.vocals} onClick={() => handleOAuth("google")}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white" fillOpacity="0.95">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </OAuthCard>
        <OAuthCard label="Apple" color={stemColors.drums} onClick={() => handleOAuth("apple")}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        </OAuthCard>
        <OAuthCard label="Facebook" color={stemColors.bass} onClick={() => handleOAuth("facebook")}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </OAuthCard>
        <OAuthCard label="Email" color="#BBBBBB" onClick={() => { window.location.href = `/login?mode=email&next=${encodeURIComponent(redirectTo)}`; }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </OAuthCard>
      </div>

      {/* Legal */}
      <p style={{
        fontSize: 11,
        color: C.textMuted,
        lineHeight: 1.6,
        fontFamily: fonts.body,
        margin: 0,
      }}>
        By clicking &apos;Continue with Google / Apple / Facebook / Email&apos;, you agree to our{" "}
        <span style={{ textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>.
      </p>
    </motion.div>
  );

  if (standalone) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bgPage,
      }}>
        <AnimatePresence mode="wait">
          {isOpen && content}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── OAuth card — LALAL.AI style: label top-left, icon bottom-left, square ── */

function OAuthCard({ label, color, onClick, children }: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Continue with ${label}`}
      style={{
        aspectRatio: "1",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: 14,
        backgroundColor: color,
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
        opacity: hovered ? 0.85 : 1,
      }}
    >
      <span style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#FFFFFF",
        fontFamily: fonts.body,
      }}>
        {label}
      </span>
      {children}
    </button>
  );
}

/* ── Newsletter toggle — same as dashboard settings ── */

function NewsletterToggle() {
  const [on, setOn] = useState(true);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
        cursor: "pointer",
      }}
      onClick={() => setOn(!on)}
    >
      <div style={{
        width: 28, height: 14, backgroundColor: on ? "#1B10FD" : "#DDDDDD",
        position: "relative", transition: "background-color 150ms", flexShrink: 0,
      }}>
        <div style={{
          width: 10, height: 10, backgroundColor: "#fff",
          position: "absolute", top: 2, left: on ? 16 : 2,
          transition: "left 150ms",
        }} />
      </div>
      <span style={{ fontSize: 12, color: C.textSec, fontFamily: fonts.body }}>
        Subscribe to 44Stems updates and never miss a beat!
      </span>
    </div>
  );
}
