import Link from "next/link";
import {Header} from "@/components/header";import {Footer,AdSlot} from "@/components/site";
import {FeaturedNews,TrendingWorkStories} from "@/components/featured-news";
import {getPublishedArticles} from "@/lib/news-data";

export default async function Home(){
  const articles = await getPublishedArticles();
  return <><Header/><main><div className="wrap ticker"><b>GÜNDEM</b><span>◆</span><Link href="/haberler">Çalışma hayatında öne çıkan gelişmeler ve çalışanların merak ettikleri</Link></div>
    <section className="wrap hero"><div className="sectionhead"><h2>Günün öne çıkanları</h2><Link href="/haberler">TÜM HABERLER →</Link></div>
      <FeaturedNews initialArticles={articles}/>
    </section><div className="wrap homead"><AdSlot/></div>
    <section className="wrap contentsection"><div className="sectionhead"><h2>Çalışma hayatından</h2><Link href="/haberler">TÜMÜNÜ GÖR →</Link></div><TrendingWorkStories initialArticles={articles}/></section>
    <section className="wrap splitsection"><div className="textpanel"><span className="eyebrow">BİLGİLENDİRME</span><h2>İş hukuku hakkında aklındakiler</h2><p>Genel bilgi sunan asistanımızı deneyin. Yanıtlar hukuki danışmanlık yerine geçmez.</p><Link className="cta" href="/is-hukuku-asistani">Asistana soru sor →</Link></div><div className="textpanel" style={{background:"#e5e9d7"}}><span className="eyebrow">MOLA ZAMANI</span><h2>Bir dakikalık refleks molası</h2><p>Kısa oyunda hedefi yakala, kişisel rekorunu cihazında sakla.</p><Link className="cta" href="/oyunlar">Oyuna git →</Link></div></section>
  </main><Footer/></>
}
