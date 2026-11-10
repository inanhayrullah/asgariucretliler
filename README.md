# Mesai — çalışma hayatı platformu

Next.js 16 App Router ile hazırlanmış Türkçe haber platformu.

> Supabase yapılandırması olmayan geliştirme modunda haber sayfaları açıkça işaretlenmiş örnek içerikleri gösterir. Production ortamında editör onaylı içerik yoksa boş durum gösterilir. Gerçek haber metinleri için doğrulanmış kaynak ve uygun yayın hakları gerekir.

## Yerelde çalıştırma

Node.js LTS 20.9 veya üzerini kurun. `.env.example` dosyasını `.env.local` olarak kopyalayıp ayarları doldurun. Supabase ve domain değişkenlerini production build öncesinde ayarlayın:

```bash
npm install
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Supabase ve yönetici kurulumu

1. Supabase projesi oluşturun. Project URL ve anon/publishable key değerlerini `.env.local` içine `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` olarak ekleyin.
2. SQL Editor'da `supabase/migrations/202610130001_initial_schema.sql` dosyasını, ardından `supabase/seed.sql` dosyasını çalıştırın.
3. Supabase Auth panelinde yönetici kullanıcısı oluşturun. Auth kullanıcısının UUID'siyle rol atayın:

```sql
insert into public.profiles (id, role, display_name)
values ('AUTH_USER_UUID', 'admin', 'Yönetici');
```

4. `/admin/login` adresinden giriş yapın. Server Actions ve RLS her işlemde rolü doğrular. Editörler taslak oluşturup düzenleyebilir ve incelemeye gönderebilir. Admin rolü yayınlama, yayından kaldırma ve planlama yapabilir.
5. Planlanan yayın için sunucuda `SUPABASE_SERVICE_ROLE_KEY` ve güçlü `PUBLISH_CRON_SECRET` ayarlayın. Harici bir zamanlayıcı dakikada bir `POST /api/cron/publish` isteğini `Authorization: Bearer <PUBLISH_CRON_SECRET>` başlığıyla çağırmalıdır. Service role anahtarını istemciye koymayın.

Migration RLS kurallarını, benzersiz slug'ları ve kilitli toplu planlı yayın fonksiyonunu kurar. Supabase projesi/kimlik bilgileri bu çalışma alanında bulunmadığından gerçek bulut bağlantısı ve yönetici oturumu doğrulanamadı.

## Yapılandırma

- `NEXT_PUBLIC_SITE_NAME`: marka adı (varsayılan Mesai).
- `NEXT_PUBLIC_SITE_URL`: üretim domain'i. Boşsa sitemap boş kalır ve RSS feed 503 döndürür.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Auth ve public haber okuma için.
- `SUPABASE_SERVICE_ROLE_KEY`, `PUBLISH_CRON_SECRET`: planlanmış haberleri çalıştıran sunucu işi için.
- `NEXT_PUBLIC_ADSENSE_CLIENT`: placeholder alanlardan başka AdSense script'i veya rıza sistemi yoktur.
- `AI_PROVIDER=local`: ücretsiz, anahtar sözcük tabanlı yerel hukuk rehberi; hiçbir AI sağlayıcısına istek göndermez.
- `AI_PROVIDER=openai` veya `google`: isteğe bağlı harici AI sağlayıcısıdır ve ücret/kota gerektirebilir. Anahtar için `AI_API_KEY` ya da sağlayıcıya özgü `OPENAI_API_KEY` / `GEMINI_API_KEY` kullanın.
- `RSS_ALLOWED_HOSTS`, `RSS_CRON_SECRET`: RSS toplama servisi henüz uygulanmadı; bu değerler kullanılmaz.

`.env*` Git dışında tutulur; `.env.example` repoya dahildir.

## Mevcut özellikler

- Responsive ana sayfa, haber listesi, kategori, haber detayı, arama ve kurumsal sayfalar.
- Supabase bağlandığında RLS ile yalnızca yayınlanmış içerikleri public sayfalarda okuma; dev ortamında demo içerik fallback'i.
- Refleks oyunu; kişisel rekor yalnızca bu cihazın localStorage alanında tutulur.
- Supabase Auth tabanlı admin oturumu, rol korumalı taslak CRUD, editör incelemesi, önizleme, admin yayınlama/yayından kaldırma/planlama.
- RLS, slug benzersizliği ve güvenli planlı yayın SQL fonksiyonu.
- Ücretsiz yerel hukuk rehberi, SEO metadata temeli, robots, sitemap, RSS ve özel 404.

## Bilinen sınırlamalar

- Supabase projesi/migration çalıştırılmadı. Gerçek veritabanı davranışını uçtan uca test etmek için proje ayarları gerekir.
- RSS kaynak yönetimi, güvenli feed fetch/SSRF kontrolleri, deduplikasyon ve editör inceleme kuyruğuna otomatik aktarım henüz yoktur.
- Yerel hukuk rehberi anahtar sözcük eşleştirmesiyle sınırlıdır; kişiye özel hukuki değerlendirme veya tam yapay zekâ yanıtı vermez. Harici AI sağlayıcıları ayrıca yapılandırılmalıdır.
- AdSense script'i ve rıza yönetimi yoktur; placeholder gelir/perf iddiası taşımaz.
- Admin'de kategori CRUD ve kapak görseli yükleme yoktur; kategoriler `seed.sql` ile başlatılır.
- Gizlilik/kullanım metinleri taslak içeriktir ve hukuki inceleme ister.
- npm audit üretim bağımlılıklarında açık bulmadı. Geliştirme araçları ağacında `eslint-config-next` bağımlılık zincirindeki `braces` için 5 yüksek seviye uyarı var. Registry'de yamalı bir sürüm olmadığından uyumsuz major downgrade uygulanmadı.

## Kontroller

```bash
npm test
npm run lint
npm run build
```
