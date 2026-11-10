import test from "node:test";
import assert from "node:assert/strict";
import { slugifyTurkish } from "../src/lib/slugify.mjs";
import { isValidLegalMessage } from "../src/lib/legal-input.mjs";
import { getLocalLegalAnswer } from "../src/lib/legal-local.mjs";
import { isValidFeedback, isValidFeedbackScreenshot, hasValidFeedbackScreenshotSignature, MAX_FEEDBACK_SCREENSHOT_BYTES } from "../src/lib/feedback-input.mjs";

test("Turkish slugs normalize diacritics and punctuation", () => {
  assert.equal(slugifyTurkish("  İşçi Hakları & Ücret  "), "isci-haklari-ucret");
});

test("slug generation is stable for equivalent titles", () => {
  assert.equal(slugifyTurkish("Çalışma hayatı"), slugifyTurkish("calisma-hayati"));
});

test("assistant input accepts bounded non-empty strings", () => {
  assert.equal(isValidLegalMessage("Fazla çalışma hakkında bilgi"), true);
  assert.equal(isValidLegalMessage("  "), false);
  assert.equal(isValidLegalMessage("a".repeat(1001)), false);
  assert.equal(isValidLegalMessage({ message: "x" }), false);
});

test("feedback accepts only supported types and bounded non-empty messages", () => {
  assert.equal(isValidFeedback({ type: "complaint", message: "Bir düzeltme önerim var." }), true);
  assert.equal(isValidFeedback({ type: "suggestion", message: "Yeni bir özellik eklenebilir." }), true);
  assert.equal(isValidFeedback({ type: "other", message: "Bir mesaj" }), false);
  assert.equal(isValidFeedback({ type: "complaint", message: "  " }), false);
  assert.equal(isValidFeedback({ type: "complaint", message: "a".repeat(2001) }), false);
});

test("feedback screenshots accept only supported image types within the size limit", () => {
  assert.equal(isValidFeedbackScreenshot({ type: "image/png", size: 128 }), true);
  assert.equal(isValidFeedbackScreenshot({ type: "image/jpeg", size: MAX_FEEDBACK_SCREENSHOT_BYTES }), true);
  assert.equal(isValidFeedbackScreenshot({ type: "image/gif", size: 128 }), false);
  assert.equal(isValidFeedbackScreenshot({ type: "image/png", size: MAX_FEEDBACK_SCREENSHOT_BYTES + 1 }), false);
  assert.equal(isValidFeedbackScreenshot({ type: "image/png", size: 0 }), false);
});

test("feedback screenshot signature matches the declared image type", async () => {
  const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" });
  const fakePng = new Blob(["not an image"], { type: "image/png" });
  assert.equal(await hasValidFeedbackScreenshotSignature(png), true);
  assert.equal(await hasValidFeedbackScreenshotSignature(fakePng), false);
});

test("free local assistant answers common employment-law topics without an API", () => {
  assert.match(getLocalLegalAnswer("Fazla mesai ücreti nasıl hesaplanır?"), /yüzde 50/i);
  assert.match(getLocalLegalAnswer("Yıllık izin hakkım nedir?"), /en az bir yıl/i);
  assert.match(getLocalLegalAnswer("6.5 yıl çalıştım, kıdem tazminatım ne olur?"), /brüt ücret/i);
});

test("free local assistant does not confuse months of service with years", () => {
  const answer = getLocalLegalAnswer("6.5 ay çalıştım, maaşım 35.000 TL; kıdem ve ihbar tazminatım ne olur?");
  assert.match(answer, /en az bir yıllık çalışma koşulunu karşılamaz/i);
  assert.match(answer, /4 haftadır/i);
  assert.doesNotMatch(answer, /8 hafta olarak/i);
});

test("free local assistant clearly limits unsupported questions", () => {
  assert.match(getLocalLegalAnswer("Bana özel dilekçe yaz"), /yalnızca kıdem\/ihbar tazminatı/i);
});
