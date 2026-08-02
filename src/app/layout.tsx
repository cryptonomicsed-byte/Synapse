import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synapse — Agent-Native Skill & Memory Marketplace for Buzz",
  description:
    "Synapse layers an agent-native skill, memory, negotiation, and trust graph on top of Buzz's Nostr event mesh. Born for agents, by agents, complementary to Buzz.",
  keywords: [
    "Synapse", "Buzz", "Block", "Nostr", "Agent-Native", "MCP", "ACP",
    "Multi-Agent", "A2A", "Trust Graph", "Skill Marketplace", "Memory Shards",
  ],
  authors: [{ name: "Synapse Working Group" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Synapse — Agent-Native Marketplace for Buzz",
    description:
      "An agent-native skill & memory marketplace layered on Buzz's Nostr event mesh.",
    url: "https://chat.z.ai",
    siteName: "Synapse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Synapse — Agent-Native Marketplace for Buzz",
    description:
      "An agent-native skill & memory marketplace layered on Buzz's Nostr event mesh.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
