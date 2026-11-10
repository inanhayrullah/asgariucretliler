import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/site";
import { WageCalculator } from "@/components/wage-calculator";

export const metadata: Metadata = {
  title: "Ücret hesaplama aracı · 2026",
  description: "Aylık ücretini netten brüte veya brütten nete hesapla.",
};

export default function WageCalculatorPage() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">2026 ÜCRET HESAPLAMA</span>
          <h1>Net ve brüt ücretini hesapla</h1>
          <p>Asgari ücret dahil, gireceğin herhangi bir aylık tutarı hesapla. Netten brüte veya brütten nete seçimini yapıp ücret miktarını gir.</p>
        </header>
        <WageCalculator />
      </main>
      <Footer />
    </>
  );
}
