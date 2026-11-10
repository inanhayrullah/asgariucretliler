"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useRef, useState, type CSSProperties, type ClipboardEvent, type FormEvent } from "react";
import { LiraCoinMark } from "@/components/lira-coin-mark";
import { categories } from "@/lib/config";
import { slugifyTurkish } from "@/lib/slugify.mjs";
import { isValidFeedbackScreenshot } from "@/lib/feedback-input.mjs";

const feedbackBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  display: "grid",
  placeItems: "center",
  overflowY: "auto",
  padding: 24,
  background: "rgba(15, 24, 20, 0.62)",
};

const feedbackModalStyle: CSSProperties = {
  width: "min(100%, 520px)",
  maxHeight: "min(90vh, 700px)",
  overflowY: "auto",
  padding: 28,
  border: "1px solid #e2e4de",
  background: "#f6f6f2",
  boxShadow: "0 18px 60px rgba(0, 0, 0, 0.28)",
  color: "#19211f",
};

const feedbackFormStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const feedbackFieldStyle: CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: 44,
  padding: "10px 12px",
  border: "1px solid #cbd1ca",
  borderRadius: 4,
  background: "#fff",
  color: "#19211f",
};

export function Header() {
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessageLength, setFeedbackMessageLength] = useState(0);
  const [feedbackScreenshot, setFeedbackScreenshot] = useState<File | null>(null);
  const [feedbackScreenshotPreview, setFeedbackScreenshotPreview] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: "idle" | "sending" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const feedbackScreenshotInput = useRef<HTMLInputElement>(null);

  function attachFeedbackScreenshot(file: File | null) {
    if (!file) return;
    if (!isValidFeedbackScreenshot(file)) {
      setFeedbackStatus({ type: "error", message: "PNG, JPG veya WebP görsel seçin. En fazla 5 MB yükleyebilirsiniz." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFeedbackScreenshot(file);
        setFeedbackScreenshotPreview(reader.result);
        setFeedbackStatus({ type: "idle", message: "" });
      }
    };
    reader.onerror = () => setFeedbackStatus({ type: "error", message: "Görsel önizlemesi açılamadı. Başka bir görsel deneyin." });
    reader.readAsDataURL(file);
  }

  function pasteFeedbackScreenshot(event: ClipboardEvent<HTMLFormElement>) {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.kind === "file" && item.type.startsWith("image/"));
    if (!imageItem) return;
    event.preventDefault();
    attachFeedbackScreenshot(imageItem.getAsFile());
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (feedbackScreenshot) formData.append("screenshot", feedbackScreenshot, feedbackScreenshot.name);
    setFeedbackStatus({ type: "sending", message: "" });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "Mesaj gönderilemedi. Lütfen tekrar deneyin.";
        setFeedbackStatus({ type: "error", message: errorMessage });
        return;
      }

      setFeedbackStatus({ type: "success", message: "Mesajınız iletildi, teşekkür ederiz." });
      form.reset();
      setFeedbackMessageLength(0);
      setFeedbackScreenshot(null);
      setFeedbackScreenshotPreview("");
    } catch {
      setFeedbackStatus({ type: "error", message: "Bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin." });
    }
  }

  return (
    <>
      <div className="topline">
        <div className="wrap topinner">
          <span>Çalışma hayatının gündemi</span>
          <Link href="/oyunlar">Kısa bir mola ver →</Link>
        </div>
      </div>
      <header className="header">
        <div className="wrap headrow">
          <Link className="brand" href="/">
            <LiraCoinMark priority />
            <span>Asgari Ücretliler<small>ÇALIŞMA HAYATININ GÜNDEMİ</small></span>
          </Link>
          <nav className={open ? "nav open" : "nav"} aria-label="Ana menü">
            {categories.map((category) => (
              <span className="nav-category-group" key={category}>
                <Link href={category === "Gündem" ? "/haberler" : "/kategori/" + slugifyTurkish(category)} onClick={() => setOpen(false)}>
                  {category}
                </Link>
              </span>
            ))}
            <Link href="/oyunlar">Oyunlar</Link>
            <Link className="legal-nav-link" href="/is-hukuku-asistani">Hukuk asistanı</Link>
            <Link className="wage-nav-link" href="/ucret-hesaplama" onClick={() => setOpen(false)}>ÜCRET HESAPLAMA ARACI · 2026</Link>
            <button
              className="feedback-nav-link"
              type="button"
              aria-haspopup="dialog"
              aria-expanded={feedbackOpen}
              onClick={() => {
                setFeedbackStatus({ type: "idle", message: "" });
                setFeedbackMessageLength(0);
                setFeedbackScreenshot(null);
                setFeedbackScreenshotPreview("");
                setFeedbackOpen(true);
                setOpen(false);
              }}
            >
              Şikayet ve öneri
            </button>
          </nav>
          <div className="headtools">
            <Link className="searchlink" href="/arama" aria-label="Ara">⌕</Link>
            <button className="menubtn" onClick={() => setOpen(!open)} aria-label="Menüyü aç">{open ? "×" : "☰"}</button>
          </div>
        </div>
      </header>
      {feedbackOpen && createPortal(
        <div
          style={feedbackBackdropStyle}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFeedbackOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setFeedbackOpen(false);
          }}
        >
          <section
            style={feedbackModalStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
              <div>
                <span className="eyebrow">GERİ BİLDİRİM</span>
                <h2 id="feedback-title" style={{ margin: "4px 0 0", font: "600 27px/1.2 Georgia, 'Times New Roman', serif" }}>Şikayet ve öneri</h2>
              </div>
              <button type="button" style={{ border: 0, background: "transparent", color: "#19211f", fontSize: 30, lineHeight: 1, cursor: "pointer" }} aria-label="Pencereyi kapat" onClick={() => setFeedbackOpen(false)}>×</button>
            </div>
            {feedbackStatus.type === "success" ? (
              <div role="status" aria-live="polite" style={{ padding: 18, border: "1px solid #b9d8bd", borderRadius: 4, background: "#edf8ee", color: "#285d4b", textAlign: "center" }}>
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 42, height: 42, margin: "0 auto 10px", borderRadius: "50%", background: "#285d4b", color: "#fff", fontSize: 24 }}>✓</span>
                <strong style={{ display: "block", fontSize: 17 }}>Mesajınız başarıyla iletildi.</strong>
                <span style={{ display: "block", marginTop: 5, fontSize: 13 }}>Görüşünüz için teşekkür ederiz.</span>
                <button className="cta" style={{ marginTop: 16, border: 0, cursor: "pointer" }} type="button" onClick={() => setFeedbackOpen(false)}>Tamam</button>
              </div>
            ) : <form style={feedbackFormStyle} onSubmit={submitFeedback} onPaste={pasteFeedbackScreenshot}>
              <label htmlFor="feedback-type" style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Mesaj türü</label>
              <select id="feedback-type" name="type" defaultValue="suggestion" style={feedbackFieldStyle}>
                <option value="suggestion">Öneri</option>
                <option value="complaint">Şikayet</option>
              </select>
              <label htmlFor="feedback-message" style={{ display: "block", marginTop: 6, fontSize: 13, fontWeight: 700 }}>Mesajınız</label>
              <textarea
                id="feedback-message"
                name="message"
                rows={5}
                minLength={5}
                maxLength={2000}
                required
                placeholder="Görüşünüzü yazın (5–2000 karakter)"
                onChange={(event) => setFeedbackMessageLength(event.currentTarget.value.length)}
                style={{ ...feedbackFieldStyle, minHeight: 140, resize: "vertical" }}
              />
              <span aria-live="polite" style={{ justifySelf: "end", marginTop: -4, color: feedbackMessageLength >= 1900 ? "#9b3525" : "#75807c", fontSize: 12 }}>
                {2000 - feedbackMessageLength} karakter kaldı
              </span>
              <div
                tabIndex={0}
                aria-label="Ekran görüntüsü yapıştırma alanı"
                style={{ display: "grid", gap: 10, marginTop: 6, padding: 14, border: "1px dashed #9aa59b", borderRadius: 4, background: "#eef1eb" }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>Ekran görüntüsü (isteğe bağlı)</span>
                <span style={{ color: "#59645e", fontSize: 12 }}>Bu alana tıklayıp Ctrl+V ile yapıştırın veya bilgisayarınızdan görsel seçin. PNG, JPG, WebP · En fazla 5 MB.</span>
                <input
                  ref={feedbackScreenshotInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Ekran görüntüsü dosyası seç"
                  style={{ display: "none" }}
                  onChange={(event) => attachFeedbackScreenshot(event.currentTarget.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="cta"
                  style={{ justifySelf: "start", margin: 0, border: 0, cursor: "pointer" }}
                  onClick={() => feedbackScreenshotInput.current?.click()}
                >
                  Görsel dosyası seç
                </button>
                {feedbackScreenshot && (
                  <div style={{ display: "grid", gap: 8 }}>
                    <Image src={feedbackScreenshotPreview} width={640} height={360} unoptimized alt="Eklenecek ekran görüntüsünün önizlemesi" style={{ display: "block", width: "auto", height: "auto", maxWidth: "100%", maxHeight: 220, objectFit: "contain", justifySelf: "start", border: "1px solid #cbd1ca", background: "#fff" }} />
                    <button
                      type="button"
                      style={{ justifySelf: "start", border: 0, padding: 0, background: "transparent", color: "#9b3525", fontSize: 12, cursor: "pointer" }}
                      onClick={() => {
                        setFeedbackScreenshot(null);
                        setFeedbackScreenshotPreview("");
                        if (feedbackScreenshotInput.current) feedbackScreenshotInput.current.value = "";
                      }}
                    >
                      Görseli kaldır
                    </button>
                  </div>
                )}
              </div>
              {feedbackStatus.message && (
                <p
                  style={{
                    margin: "4px 0",
                    padding: "10px 12px",
                    background: feedbackStatus.type === "error" ? "#fff0eb" : "#edf8ee",
                    color: feedbackStatus.type === "error" ? "#9b3525" : "#285d4b",
                    fontSize: 13,
                  }}
                  role={feedbackStatus.type === "error" ? "alert" : "status"}
                >
                  {feedbackStatus.message}
                </p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8 }}>
                <span style={{ color: "#75807c", fontSize: 11 }}>Mesajınız geri bildirim kayıtlarında saklanır.</span>
                <button className="cta" style={{ margin: 0, border: 0, cursor: "pointer" }} type="submit" disabled={feedbackStatus.type === "sending"}>
                  {feedbackStatus.type === "sending" ? "Gönderiliyor…" : "Mesajı gönder"}
                </button>
              </div>
            </form>}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
