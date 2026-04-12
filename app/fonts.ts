import localFont from "next/font/local";

export const futuraPT = localFont({
  src: [
    { path: "./fonts/futura-pt-book.ttf", weight: "400", style: "normal" },
    { path: "./fonts/futura-pt-medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/futura-pt-demi.ttf", weight: "600", style: "normal" },
    { path: "./fonts/futura-pt-bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-futura",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const aeonik = localFont({
  src: "./fonts/aeonik.ttf",
  variable: "--font-aeonik",
  display: "swap",
  preload: false,
  adjustFontFallback: "Arial",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
