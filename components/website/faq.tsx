"use client";

import { useState } from "react";
import { fonts } from "./theme";

const T = {
  bg: "#FFFFFF",
  text: "#000000",
  textSecondary: "#555555",
  textMuted: "#8C8C8C",
  border: "#E5E5E5",
};

const faqItems = [
  {
    question: "What audio formats are supported?",
    answer:
      "MP3, WAV, FLAC, AIFF, OGG, M4A, and AAC. Free plan supports files up to 200 MB, paid plans up to 2 GB. Pro and Studio users can also paste a SoundCloud, Dropbox, or Google Drive link.",
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
    question: "Does input audio quality affect the results?",
    answer:
      "At 320 kbps MP3 and above, the difference with lossless (WAV, FLAC) is negligible. Below 192 kbps, compression artifacts start degrading separation quality — the models can interpret MP3 ringing and quantization noise as instrument signal. For best results, upload the highest quality source you have.",
  },
  {
    question: "Is there a file size or duration limit?",
    answer:
      "Free plan: 200 MB per file. Pro and Studio: 2 GB per file. There's no hard duration limit — the file size is the only constraint. Longer files simply use more minutes from your balance.",
  },
  {
    question: "Can I use the stems commercially?",
    answer:
      "That depends on your rights to the original audio. 44Stems is a tool — you're responsible for ensuring you have the rights to use the source material and its derivatives.",
  },
  {
    question: "What's the difference between 2, 4, and 6 stems?",
    answer:
      "2 stems: vocals + instrumental. 4 stems: vocals, drums, bass, other. 6 stems: vocals, drums, bass, guitar, piano, other. The free plan includes 2 and 4 stems. 6-stem separation is available on Pro and Studio.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      style={{
        backgroundColor: T.bg,
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
        {/* Section title */}
        <h2
          style={{
            fontFamily: fonts.heading,
            fontSize: "36px",
            fontWeight: 700,
            color: T.text,
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
                borderBottom: `1px solid ${T.border}`,
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
                  color: T.text,
                  padding: "20px 0",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget).style.color = "#000000";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget).style.color = T.text;
                }}
              >
                <span>{item.question}</span>
                {/* Toggle icon */}
                <span
                  style={{
                    fontSize: "20px",
                    color: "#1B10FD",
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
                    color: T.textSecondary,
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
