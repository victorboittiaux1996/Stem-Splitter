"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Logo } from "./logo";
import { fonts } from "./theme";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { useAuth } from "@/hooks/use-auth";

const C = {
  bg: "#FFFFFF",
  bgCard: "#F5F5F5",
  text: "#000000",
  textMuted: "#666666",
  accent: "#1B10FD",
  accentHover: "#0E08D8",
} as const;

const RESOURCE_ITEMS = [
  { label: "Docs", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Changelog", href: "#" },
  { label: "Community", href: "#" },
  { label: "Help", href: "#" },
  { label: "Tutorials", href: "#" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Portal target only available client-side
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Mobile drawer a11y: ESC close, body scroll lock, close on resize ≥md, focus restore
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileNavOpen(false); };
    const onResize = () => { if (window.innerWidth >= 768) setMobileNavOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimeout = setTimeout(() => drawerCloseRef.current?.focus(), 220);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prevOverflow;
      clearTimeout(focusTimeout);
      setTimeout(() => hamburgerRef.current?.focus(), 220);
    };
  }, [mobileNavOpen]);

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
        className="flex md:grid md:grid-cols-[1fr_auto_1fr] items-center w-full justify-between md:justify-stretch px-4 md:px-10"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Logo — left */}
        <div className="flex items-center">
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <Logo size="md" color={C.text} monochrome />
          </Link>
        </div>
        {/* Nav — center, desktop only */}
        <nav className="hidden md:flex items-center" style={{ gap: 2 }}>
          <NavLink label="Product" href="/#features" />
          <NavLink label="Pricing" href="/pricing" />
          <NavLink label="API" href="#" />
          <NavDropdown label="Resources" items={RESOURCE_ITEMS} />
        </nav>
        {/* CTAs — right, desktop only */}
        <div className="hidden md:flex items-center justify-end" style={{ gap: 8 }}>
          <HeaderAuthActions />
        </div>
        {/* Hamburger — mobile only */}
        <button
          ref={hamburgerRef}
          onClick={() => setMobileNavOpen(true)}
          data-testid="header-hamburger"
          aria-label="Open navigation menu"
          className="md:hidden min-h-11 min-w-11 flex items-center justify-center"
          style={{ color: C.text, cursor: "pointer", background: "transparent", border: "none" }}
        >
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
            <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
      </div>

      {/* Mobile drawer + backdrop — rendered in a Portal to escape the
          header's backdrop-filter containing block (which would otherwise
          confine `position: fixed` descendants to the 56px header). */}
      {mounted && createPortal(
        <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              key="header-drawer-backdrop"
              className="md:hidden fixed inset-0 z-[200]"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              key="header-drawer"
              role="dialog"
              aria-label="Navigation menu"
              aria-modal="true"
              className="md:hidden fixed top-0 right-0 z-[201] flex flex-col"
              style={{ width: 280, height: "100dvh", backgroundColor: C.bg }}
              initial={{ x: 280 }}
              animate={{ x: 0 }}
              exit={{ x: 280 }}
              transition={{ type: "tween", duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between shrink-0 px-4" style={{ height: 56, borderBottom: `1px solid ${C.bgCard}` }}>
                <Logo size="md" color={C.text} monochrome />
                <button
                  ref={drawerCloseRef}
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Close navigation menu"
                  data-testid="modal-close"
                  className="min-h-11 min-w-11 flex items-center justify-center"
                  style={{ color: C.text, cursor: "pointer", background: "transparent", border: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="1.4"/>
                    <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col" style={{ gap: 4 }}>
                <DrawerLink label="Product" href="/#features" onClose={() => setMobileNavOpen(false)} />
                <DrawerLink label="Pricing" href="/pricing" onClose={() => setMobileNavOpen(false)} />
                <DrawerLink label="API" href="#" onClose={() => setMobileNavOpen(false)} />
                <div style={{ marginTop: 8, marginBottom: 4, paddingLeft: 12, fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Resources
                </div>
                {RESOURCE_ITEMS.map(({ label, href }) => (
                  <DrawerLink key={label} label={label} href={href} onClose={() => setMobileNavOpen(false)} sub />
                ))}
              </nav>

              {/* Drawer footer: CTAs */}
              <div className="shrink-0 px-4 py-4 flex flex-col" style={{ gap: 8, borderTop: `1px solid ${C.bgCard}` }}>
                <DrawerAuthActions onClose={() => setMobileNavOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}

function DrawerLink({ label, href, onClose, sub = false }: { label: string; href: string; onClose: () => void; sub?: boolean }) {
  return (
    <a
      href={href}
      onClick={onClose}
      data-testid="drawer-nav-item"
      className="min-h-11 flex items-center px-3"
      style={{
        fontFamily: fonts.body,
        fontSize: sub ? 14 : 16,
        fontWeight: sub ? 400 : 500,
        color: sub ? C.textMuted : C.text,
        textDecoration: "none",
      }}
    >
      {label}
    </a>
  );
}

function DrawerAuthActions({ onClose }: { onClose: () => void }) {
  const { user, loading } = useAuth();
  const { openAuthModal } = useAuthModal();

  if (loading) {
    return <div style={{ height: 44 }} aria-hidden />;
  }

  if (user) {
    return (
      <a
        href="/app"
        onClick={onClose}
        className="min-h-11 flex items-center justify-center"
        style={{
          fontFamily: fonts.body, fontSize: 15, fontWeight: 500,
          color: "#FFFFFF", backgroundColor: C.accent,
          textDecoration: "none",
        }}
      >
        Go to app
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => { onClose(); openAuthModal(); }}
        className="min-h-11 flex items-center justify-center"
        style={{
          fontFamily: fonts.body, fontSize: 15, fontWeight: 500,
          color: C.text, background: "transparent",
          border: `1px solid ${C.bgCard}`, cursor: "pointer",
        }}
      >
        Log in
      </button>
      <button
        onClick={() => { onClose(); openAuthModal("/app"); }}
        className="min-h-11 flex items-center justify-center"
        style={{
          fontFamily: fonts.body, fontSize: 15, fontWeight: 500,
          color: "#FFFFFF", backgroundColor: C.accent,
          border: "none", cursor: "pointer",
        }}
      >
        Get Started
      </button>
    </>
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
