import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "朔知 · 一份说人话的性格测评",
  description: "基于 BFI-2 中文版的中学生性格测评 — 不贴标签，不谄媚，每段解读都挂在你的具体得分上。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
