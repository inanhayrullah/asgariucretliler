import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import { TarotReading } from "@/components/card-games";

export const metadata: Metadata = {
  title: "Tarot falı",
  description: "Eğlence ve kişisel düşünme amaçlı çevrimdışı üç kart tarot açılımı.",
};

export default function Page() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">MİNİ OYUN · ÇEVRİMDIŞI</span>
          <h1>Tarot falı</h1>
          <p>Eğlence ve kişisel düşünme amaçlı çevrimdışı üç kart tarot açılımı. Oyun tamamen bu sayfada çalışır, internet bağlantısı gerektirmez.</p>
          <p><Link href="/oyunlar">← Tüm oyunlara dön</Link></p>
        </header>
        <TarotReading />
      </main>
      <Footer />
    </>
  );
}
