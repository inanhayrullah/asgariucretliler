import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_NAME,SITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: { default: SITE_NAME + " — Çalışma hayatının gündemi", template: "%s | " + SITE_NAME },
  description: "Asgari ücret, çalışma hayatı ve işçi hakları hakkında haberler ve genel bilgilendirme.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  alternates: { types: { "application/rss+xml": "/feed.xml" }, ...(SITE_URL?{canonical:"/"}:{}) },
  openGraph: { type: "website", locale: "tr_TR", siteName: SITE_NAME },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f6f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
