"use client";

import { Logo } from "./logo";
import { fonts } from "./theme";

const T = {
  bg: "#FFFFFF",
  text: "#000000",
  textSecondary: "#555555",
  textMuted: "#8C8C8C",
  border: "#E5E5E5",
};

export function Footer() {
  const sections = [
    {
      title: "Product",
      links: ["Stem Splitter", "Batch Processing", "API", "Pricing"],
    },
    {
      title: "Resources",
      links: ["Documentation", "Blog", "Changelog", "Status"],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Contact"],
    },
    {
      title: "Legal",
      links: ["Privacy", "Terms", "Cookies"],
    },
  ];

  return (
    <footer
      style={{
        backgroundColor: T.bg,
        borderTop: `1px solid ${T.border}`,
      }}
    >
      {/* Main content */}
      <div
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingTop: "80px",
          paddingLeft: "40px",
          paddingRight: "40px",
          paddingBottom: "40px",
        }}
      >
        {/* Grid columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "40px",
            marginBottom: "40px",
            textAlign: "center",
          }}
        >
          {sections.map((section) => (
            <div key={section.title}>
              {/* Section title */}
              <h3
                style={{
                  fontFamily: fonts.heading,
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: T.textMuted,
                  margin: "0 0 16px 0",
                }}
              >
                {section.title}
              </h3>
              {/* Links */}
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                }}
              >
                {section.links.map((link) => (
                  <li key={link} style={{ marginBottom: "12px" }}>
                    <a
                      href="#"
                      style={{
                        fontFamily: fonts.body,
                        fontSize: "14px",
                        color: T.textSecondary,
                        textDecoration: "none",
                        transition: "color 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLAnchorElement).style.color =
                          T.text;
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLAnchorElement).style.color =
                          T.textSecondary;
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            paddingTop: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <Logo size="sm" color={T.textMuted} monochrome />
            <span
              style={{
                fontFamily: fonts.body,
                fontSize: "14px",
                color: T.textMuted,
              }}
            >
              Copyright © 2026 44Stems. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
