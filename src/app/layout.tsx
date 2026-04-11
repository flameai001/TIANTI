import type { Metadata } from "next";
import { Cormorant_Garamond, Noto_Sans_SC } from "next/font/google";
import "@/app/globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"]
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "TIANTI",
  description: "面向 cosplay 与国风圈层的公开达人展示与活动信息站。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
