"use client";

import { useState, useEffect } from "react";
import { Logo } from "./logo";
import { fonts } from "./theme";

const NAV_ITEMS = ["Product", "Resources", "Pricing", "Enterprise"];

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "64px",
        display: "flex",
        alignItems: "center",
        backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : "#FFFFFF",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #E8E8E8" : "1px solid transparent",
        transition: "border-color 0.25s ease, background-color 0.25s ease",
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
          position: "relative",
        }}
      >
        {/* Logo — left */}
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <Logo size="md" color="#000000" />
        </a>

        {/* Nav — left, after logo */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            marginLeft: "48px",
          }}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink key={item} label={item} />
          ))}
        </nav>

        {/* CTAs — right */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <LogInButton />
          <GetStartedButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="#"
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 400,
        color: hovered ? "#000000" : "#222222",
        textDecoration: "none",
        transition: "color 0.15s ease",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

function LogInButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/signin"
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 400,
        color: hovered ? "#000000" : "#222222",
        textDecoration: "none",
        padding: "0 12px",
        height: "36px",
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        transition: "color 0.15s ease",
        background: "transparent",
        borderRadius: 0,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Log in
    </a>
  );
}

function GetStartedButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/app"
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 500,
        color: "#FFFFFF",
        backgroundColor: hovered ? "#0E08D8" : "#1B10FD",
        textDecoration: "none",
        padding: "0 16px",
        height: "36px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 0,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Get Started
    </a>
  );
}
