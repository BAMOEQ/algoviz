import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AlgoViz — Data Structure & Algorithm Visualizer",
  description:
    "Step through data structures and algorithms with a fully steppable, inspectable visual trace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <div className="fixed right-3 bottom-3 z-50">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
