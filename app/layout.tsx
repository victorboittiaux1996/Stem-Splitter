import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { QueueProvider } from "@/contexts/queue-context";
import { AuthModalProvider } from "@/contexts/auth-modal-context";
import { Toaster } from "@/components/ui/sonner";
import { futuraPT, aeonik } from "./fonts";
import "./globals.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F6" },
    { media: "(prefers-color-scheme: dark)", color: "#0F0F0F" },
  ],
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
      className={`h-full ${futuraPT.variable} ${aeonik.variable}`}
    >
      <body className="h-full antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthModalProvider>
            <QueueProvider>
              {children}
            </QueueProvider>
          </AuthModalProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
