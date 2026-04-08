"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";

// Same theme tokens as main app — Ableton geometric, 0 border-radius
const C = {
  bg: "#111111",
  bgCard: "#1C1C1C",
  bgSubtle: "#161616",
  bgHover: "#242424",
  text: "#FFFFFF",
  textSec: "#999999",
  textMuted: "#666666",
  accent: "#1B10FD",
};

const F = "'Futura PT', 'futura-pt', sans-serif";

// Stem bar colors
const STEM_COLORS = ["#1B10FD", "#FF6B00", "#00CC66", "#FF3366", "#00BBFF", "#777777"];

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [hovering, setHovering] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
      fontFamily: F,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Card */}
      <div style={{
        width: 380,
        backgroundColor: C.bgCard,
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        position: "relative",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s cubic-bezier(0.22,1,0.36,1), transform 0.5s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Stem bars — decorative top */}
        <div style={{ display: "flex", gap: 3, position: "absolute", top: 0, left: 0, right: 0 }}>
          {STEM_COLORS.map((color, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              backgroundColor: color,
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scaleX(1)" : "scaleX(0)",
              transformOrigin: "left",
              transition: `opacity 0.4s ${0.1 + i * 0.06}s, transform 0.5s ${0.1 + i * 0.06}s cubic-bezier(0.22,1,0.36,1)`,
            }} />
          ))}
        </div>

        {/* Logo / Title */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: C.text,
            margin: 0,
            textTransform: "uppercase",
          }}>
            44STEMS
          </h1>
          <p style={{
            fontSize: 13,
            fontWeight: 500,
            color: C.textSec,
            marginTop: 8,
            letterSpacing: "0.02em",
          }}>
            AI STEM SEPARATION
          </p>
        </div>

        {error && (
          <div style={{
            width: "100%",
            padding: "10px 14px",
            backgroundColor: "#FF336615",
            fontSize: 12,
            fontWeight: 600,
            color: "#FF3366",
            letterSpacing: "0.02em",
          }}>
            AUTHENTICATION FAILED. PLEASE TRY AGAIN.
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
            width: "100%",
            height: 46,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            backgroundColor: hovering ? "#FFFFFF" : "#F5F5F5",
            color: "#000000",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: F,
            letterSpacing: "0.03em",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.15s",
            textTransform: "uppercase",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ width: "100%", height: 1, backgroundColor: C.bgHover }} />

        {/* Footer text */}
        <p style={{
          fontSize: 11,
          color: C.textMuted,
          textAlign: "center",
          lineHeight: 1.6,
          letterSpacing: "0.01em",
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Bottom tagline */}
      <p style={{
        fontSize: 11,
        color: C.textMuted,
        marginTop: 24,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFamily: F,
        fontWeight: 600,
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.6s 0.3s",
      }}>
        By producers, for producers.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
