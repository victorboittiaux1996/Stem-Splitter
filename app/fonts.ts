import localFont from "next/font/local";

// Matches exactly the original @font-face setup:
// weight 400 → book, weights 500-700 → medium (no demi/bold used)
export const futuraPT = localFont({
  src: [
    { path: "./fonts/futura-pt-book.ttf", weight: "400", style: "normal" },
    { path: "./fonts/futura-pt-medium.ttf", weight: "500 700", style: "normal" },
  ],
  variable: "--font-futura",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const aeonik = localFont({
  src: "./fonts/aeonik.ttf",
  variable: "--font-aeonik",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
