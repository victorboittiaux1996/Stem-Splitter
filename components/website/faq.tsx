"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { themes, fonts } from "./theme";

const faqItems = [
  {
    question: "What audio formats are supported?",
    answer:
      "MP3, WAV, FLAC, OGG, M4A, AAC, and WebM. Files up to 50MB. You can also paste a YouTube or SoundCloud URL.",
  },
  {
    question: "How long does separation take?",
    answer:
      "Most tracks process in under 40 seconds on our H100 GPU cluster. Batch uploads are processed sequentially with real-time progress tracking.",
  },
  {
    question: "What AI models power the separation?",
    answer:
      "We use state-of-the-art open-source models: MelBand RoFormer for vocals isolation and BS-RoFormer for instrument separation. These are the best publicly available models as of 2026.",
  },
  {
    question: "Is my audio private?",
    answer:
      "Yes. All uploaded files and generated stems are automatically deleted after 24 hours. We don't use your audio for training or any other purpose.",
  },
  {
    question: "Can I use the stems commercially?",
    answer:
      "That depends on your rights to the original audio. 44Stems is a tool — you're responsible for ensuring you have the rights to use the source material and its derivatives.",
  },
  {
    question: "What's the difference between 2, 4, and 6 stems?",
    answer:
      "2 stems: vocals + instrumental. 4 stems: vocals, drums, bass, other. 6 stems: vocals, drums, bass, guitar, piano, other. More stems = more creative control.",
  },
];

export function FAQ() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle SSR hydration
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";
  const theme = isDark ? themes.dark : themes.light;

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      style={{
        backgroundColor: theme.bg,
        padding: "100px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontFamily: fonts.heading,
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: theme.textMuted,
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          Help
        </div>

        {/* Section title */}
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: "36px",
            fontWeight: 700,
            color: theme.text,
            textAlign: "center",
            marginBottom: "48px",
            margin: "0 0 48px 0",
          }}
        >
          Common questions
        </h2>

        {/* FAQ items */}
        <div>
          {faqItems.map((item, index) => (
            <div
              key={index}
              style={{
                borderBottom: `1px solid ${theme.textMuted}22`,
              }}
            >
              {/* Question button */}
              <button
                onClick={() => toggleItem(index)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontFamily: fonts.body,
                  fontSize: "16px",
                  fontWeight: 500,
                  color: theme.text,
                  padding: "20px 0",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget).style.color = theme.accent;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget).style.color = theme.text;
                }}
              >
                <span>{item.question}</span>
                {/* Toggle icon */}
                <span
                  style={{
                    fontSize: "20px",
                    color: theme.textMuted,
                    minWidth: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.2s ease",
                    transform:
                      openIndex === index ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>

              {/* Answer */}
              {openIndex === index && (
                <div
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "14px",
                    color: theme.textSecondary,
                    lineHeight: "1.6",
                    paddingBottom: "20px",
                  }}
                >
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
