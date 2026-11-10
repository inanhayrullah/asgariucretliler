import Link from "next/link";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import menuStyles from "./game-menu.module.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mini oyunlar",
  description: "Çalışma arasında kısa bir refleks ve zihin molası.",
};

export default function Games() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">KISA BİR MOLA</span>
          <h1>Mini oyunlar</h1>
          <p>Basit, reklamsız oyunlar. Skor sadece bu cihazda saklanır.</p>
        </header>
        <section aria-labelledby="runner-heading" className="runner-promo">
          <h2 className="section-title" id="runner-heading">Super Hayro</h2>
          <p>Çevrimdışı platform oyununda altınları topla, çukurları aş ve bayrağa ulaş.</p>
          <Link className="cta" href="/oyunlar/mesai-kosusu">Oyunu aç →</Link>
        </section>
        <section aria-labelledby="quick-games-heading" className={menuStyles.section}>
          <h2 className="section-title" id="quick-games-heading">Kısa oyunlar</h2>
          <div className={menuStyles.grid}>
            <article className={menuStyles.card}>
              <span className="eyebrow">15 SANİYELİK MOLA</span>
              <h3>Refleks molası</h3>
              <p>Hedefe olabildiğince hızlı dokun ve kendi rekorunu kır.</p>
              <Link className="cta" href="/oyunlar/refleks">Refleks oyununu oyna →</Link>
            </article>
            <article className={menuStyles.card}>
              <span className="eyebrow">ZİHİN EGZERSİZİ</span>
              <h3>Hızlı hesap</h3>
              <p>Kısa işlem sorularını çöz, doğru cevaplarla serini uzat.</p>
              <Link className="cta" href="/oyunlar/hizli-hesap">Hızlı hesap oyna →</Link>
            </article>
          </div>
        </section>
        <section aria-labelledby="cards-heading" className={menuStyles.section}>
          <h2 className="section-title" id="cards-heading">Kart oyunları ve tarot</h2>
          <div className={menuStyles.grid}>
            <article className={menuStyles.card}><span className="eyebrow">KLASİK KART OYUNU</span><h3>Solitaire</h3><p>Kartları sırayla diz, aslardan başlayarak dört temeli tamamla.</p><Link className="cta" href="/oyunlar/solitaire">Solitaire oyna →</Link></article>
            <article className={menuStyles.card}><span className="eyebrow">TEK TÜRLÜ ÖRÜMCEK</span><h3>Spider Solitaire</h3><p>On sütundaki kartları kraldan asa doğru sıralayıp desteleri tamamla.</p><Link className="cta" href="/oyunlar/spider-solitaire">Spider Solitaire oyna →</Link></article>
            <article className={menuStyles.card}><span className="eyebrow">EĞLENCE AMAÇLI</span><h3>Tarot falı</h3><p>Geçmiş, bugün ve olasılıklar için çevrimdışı üç kart açılımı yap.</p><Link className="cta" href="/oyunlar/tarot-fali">Tarot açılımı yap →</Link></article>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
