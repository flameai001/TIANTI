import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "@/app/globals.css";
import { buildMetadata } from "@/lib/site";

const sans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

const display = Noto_Serif_SC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = buildMetadata({
  title: "TIANTI",
  description: "面向 cosplay 与国风内容场景的公开达人、活动与档案浏览站。",
  path: "/"
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${display.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
