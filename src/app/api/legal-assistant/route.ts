import {NextResponse} from "next/server";
import {isValidLegalMessage} from "@/lib/legal-input.mjs";
import {getLocalLegalAnswer} from "@/lib/legal-local.mjs";

const LEGAL_SYSTEM_PROMPT = `Sen iş hukuku alanında genel bilgilendirme yapan tarafsız bir asistanısın.
- Türkçe cevap ver.
- Sadece genel bilgi sun; hukuki danışmanlık yerine geçmez.
- Kullanıcıya kısa, anlaşılır ve net açıklamalar yap.
- Özel kişisel veriler isteme.
- Konu çok spesifikse, hukuki değerlendirme için bir avukata danışmasını öner.
- Mevzuat değişebilir; bu nedenle ayrıntılı karar için güncel kaynaklara ve uzmana başvur.`;

class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function callOpenAI(apiKey:string, message:string){
  const model = process.env.AI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {role: "system", content: LEGAL_SYSTEM_PROMPT},
        {role: "user", content: message},
      ],
    }),
  });

  if (!response.ok) {
    let code: string | undefined;
    try {
      const errorBody: {error?: {code?: string; type?: string}} = await response.json();
      code = errorBody.error?.code || errorBody.error?.type;
    } catch {
      // The response can be non-JSON when an upstream proxy or network gateway fails.
    }
    throw new ProviderRequestError("OpenAI isteği başarısız.", response.status, code);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "Şu an net bir cevap üretemiyorum. Lütfen daha net bir soru sorunuz.";
}

async function callGemini(apiKey:string, message:string){
  const model = process.env.AI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      systemInstruction: {parts: [{text: LEGAL_SYSTEM_PROMPT}]},
      contents: [{parts: [{text: message}]}],
      generationConfig: {temperature: 0.4},
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini isteği başarısız: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part: {text?: string}) => part.text || "").join("\n")?.trim() || "Şu an net bir cevap üretemiyorum. Lütfen daha net bir soru sorunuz.";
}

export async function POST(request:Request){
  let body:unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({error:"Geçersiz istek."},{status:400});
  }

  if (!body || typeof body !== "object" || !("message" in body) || !isValidLegalMessage(body.message)) {
    return NextResponse.json({error:"Mesaj 1–1000 karakter arasında olmalıdır."},{status:400});
  }

  const message = String(body.message).trim();
  const provider = (process.env.AI_PROVIDER || "local").toLowerCase();
  if (provider === "local") {
    return NextResponse.json({answer:getLocalLegalAnswer(message)});
  }

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({error:"Asistan henüz yapılandırılmadı. Lütfen daha sonra tekrar deneyin."},{status:503});
  }

  try {
    const answer = provider === "google" ? await callGemini(apiKey, message) : await callOpenAI(apiKey, message);
    return NextResponse.json({answer});
  } catch (error) {
    if (error instanceof ProviderRequestError) {
      console.error("Legal assistant provider error:", {status: error.status, code: error.code});
      if (provider !== "google" && error.status === 401) {
        return NextResponse.json({error:"OpenAI API anahtarı kabul edilmedi. .env.local içindeki AI_API_KEY değerini kontrol edin."},{status:503});
      }
      if (provider !== "google" && error.status === 429) {
        const quotaError = error.code === "insufficient_quota" || error.code === "billing_hard_limit_reached";
        return NextResponse.json({error:quotaError
          ? "OpenAI API kullanım kotası veya faturalandırma limiti dolu. OpenAI Platform'daki Billing ve Usage ayarlarını kontrol edin."
          : "OpenAI istek sınırına ulaşıldı. Biraz bekleyip yeniden deneyin."},{status:503});
      }
      if (provider !== "google" && error.status === 404) {
        return NextResponse.json({error:`OpenAI modeli (${process.env.AI_MODEL || "gpt-4.1-mini"}) bulunamadı veya hesabınızda kullanılamıyor. AI_MODEL ayarını kontrol edin.`},{status:503});
      }
      if (provider !== "google" && error.status === 403) {
        return NextResponse.json({error:"OpenAI bu isteğe izin vermedi. API projesi ve model erişimi ayarlarını kontrol edin."},{status:503});
      }
      return NextResponse.json({error:`AI sağlayıcısı isteği reddetti (HTTP ${error.status}). Sunucu terminalindeki sağlayıcı hata kodunu kontrol edin.`},{status:503});
    }
    console.error("Legal assistant connection error:", error);
    return NextResponse.json({error:"AI sağlayıcısına bağlanılamadı. İnternet bağlantısını, proxy ayarlarını ve sunucu terminalini kontrol edin."},{status:503});
  }
}
