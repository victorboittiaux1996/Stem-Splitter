"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Logo } from "./logo";
import { fonts } from "./theme";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useAuth } from "@/hooks/use-auth";

const C = {
  bg: "#FFFFFF",
  bgCard: "#F5F5F5",
  text: "#000000",
  accent: "#1B10FD",
  accentHover: "#0E08D8",
} as const;

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 56,
        display: "flex",
        alignItems: "center",
        backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : C.bg,
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #E0E0E0" : "1px solid transparent",
        transition: "all 0.25s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 40px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Logo — left */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <Logo size="md" color={C.text} monochrome />
          </a>
        </div>
        {/* Nav — center */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <NavLink label="Product" href="/#features" />
          <NavLink label="Pricing" href="/pricing" />
          <NavLink label="API" href="#" />
          <NavDropdown
            label="Resources"
            items={[
              { label: "Docs", href: "#" },
              { label: "Blog", href: "#" },
              { label: "Changelog", href: "#" },
              { label: "Community", href: "#" },
              { label: "Help", href: "#" },
              { label: "Tutorials", href: "#" },
            ]}
          />
        </nav>
        {/* CTAs — right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
          <HeaderAuthActions />
        </div>
      </div>
    </header>
  );
}

function NavLink({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
        color: C.text,
        opacity: hovered ? 0.6 : 1,
        textDecoration: "none", padding: "6px 15px",
        transition: "opacity 0.15s",
      }}
    >
      {label}
    </a>
  );
}

function NavDropdown({ label, items }: { label: string; items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        style={{
          fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
          color: C.text, opacity: open ? 0.6 : 1, background: "transparent",
          border: "none", cursor: "pointer",
          padding: "6px 15px", display: "inline-flex", alignItems: "center",
          transition: "opacity 0.15s",
        }}
      >
        {label}
      </button>
      {/* Invisible bridge so mouse doesn't lose hover */}
      <div style={{
        position: "absolute", top: "100%", left: 0, right: 0, height: 8,
        pointerEvents: open ? "auto" : "none",
      }} />
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: open ? 1 : 0, y: open ? 0 : -4 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          padding: "12px 8px",
          backgroundColor: C.bg, border: `1px solid ${C.bgCard}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          minWidth: 300,
          display: "grid", gridTemplateColumns: "1fr 1fr",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {items.map(({ label: l, href }) => (
          <DropdownLink key={l} label={l} href={href} />
        ))}
      </motion.div>
    </div>
  );
}

function DropdownLink({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 400,
        color: C.text,
        textDecoration: "none",
        padding: "8px 12px",
        backgroundColor: hovered ? "rgba(0,0,0,0.04)" : "transparent",
        transition: "background-color 0.15s",
      }}
    >
      {label}
    </a>
  );
}

function HeaderAuthActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ height: 36, width: 180 }} aria-hidden />;
  }

  if (user) {
    return <GoToAppButton />;
  }

  return (
    <>
      <LoginButton />
      <HeaderCTA />
    </>
  );
}

function LoginButton() {
  const [hovered, setHovered] = useState(false);
  const { openAuthModal } = useAuthModal();
  return (
    <button
      onClick={() => openAuthModal()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
        color: C.text, opacity: hovered ? 0.6 : 1,
        background: "transparent", border: "none", cursor: "pointer",
        padding: "6px 15px",
        display: "inline-flex", alignItems: "center",
        transition: "opacity 0.15s",
      }}
    >
      Log in
    </button>
  );
}

function HeaderCTA() {
  const [hovered, setHovered] = useState(false);
  const { openAuthModal } = useAuthModal();
  return (
    <button
      onClick={() => openAuthModal("/app")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: "#FFFFFF",
        backgroundColor: hovered ? C.accentHover : C.accent,
        border: "none", cursor: "pointer",
        padding: "0 20px", height: 36,
        display: "inline-flex", alignItems: "center",
        transition: "background-color 0.15s",
      }}
    >
      Get Started
    </button>
  );
}

function GoToAppButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/app"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: "#FFFFFF",
        backgroundColor: hovered ? C.accentHover : C.accent,
        border: "none", cursor: "pointer",
        padding: "0 20px", height: 36,
        display: "inline-flex", alignItems: "center",
        textDecoration: "none",
        transition: "background-color 0.15s",
      }}
    >
      Go to app
    </a>
  );
}
