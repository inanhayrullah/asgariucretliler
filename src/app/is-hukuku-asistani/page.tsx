import type {Metadata} from "next";import {Footer} from "@/components/site";import {Header} from "@/components/header";import {LegalAssistant} from "@/components/interactions";
export const metadata:Metadata={title:"Ücretsiz iş hukuku rehberi",description:"İş hukuku konularında ücretsiz, anahtar sözcük tabanlı temel bilgilendirme."};

export default function Assistant(){
  return <>
    <Header/>
    <main className="wrap">
      <header className="pagehead">
        <span className="eyebrow">ÜCRETSİZ YEREL REHBER</span>
        <h1>İş hukuku rehberi</h1>
        <p>İş sözleşmesi, ücret, izin, kıdem, işten çıkarma ve çalışma koşulları hakkında temel bilgi alın.</p>
      </header>
      <div className="notice">Bu ücretsiz araç sabit konu başlıklarına göre çalışır; yapay zekâ değildir ve özel hukuki danışmanlık sunmaz. Dava riski, hak kaybı, süre veya sözleşme uyuşmazlıklarında avukata danışın.</div>
      <LegalAssistant/>
    </main>
    <Footer/>
  </>;
}
