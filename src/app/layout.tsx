import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['vietnamese', 'latin'],
  display: 'swap',
  variable: '--font-sans',
});

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
    <html lang="en" style={{ fontSize: '17px' }}>
      <body className={cn("antialiased font-sans", beVietnamPro.variable)}>
        {children}
      </body>
    </html>
  );
}
