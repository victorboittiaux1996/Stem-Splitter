"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  type LucideIcon,
  Scissors,
  FolderOpen,
  Settings2,
  ChevronsUpDown,
  Home,
  Sparkles,
  Layers,
  Type,
  BarChart3,
  Gamepad2,
} from "lucide-react";

export type SidebarView = "split" | "files" | "stats" | "games" | "settings";

export interface SidebarTheme {
  sidebarBg: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarTextActive: string;
  sidebarActiveItem: string;
  sidebarHover: string;
  sidebarLogoBg: string;
  sidebarLogoText: string;
  sidebarLabel: string;
}

interface SidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
  theme: SidebarTheme;
  fontStyle?: "aeonik" | "inter";
  onFontChange?: (font: "aeonik" | "inter") => void;
}

const PINNED_ITEMS: { id: SidebarView; icon: LucideIcon; label: string }[] = [
  { id: "split", icon: Scissors, label: "Split Audio" },
  { id: "files", icon: FolderOpen, label: "My Files" },
  { id: "stats", icon: BarChart3, label: "Statistics" },
  { id: "games", icon: Gamepad2, label: "Games" },
  { id: "settings", icon: Settings2, label: "Settings" },
];

const VERSIONS = [
  { href: "/", label: "ElevenLabs" },
  { href: "/ableton", label: "Ableton" },
];

export function Sidebar({ activeView, onViewChange, theme: t, fontStyle, onFontChange }: SidebarProps) {
  const pathname = usePathname();
  const [versionOpen, setVersionOpen] = useState(false);
  const currentVersion = VERSIONS.find(v => v.href === pathname) || VERSIONS[0];

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col" style={{ borderRight: `1px solid ${t.sidebarBorder}`, backgroundColor: t.sidebarBg }}>
      {/* Logo / Version switcher */}
      <div className="relative">
        <button onClick={() => setVersionOpen(!versionOpen)} className="flex h-[52px] w-full items-center justify-between px-[16px] transition-colors" style={{ borderBottom: `1px solid ${t.sidebarBorder}` }}>
          <div className="flex items-center gap-[10px]">
            <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px]" style={{ backgroundColor: t.sidebarLogoBg }}>
              <svg className="h-[14px] w-[14px]" style={{ color: t.sidebarLogoText }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12v2" /><path d="M6 8v8" /><path d="M10 4v16" /><path d="M14 7v10" /><path d="M18 5v14" /><path d="M22 10v4" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-[15px] font-bold tracking-[-0.02em]" style={{ color: t.sidebarTextActive }}>44Stems</span>
              <span className="text-[12px]" style={{ color: t.sidebarLabel }}>{currentVersion.label}</span>
            </div>
          </div>
          <ChevronsUpDown className="h-[14px] w-[14px]" style={{ color: t.sidebarLabel, transform: versionOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} strokeWidth={2} />
        </button>

        {/* Version dropdown */}
        {versionOpen && (
          <div className="absolute left-[8px] right-[8px] top-[52px] z-50 rounded-[8px] py-[4px] shadow-lg" style={{ backgroundColor: t.sidebarActiveItem, border: `1px solid ${t.sidebarBorder}` }}>
            <div className="px-[12px] py-[6px]">
              <span className="text-[12px] font-medium" style={{ color: t.sidebarLabel }}>Versions</span>
            </div>
            {VERSIONS.map(v => (
              <Link key={v.href} href={v.href} onClick={() => setVersionOpen(false)}
                className="flex items-center gap-[8px] px-[12px] py-[8px] rounded-[6px] mx-[4px] transition-colors"
                style={{ backgroundColor: pathname === v.href ? t.sidebarBg : undefined, color: pathname === v.href ? t.sidebarTextActive : t.sidebarText }}>
                <Layers className="h-[14px] w-[14px]" strokeWidth={1.6} />
                <span className="text-[14px] font-medium">{v.label}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <nav className="px-[8px] pt-[10px] pb-[4px]">
        <NavItem icon={Home} label="Home" active={false} onClick={() => onViewChange("split")} theme={t} />
      </nav>

      <div className="px-[16px] pt-[16px] pb-[6px]">
        <span className="text-[14px] font-medium" style={{ color: t.sidebarLabel }}>Pinned</span>
      </div>
      <nav className="flex-1 px-[8px] space-y-[1px]">
        {PINNED_ITEMS.map(({ id, icon, label }) => (
          <NavItem key={id} icon={icon} label={label} active={activeView === id} onClick={() => onViewChange(id)} theme={t} />
        ))}
      </nav>

      <div style={{ borderTop: `1px solid ${t.sidebarBorder}` }} className="px-[8px] py-[6px] space-y-[1px]">
        {fontStyle && onFontChange && (
          <button
            onClick={() => onFontChange(fontStyle === "aeonik" ? "inter" : "aeonik")}
            className="flex w-full items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[15px] transition-colors"
          >
            <Type className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} style={{ color: t.sidebarText }} />
            <span style={{ color: t.sidebarText }}>{fontStyle === "aeonik" ? "Aeonik" : "Inter"}</span>
          </button>
        )}
        <NavItem icon={Sparkles} label="Upgrade" active={false} onClick={() => {}} theme={t} />
      </div>
    </aside>
  );
}

function NavItem({ icon: Icon, label, active, onClick, theme: t }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void; theme: SidebarTheme }) {
  return (
    <button
      onClick={onClick}
      style={active ? { backgroundColor: t.sidebarActiveItem } : undefined}
      className="flex w-full items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[15px] transition-colors"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.6} style={{ color: active ? t.sidebarTextActive : t.sidebarText }} />
      <span style={{ color: active ? t.sidebarTextActive : t.sidebarText }}>{label}</span>
    </button>
  );
}
