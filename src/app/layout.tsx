import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DemoProvider } from "@/lib/demo/demo-provider";
import "./globals.css";

// The theme in globals.css resolves `font-sans` from `--font-sans`, so the
// loaded font has to be published under exactly that variable name.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caboodle — Organizations & Access",
  description:
    "Prototype of the Caboodle organization, membership, role and permission model.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DemoProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster position="bottom-center" />
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
