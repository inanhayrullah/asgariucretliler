export function slugifyTurkish(value) {
  return value.trim().toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll("ü", "u").replaceAll("ş", "s").replaceAll("ğ", "g").replaceAll("ö", "o").replaceAll("ç", "c").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
