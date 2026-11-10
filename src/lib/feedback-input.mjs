const FEEDBACK_TYPES = new Set(["complaint", "suggestion"]);
const SCREENSHOT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
export const MAX_FEEDBACK_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export function isValidFeedback(value) {
  if (!value || typeof value !== "object" || !("type" in value) || !("message" in value)) return false;
  return FEEDBACK_TYPES.has(value.type)
    && typeof value.message === "string"
    && value.message.trim().length >= 5
    && value.message.trim().length <= 2000;
}

export function isValidFeedbackScreenshot(value) {
  return Boolean(value)
    && typeof value === "object"
    && "type" in value
    && SCREENSHOT_TYPES.has(value.type)
    && "size" in value
    && typeof value.size === "number"
    && value.size > 0
    && value.size <= MAX_FEEDBACK_SCREENSHOT_BYTES;
}

export async function hasValidFeedbackScreenshotSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
  }
  if (file.type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (file.type === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
