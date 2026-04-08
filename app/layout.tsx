import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { QueueProvider } from "@/contexts/queue-context";
import { Toaster } from "@/components/ui/sonner";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full"
    >
      <body className="h-full antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueueProvider>
            {children}
          </QueueProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
