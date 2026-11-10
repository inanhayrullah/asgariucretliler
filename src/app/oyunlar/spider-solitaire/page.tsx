import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import { SpiderSolitaireGame } from "@/components/card-games";

export const metadata: Metadata = {
  title: "Spider Solitaire",
  description: "Çevrimdışı, tek tür Spider Solitaire kart oyunu.",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">MİNİ OYUN · ÇEVRİMDIŞI</span>
          <h1>Spider Solitaire</h1>
          <p>Çevrimdışı, tek tür Spider Solitaire kart oyunu. Oyun tamamen bu sayfada çalışır, internet bağlantısı gerektirmez.</p>
          <p><Link href="/oyunlar">← Tüm oyunlara dön</Link></p>
        </header>
        <SpiderSolitaireGame />
      </main>
      <Footer />
    </>
  );
}
