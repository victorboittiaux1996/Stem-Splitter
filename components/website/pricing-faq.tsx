"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fonts } from "./theme";

const F = fonts.body;

const C = {
  text: "#000000",
  textSecondary: "#555555",
  textMuted: "#8C8C8C",
  border: "#E5E5E5",
};

const FAQ_ITEMS = [
  {
    question: "How do minutes work?",
    answer:
      "Each plan includes a monthly minute allowance. When you separate a track, the audio duration is deducted from your balance — once, regardless of how many stem types you choose. A 4-minute track costs 4 minutes whether you pull 2 stems or 6.",
  },
  {
    question: "What happens to my unused minutes?",
    answer:
      "On Pro and Studio, they never reset. Unused minutes stay in your account and stack up month after month for as long as you're subscribed. Use 10 this month, 80 next month — your balance is always there. Free plan minutes reset each month.",
  },
  {
    question: "What if I cancel my subscription?",
    answer:
      "Your account stays active until the end of the billing period. Any accumulated minutes expire when the subscription ends — so if you have a large balance, use it before you cancel.",
  },
  {
    question: "What audio formats are supported?",
    answer:
      "You can upload MP3, WAV, FLAC, AIFF, OGG, M4A, and AAC. Free plan supports files up to 200 MB, paid plans up to 2 GB. Stems are delivered as WAV at full resolution on paid plans, or MP3 320kbps on the free plan. Pro and Studio users can also import from Dropbox, Google Drive, and SoundCloud.",
  },
  {
    question: "Am I charged per stem or per track?",
    answer:
      "Per track. A 4-minute song costs 4 minutes whether you extract 2, 4, or 6 stems. Most competitors charge per stem — so a 6-stem split costs 6x more. With 44Stems, stem count never affects your bill.",
  },
  {
    question: "How is this different from other stem splitters?",
    answer:
      "Most tools charge per stem type — meaning 4 stems on a 5-minute track costs 20 minutes of credit. We charge for the audio length: one pass, all stems, 5 minutes charged. On top of that, unused minutes never reset instead of expiring every month.",
  },
];

function FAQItem({ item }: { item: (typeof FAQ_ITEMS)[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 0",
          fontFamily: F,
          fontSize: 16,
          fontWeight: 500,
          color: C.text,
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {item.question}
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            fontSize: 20,
            color: "#1B10FD",
            flexShrink: 0,
            marginLeft: 16,
          }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                fontFamily: F,
                fontSize: 15,
                fontWeight: 400,
                color: C.textSecondary,
                lineHeight: 1.6,
                margin: 0,
                paddingBottom: 20,
                maxWidth: 680,
              }}
            >
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PricingFAQ() {
  return (
    <div>
      <h3
        style={{
          fontFamily: F,
          fontSize: 24,
          fontWeight: 500,
          color: C.text,
          margin: "0 0 32px",
          letterSpacing: "-0.01em",
        }}
      >
        Frequently asked questions
      </h3>
      <div>
        {FAQ_ITEMS.map((item) => (
          <FAQItem key={item.question} item={item} />
        ))}
      </div>
    </div>
  );
}
