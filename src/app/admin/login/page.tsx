import { Suspense } from "react";
import { connection } from "next/server";
import { Footer } from "@/components/site";
import { Header } from "@/components/header";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signIn } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yönetici girişi",
  robots: { index: false, follow: false },
};

const loginErrors: Record<string, string> = {
  bilgi: "E-posta veya parola biçimi geçersiz.",
  giris: "E-posta ya da parola yanlış olabilir. Supabase Authentication > Users bölümünde oluşturduğun kullanıcıyla aynı e-postayı kullandığını ve parolanın doğru olduğunu kontrol et.",
  yetki: "Giriş bilgileri kabul edildi ancak bu kullanıcıya yönetici yetkisi verilmemiş. profiles tablosunda kullanıcının UID'siyle role alanının admin olduğunu kontrol et.",
  profil: "Giriş başarılı, ancak uygulama Supabase profiles tablosunu okuyamıyor. Supabase SQL Editor'de profiles tablosu için okuma iznini eklemek gerekiyor.",
  yapilandirma: "Supabase bağlantı ayarları eksik. .env.local içindeki proje URL'si ve publishable key değerlerini kontrol et.",
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  await connection();
  const search = await searchParams;
  const errorCode = Array.isArray(search.error) ? search.error[0] : search.error;
  const errorMessage = errorCode ? loginErrors[errorCode] : undefined;

  return isSupabaseConfigured() ? (
    <form action={signIn} className="adminbox adminform">
      {errorMessage && <p className="notice" role="alert">{errorMessage}</p>}
      <label>E-posta<input name="email" type="email" required autoComplete="username" maxLength={254} /></label>
      <label>Parola<input name="password" type="password" required autoComplete="current-password" maxLength={256} /></label>
      <button className="cta">Giriş yap</button>
      <p className="byline">Yönetici hesapları Supabase Auth üzerinden yönetilir. Her giriş ayrıca sunucuda editör rolüyle doğrulanır.</p>
    </form>
  ) : (
    <div className="notice">Giriş servisi henüz yapılandırılmadı. Supabase ayarları eklendikten sonra yönetici oturumu açılabilir.</div>
  );
}

export default function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <>
      <Header />
      <main className="wrap">
        <header className="pagehead">
          <span className="eyebrow">YÖNETİM</span>
          <h1>Yönetici girişi</h1>
        </header>
        <Suspense fallback={<div className="empty">Giriş ekranı yükleniyor…</div>}>
          <LoginContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
