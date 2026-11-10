import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import { KlondikeGame } from "@/components/card-games";

export const metadata: Metadata = {
  title: "Solitaire",
  description: "Klasik, çevrimdışı Solitaire kart oyunu.",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">MİNİ OYUN · ÇEVRİMDIŞI</span>
          <h1>Solitaire</h1>
          <p>Klasik, çevrimdışı Solitaire kart oyunu. Oyun tamamen bu sayfada çalışır, internet bağlantısı gerektirmez.</p>
          <p><Link href="/oyunlar">← Tüm oyunlara dön</Link></p>
        </header>
        <KlondikeGame />
      </main>
      <Footer />
    </>
  );
}
