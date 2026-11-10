import { Footer, AdSlot } from "@/components/site";
import { Header } from "@/components/header";
import { QuickMathGame } from "@/components/quick-math-game";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hızlı hesap",
  description: "30 saniyede zihinden işlem çöz, rekorunu geliştir.",
};

export default function QuickMathPage() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">MİNİ OYUN</span>
          <h1>Hızlı hesap</h1>
          <p>30 saniyede olabildiğince çok toplama ve çıkarma işlemi çöz. Rekorun bu cihazda saklanır.</p>
        </header>
        <QuickMathGame />
        <div className="homead"><AdSlot label="Oyun alanından ayrı reklam alanı" /></div>
      </main>
      <Footer />
    </>
  );
}
