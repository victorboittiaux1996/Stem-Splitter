import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "44Stems — AI-Powered Stem Separation",
  description:
    "Split any song into vocals, drums, bass, and instruments. Studio-grade AI stem separation powered by the best open-source models.",
  openGraph: {
    title: "44Stems — AI-Powered Stem Separation",
    description:
      "Split any song into vocals, drums, bass, and instruments. Studio-grade quality.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Atkinson+Hyperlegible+Next:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
