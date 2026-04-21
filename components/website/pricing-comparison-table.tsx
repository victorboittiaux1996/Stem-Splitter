"use client";

import { Fragment, useState } from "react";
import { PLANS, type PlanId } from "@/lib/plans";
import { fonts } from "./theme";
import { RiCheckLine } from "@remixicon/react";

const F = fonts.body;

const C = {
  text: "#000000",
  textSec: "#333333",
  textMuted: "#888888",
  border: "#E5E5E5",
  borderLight: "#F0F0F0",
  accent: "#1B10FD",
};

const planOrder: PlanId[] = ["free", "pro", "studio"];

type FeatureRow = {
  label: string;
  description?: string;
  values: Record<PlanId, string | boolean>;
};

type FeatureGroup = {
  title: string;
  rows: FeatureRow[];
};

const featureGroups: FeatureGroup[] = [
  {
    title: "Processing",
    rows: [
      { label: "Minutes per month", description: "Monthly allowance added to your balance", values: { free: "10", pro: "90", studio: "250" } },
      { label: "Minutes never reset", description: "Unused minutes stack up month after month", values: { free: false, pro: true, studio: true } },
      { label: "1 min audio = 1 min charged", description: "No per-stem multiplier — all stems in a single pass", values: { free: true, pro: true, studio: true } },
      { label: "Max file size", values: { free: "200 MB", pro: "2 GB", studio: "2 GB" } },
      { label: "Stem types", description: "Number of stem outputs per separation", values: { free: "2 & 4", pro: "2, 4, 6", studio: "2, 4, 6" } },
      { label: "Priority queue", description: "Your jobs are processed before standard queue", values: { free: false, pro: false, studio: true } },
    ],
  },
  {
    title: "Export",
    rows: [
      { label: "MP3 320kbps", values: { free: true, pro: true, studio: true } },
      { label: "WAV 24-bit", description: "Lossless full-resolution stems", values: { free: false, pro: true, studio: true } },
    ],
  },
  {
    title: "Workflow",
    rows: [
      { label: "Batch processing", description: "Process multiple tracks at once", values: { free: false, pro: "Up to 5 tracks", studio: "Up to 30 tracks" } },
      { label: "SoundCloud import", description: "Paste a link, get your stems — no download needed", values: { free: false, pro: true, studio: true } },
      { label: "Dropbox import", values: { free: false, pro: true, studio: true } },
      { label: "Google Drive import", values: { free: false, pro: true, studio: true } },
      { label: "Share links", description: "Send stems to anyone with a public link", values: { free: false, pro: "3/month", studio: "10/month" } },
    ],
  },
  {
    title: "Coming soon",
    rows: [
      { label: "Multi-workspace", description: "Separate projects for bands or clients", values: { free: false, pro: false, studio: "Coming soon" } },
      { label: "Mobile app", description: "Split stems on the go", values: { free: false, pro: false, studio: "Coming soon" } },
      { label: "VST plugin", description: "Stem separation inside your DAW", values: { free: false, pro: false, studio: "Coming soon" } },
    ],
  },
];

function CellValue({ value }: { value: string | boolean }) {
  const wrapper: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  };

  if (typeof value === "boolean") {
    if (value) {
      return <span style={wrapper}><RiCheckLine size={18} color={C.accent} /></span>;
    }
    return (
      <span style={{ ...wrapper, fontFamily: F, fontSize: 16, color: "#D0D0D0" }}>
        —
      </span>
    );
  }

  if (value === "Coming soon") {
    return (
      <span style={{
        ...wrapper,
        fontFamily: F, fontSize: 11, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.06em",
        color: C.accent, backgroundColor: C.accent + "10",
        padding: "3px 10px",
      }}>
        Soon
      </span>
    );
  }

  return (
    <span style={{ ...wrapper, fontFamily: F, fontSize: 14, fontWeight: 500, color: C.text }}>
      {value}
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
    >
      <span style={{
        width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 600, color: C.textMuted, border: `1px solid ${C.border}`,
        fontFamily: F, flexShrink: 0,
      }}>
        i
      </span>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          backgroundColor: C.text, color: "#FFFFFF", padding: "8px 12px",
          fontFamily: F, fontSize: 12, fontWeight: 400, lineHeight: 1.4,
          whiteSpace: "nowrap", zIndex: 10,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function HoverRow({ children }: { children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ backgroundColor: hovered ? "#F7F7F7" : "transparent", transition: "background-color 0.15s" }}
    >
      {children}
    </tr>
  );
}

export function PricingComparisonTable() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: F, tableLayout: "fixed", borderSpacing: 0 }}>
        <colgroup>
          <col style={{ width: "34%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>

        <thead>
          <tr style={{ borderBottom: "1px solid #DCDCDC" }}>
            <th style={{
              padding: "20px 0",
              textAlign: "left",
              fontFamily: F,
              fontSize: 18,
              fontWeight: 700,
              color: C.text,
            }}>
              Features
            </th>
            {planOrder.map((planId) => (
              <th
                key={planId}
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  fontFamily: F,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.text,
                }}
              >
                {PLANS[planId].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureGroups.map((group, groupIndex) => (
            <Fragment key={group.title}>
              {/* Group header */}
              <tr>
                <td
                  style={{
                    padding: groupIndex === 0 ? "28px 0 14px" : "44px 0 14px",
                    fontFamily: F,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {group.title}
                </td>
                <td style={{ borderLeft: "1px solid #DCDCDC" }} />
                <td style={{ borderLeft: "1px solid #DCDCDC" }} />
                <td style={{ borderLeft: "1px solid #DCDCDC" }} />
              </tr>
              {/* Feature rows */}
              {group.rows.map((row) => (
                <HoverRow key={row.label}>
                  <td
                    style={{
                      padding: "16px 0",
                      fontFamily: F,
                      verticalAlign: "middle",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 400, color: C.textSec, display: "flex", alignItems: "center", gap: 6 }}>
                      {row.label}
                      {row.description && <InfoTooltip text={row.description} />}
                    </div>
                  </td>
                  {planOrder.map((planId) => (
                    <td
                      key={planId}
                      style={{
                        textAlign: "center",
                        verticalAlign: "middle",
                        padding: "16px 0",
                        borderLeft: "1px solid #DCDCDC",
                      }}
                    >
                      <CellValue value={row.values[planId]} />
                    </td>
                  ))}
                </HoverRow>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
