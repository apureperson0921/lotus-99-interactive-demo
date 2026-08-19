import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "凌晨三点：静默纽约",
  description: "Lotus 99 · 章节式悬疑群聊体验",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
