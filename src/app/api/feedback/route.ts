import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hasValidFeedbackScreenshotSignature, isValidFeedback, isValidFeedbackScreenshot } from "@/lib/feedback-input.mjs";
import { getSupabasePublicKey } from "@/lib/supabase/config";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form verileri okunamadı." }, { status: 400 });
  }

  const body = {
    type: formData.get("type"),
    message: formData.get("message"),
  };
  if (!isValidFeedback(body)) {
    return NextResponse.json({ error: "Mesaj türünü seçin ve 5–2000 karakter arasında bir mesaj yazın." }, { status: 400 });
  }

  const screenshotEntry = formData.get("screenshot");
  if (screenshotEntry !== null && (typeof screenshotEntry === "string" || !isValidFeedbackScreenshot(screenshotEntry))) {
    return NextResponse.json({ error: "Ekran görüntüsü PNG, JPG veya WebP olmalı ve 5 MB'ı geçmemelidir." }, { status: 400 });
  }
  if (screenshotEntry instanceof File && !(await hasValidFeedbackScreenshotSignature(screenshotEntry))) {
    return NextResponse.json({ error: "Dosya içeriği seçilen görsel türüyle eşleşmiyor." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = getSupabasePublicKey();
  if (!url || !publicKey) {
    return NextResponse.json({ error: "Mesaj gönderimi şu anda yapılandırılmamış." }, { status: 503 });
  }

  const supabase = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let screenshotPath: string | null = null;
  try {
    if (screenshotEntry instanceof File) {
      screenshotPath = `${randomUUID()}.${screenshotEntry.type === "image/png" ? "png" : screenshotEntry.type === "image/webp" ? "webp" : "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from("feedback-screenshots")
        .upload(screenshotPath, screenshotEntry, { contentType: screenshotEntry.type, upsert: false });
      if (uploadError) {
        console.error("Feedback screenshot upload failed:", uploadError.message);
        return NextResponse.json({ error: "Ekran görüntüsü yüklenemedi. Lütfen tekrar deneyin." }, { status: 503 });
      }
    }

    const { error } = await supabase.from("feedback_messages").insert({
      type: body.type,
      message: body.message.trim(),
      screenshot_path: screenshotPath,
    });
    if (error) {
      console.error("Feedback submission failed:", error.code);
      if (screenshotPath) console.error("Feedback screenshot may be orphaned:", screenshotPath);
      return NextResponse.json({ error: "Mesaj kaydedilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 503 });
    }
  } catch (submissionError) {
    console.error("Feedback submission connection failed:", submissionError);
    if (screenshotPath) console.error("Feedback screenshot may be orphaned:", screenshotPath);
    return NextResponse.json({ error: "Mesaj kaydedilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
