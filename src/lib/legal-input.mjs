export function isValidLegalMessage(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 1000;
}
