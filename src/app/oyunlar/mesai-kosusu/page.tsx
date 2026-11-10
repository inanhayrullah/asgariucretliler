import type { Metadata } from "next";
import { Footer, AdSlot } from "@/components/site";
import { Header } from "@/components/header";
import { PlatformGame } from "@/components/platform-game";

export const metadata: Metadata = {
  title: "Super Hayro",
  description: "İnternet bağlantısı gerektirmeyen mini platform oyunu.",
};

export default function MesaiKosusuPage() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">MİNİ OYUN · ÇEVRİMDIŞI</span>
          <h1>Super Hayro</h1>
          <p>Altınları topla, çukurları aş ve bayrağa ulaş. Oyun ve görseller bu sayfada gömülüdür; internet bağlantısı istemez.</p>
        </header>
        <PlatformGame />
        <div className="homead"><AdSlot label="Oyun alanından ayrı reklam alanı" /></div>
      </main>
      <Footer />
    </>
  );
}
