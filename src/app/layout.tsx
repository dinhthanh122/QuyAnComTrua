import type { Metadata, Viewport } from "next";

import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Quỹ Ăn Trưa",
  description: "Quản lý quỹ ăn trưa và chia tiền",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
