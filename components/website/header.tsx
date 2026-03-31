"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Logo } from "./logo";
import { themes, fonts } from "./theme";

const NAV_ITEMS = ["Product", "Resources", "Pricing", "Enterprise"];

function SunIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      {/* Center circle */}
      <circle cx="9" cy="9" r="3" stroke={color} strokeWidth="1.2" />
      {/* 8 rays */}
      <line x1="9" y1="1" x2="9" y2="3.5" stroke={color} strokeWidth="1.2" />
      <line x1="9" y1="14.5" x2="9" y2="17" stroke={color} strokeWidth="1.2" />
      <line x1="1" y1="9" x2="3.5" y2="9" stroke={color} strokeWidth="1.2" />
      <line x1="14.5" y1="9" x2="17" y2="9" stroke={color} strokeWidth="1.2" />
      <line x1="3.05" y1="3.05" x2="4.82" y2="4.82" stroke={color} strokeWidth="1.2" />
      <line x1="13.18" y1="13.18" x2="14.95" y2="14.95" stroke={color} strokeWidth="1.2" />
      <line x1="14.95" y1="3.05" x2="13.18" y2="4.82" stroke={color} strokeWidth="1.2" />
      <line x1="4.82" y1="13.18" x2="3.05" y2="14.95" stroke={color} strokeWidth="1.2" />
    </svg>
  );
}

function MoonIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      {/* Crescent: full circle minus the overlapping circle */}
      <path
        d="M14.5 10.5A6 6 0 1 1 7.5 3.5a4.5 4.5 0 0 0 7 7z"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  const t = isDark ? themes.dark : themes.light;

  const bgColor = scrolled ? `${t.bg}E6` : "transparent";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "64px",
        display: "flex",
        alignItems: "center",
        backgroundColor: bgColor,
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        transition: "background-color 0.25s ease, backdrop-filter 0.25s ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo — left */}
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <Logo size="sm" color={t.text} />
        </a>

        {/* Nav — center */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item} label={item} color={t.textSecondary} hoverColor={t.text} />
          ))}
        </nav>

        {/* CTAs — right */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Sign In */}
          <GhostButton label="Sign In" color={t.textSecondary} hoverColor={t.text} />

          {/* Theme toggle */}
          <ThemeToggleButton
            isDark={isDark}
            color={t.textSecondary}
            hoverColor={t.text}
            onToggle={() => setTheme(isDark ? "light" : "dark")}
          />

          {/* Get Started */}
          <a
            href="/app"
            style={{
              fontFamily: fonts.body,
              fontSize: "14px",
              fontWeight: 500,
              color: "#FFFFFF",
              backgroundColor: t.accent,
              textDecoration: "none",
              padding: "0 20px",
              height: "36px",
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 0,
              cursor: "pointer",
              transition: "opacity 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
            }}
          >
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  label,
  color,
  hoverColor,
}: {
  label: string;
  color: string;
  hoverColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#"
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 500,
        color: hovered ? hoverColor : color,
        textDecoration: "none",
        transition: "color 0.15s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

function GhostButton({
  label,
  color,
  hoverColor,
}: {
  label: string;
  color: string;
  hoverColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/signin"
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 500,
        color: hovered ? hoverColor : color,
        textDecoration: "none",
        padding: "0 16px",
        height: "36px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 0,
        cursor: "pointer",
        transition: "color 0.15s ease",
        background: "transparent",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

function ThemeToggleButton({
  isDark,
  color,
  hoverColor,
  onToggle,
}: {
  isDark: boolean;
  color: string;
  hoverColor: string;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      style={{
        width: "36px",
        height: "36px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderRadius: 0,
        cursor: "pointer",
        color: hovered ? hoverColor : color,
        padding: 0,
        transition: "color 0.15s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isDark ? (
        <SunIcon size={16} color={hovered ? hoverColor : color} />
      ) : (
        <MoonIcon size={16} color={hovered ? hoverColor : color} />
      )}
    </button>
  );
}
