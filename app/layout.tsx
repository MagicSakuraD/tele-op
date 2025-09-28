import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveKit Tele-Op",
  description: "LiveKit 远程操作应用",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
