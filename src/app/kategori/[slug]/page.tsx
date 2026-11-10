import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/site";
import { StoryCard } from "@/components/cards";
import { getPublishedArticles } from "@/lib/news-data";

const names: Record<string, string> = {
  "asgari-ucret": "Asgari Ücret",
  "isci-haklari": "İşçi Hakları",
  "calisma-hayati": "Çalışma Hayatı",
  ekonomi: "Ekonomi",
  gundem: "Gündem",
};

export function generateStaticParams() {
  return Object.keys(names).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: names[slug] || "Kategori",
    description: (names[slug] || "Çalışma hayatı") + " haberleri.",
    ...(process.env.NEXT_PUBLIC_SITE_URL ? { alternates: { canonical: "/kategori/" + slug } } : {}),
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, articles] = await Promise.all([params, getPublishedArticles()]);
  const name = names[slug];
  if (!name) notFound();
  const items = articles.filter((article) => name === "Gündem" || article.category === name);

  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">KATEGORİ</span>
          <h1>{name}</h1>
          <p>Bu kategorideki gelişmeler ve bilgilendirici içerikler.</p>
        </header>
        {items.length ? <div className="storygrid">{items.map((article) => <StoryCard key={article.slug} article={article} />)}</div> : <div className="empty">Bu kategoride henüz içerik yok.</div>}
      </main>
      <Footer />
    </>
  );
}
