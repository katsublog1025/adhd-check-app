import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "業務チェック管理",
  description: "ADHD傾向のあるスタッフ向け業務チェック管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
