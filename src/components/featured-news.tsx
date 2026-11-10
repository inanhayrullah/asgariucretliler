"use client";

import { useEffect, useState } from "react";
import { LatestList, Photo, StoryCard } from "@/components/cards";
import type { Article } from "@/lib/news";
import type { FeaturedNewsItem } from "@/app/api/featured-news/route";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(date);
}

export function FeaturedNews({ initialArticles }: { initialArticles: Article[] }) {
  const [items, setItems] = useState<FeaturedNewsItem[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/featured-news", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: FeaturedNewsItem[] };
        if (active) setItems(data.items ?? []);
      } catch {
        // Do not replace search-led stories with unrelated headlines.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15 * 60 * 1000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!items.length) {
    const lead = initialArticles[0];
    if (!lead) return null;
    return (
      <div className="leadgrid">
        <a className="feature" href={`/haber/${lead.slug}`}>
          <Photo id={lead.image} imageUrl={lead.imageUrl} alt={lead.title} />
          <div className="featuretext"><span className="eyebrow">{lead.category}</span><h1>{lead.title}</h1><p>{lead.excerpt}</p><div className="byline">{lead.date} · {lead.read} okuma</div></div>
        </a>
        <div className="latestpanel"><h2>Son haberler</h2><LatestList items={initialArticles.slice(1, 5)} /></div>
      </div>
    );
  }

  const lead = items[0];
  const latest = items.slice(1, 4);
  return (
    <div className="leadgrid">
      <a className="feature live-feature" href={lead.url} target="_blank" rel="noopener noreferrer">
        <div className="featuretext">
          <span className="eyebrow">GÜNÜN GÜNDEMİ · {lead.trendTopic ? `GOOGLE TRENDS: ${lead.trendTopic}` : lead.source}</span>
          <h1>{lead.title}</h1>
          <p>Haberin ayrıntılarını kaynağında okuyun.</p>
          <div className="byline">{formatDate(lead.publishedAt)} · Kaynağa git ↗</div>
        </div>
      </a>
      <div className="latestpanel">
        <h2>Güncel haberler</h2>
        <div className="latestlist">
          {latest.map((item, index) => (
            <a className="latestitem" href={item.url} target="_blank" rel="noopener noreferrer" key={`${item.url}-${index}`}>
              <span className="latestnum">{String(index + 1).padStart(2, "0")}</span>
              <span><small>{item.trendTopic ? `Google Trends: ${item.trendTopic} · ${item.source}` : item.source}</small><b>{item.title}</b><em>{formatDate(item.publishedAt)} · Kaynağa git ↗</em></span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TrendingWorkStories({ initialArticles }: { initialArticles: Article[] }) {
  const [items, setItems] = useState<FeaturedNewsItem[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/featured-news", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { items?: FeaturedNewsItem[] };
        if (active) setItems(data.items ?? []);
      } catch {
        // Keep the section focused on topics backed by Google Trends data.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15 * 60 * 1000);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const trendingItems = items.slice(4, 7);
  if (!trendingItems.length) {
    return initialArticles.length > 1 ? (
      <div className="storygrid">{initialArticles.slice(1, 4).map((article) => <StoryCard key={article.slug} article={article} />)}</div>
    ) : null;
  }

  return (
    <div className="storygrid">
      {trendingItems.map((item) => (
        <article className="story" key={item.url}>
          <a className="trendstory" href={item.url} target="_blank" rel="noopener noreferrer">
            <span className="eyebrow">Google Trends: {item.trendTopic || "Çalışma hayatı"}</span>
            <h3>{item.title}</h3>
            <div className="byline">{item.source} · {formatDate(item.publishedAt)} · Kaynağa git ↗</div>
          </a>
        </article>
      ))}
    </div>
  );
}
