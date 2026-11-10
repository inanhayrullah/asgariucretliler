import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { connection } from "next/server";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Şikayet ve öneriler",
  robots: { index: false, follow: false },
};

type FeedbackRow = {
  id: string;
  type: "complaint" | "suggestion";
  message: string;
  created_at: string;
  screenshot_path: string | null;
};

async function FeedbackList() {
  await connection();
  if (!isSupabaseConfigured()) {
    return <div className="notice">Supabase ayarları yapılandırılmamış.</div>;
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <section className="adminbox">
        <h2>Oturum gerekli</h2>
        <p>Geri bildirimleri görmek için yetkili bir editör hesabıyla giriş yapın.</p>
        <Link className="cta" href="/admin/login">Yönetici girişi →</Link>
      </section>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["admin", "editor"].includes(profile.role)) {
    return <div className="notice">Bu hesapta geri bildirimleri görüntüleme yetkisi yok.</div>;
  }

  const { data, error } = await supabase
    .from("feedback_messages")
    .select("id,type,message,created_at,screenshot_path")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Admin feedback query failed:", error.code);
    return <div className="notice">Geri bildirimler yüklenemedi. Supabase tablo ve erişim ayarlarını kontrol edin.</div>;
  }

  const feedback = (data ?? []) as FeedbackRow[];
  const withScreenshots = await Promise.all(feedback.map(async (item) => {
    if (!item.screenshot_path) return { ...item, screenshotUrl: null };
    const { data: signedImage, error: signedUrlError } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(item.screenshot_path, 3600);
    if (signedUrlError) {
      console.error("Admin feedback screenshot signing failed:", signedUrlError.message);
      return { ...item, screenshotUrl: null };
    }
    return { ...item, screenshotUrl: signedImage.signedUrl };
  }));

  return (
    <>
      <div className="adminbar">
        <span>{user.email} · {profile.role}</span>
        <Link className="textbutton" href="/admin">Yönetim paneline dön</Link>
      </div>
      {withScreenshots.length ? (
        <div className="feedback-admin-list">
          {withScreenshots.map((item) => (
            <article className="feedback-admin-card" key={item.id}>
              <div className="feedback-admin-meta">
                <span className={`tag ${item.type === "complaint" ? "feedback-admin-complaint" : "feedback-admin-suggestion"}`}>
                  {item.type === "complaint" ? "Şikayet" : "Öneri"}
                </span>
                <time dateTime={item.created_at}>
                  {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(item.created_at))}
                </time>
              </div>
              <p className="feedback-admin-message">{item.message}</p>
              {item.screenshot_path && (
                item.screenshotUrl ? (
                  <a href={item.screenshotUrl} target="_blank" rel="noopener noreferrer">
                    <Image className="feedback-admin-image" src={item.screenshotUrl} width={1200} height={900} unoptimized alt={`${item.type === "complaint" ? "Şikayet" : "Öneri"} ekindeki ekran görüntüsü`} />
                  </a>
                ) : (
                  <p className="notice">Ekran görüntüsü yüklenemedi. Bir saat içinde yeniden yükleyip sayfayı yenileyin.</p>
                )
              )}
            </article>
          ))}
        </div>
      ) : (
        <section className="adminbox"><p>Henüz şikayet veya öneri gönderilmedi.</p></section>
      )}
    </>
  );
}

export default function AdminFeedbackPage() {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">YÖNETİM</span>
          <h1>Şikayet ve öneriler</h1>
          <p>Son 100 geri bildirim; ekli görseller özel erişim bağlantısıyla görüntülenir.</p>
        </header>
        <Suspense fallback={<div className="empty">Geri bildirimler yükleniyor…</div>}>
          <FeedbackList />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
