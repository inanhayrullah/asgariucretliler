const TRENDS_URL = "https://trends.google.com/trending/rss?geo=TR";
export type FeaturedNewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  trendTopic: string;
};

const WORK_TERMS = /(işçi|çalışan|çalışma|maaş|ücret|asgari|emekli|emeklilik|işsizlik|tazminat|mesai|sgk|işkur|memur|sendika|iş kanunu|iş ilanı|işe alım|izin|kıdem|ihbar|bordro|zam|ikramiye|toplu sözleşme|enflasyon)/i;

function readTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return "";
  return match[1]
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(Number(value)))
    .replace(/&#x([\da-f]+);/gi, (_, value: string) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function getFeed(url: string, trendTopic = ""): Promise<FeaturedNewsItem[]> {
  const response = await fetch(url, {
    headers: { "User-Agent": "MesaiGundem/1.0 (news headlines with source links)" },
    next: { revalidate: 600 },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`News feed returned ${response.status}`);
  const xml = await response.text();
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
    .map(([, item]) => {
      const title = readTag(item, "title");
      const url = readTag(item, "link");
      const source = readTag(item, "source") || "Haber kaynağı";
      const publishedAt = readTag(item, "pubDate");
      try {
        if (new URL(url).protocol !== "https:") return null;
      } catch {
        return null;
      }
      return title ? { title, url, source, publishedAt, trendTopic } : null;
    })
    .filter((item): item is FeaturedNewsItem => item !== null);
}

export async function GET() {
  try {
    const trendsResponse = await fetch(TRENDS_URL, {
      headers: { "User-Agent": "MesaiGundem/1.0 (public Google Trends RSS)" },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!trendsResponse.ok) throw new Error(`Trends feed returned ${trendsResponse.status}`);

    const trendsXml = await trendsResponse.text();
    const topics = [...trendsXml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
      .map(([, item]) => readTag(item, "title"))
      .filter((topic) => topic && WORK_TERMS.test(topic))
      .slice(0, 7);

    const trendNews = (await Promise.all(topics.map(async (topic) => {
      const query = `"${topic}" (çalışan OR işçi OR çalışma OR maaş OR ücret)`;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR%3Atr`;
      try {
        return (await getFeed(url, topic)).slice(0, 2);
      } catch {
        return [];
      }
    }))).flat();

    const uniqueItems = [...new Map(trendNews.map((item) => [item.url, item])).values()].slice(0, 7);
    return Response.json(
      { items: uniqueItems, topics },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch {
    return Response.json(
      { items: [], topics: [], error: "Güncel arama ve haber akışına şu anda ulaşılamıyor." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
