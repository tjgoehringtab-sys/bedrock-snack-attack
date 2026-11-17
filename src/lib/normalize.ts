/**
 * Turns an item name into a matching key so "Dr Pepper", "dr. pepper " and
 * "DR PEPPER" all land on the same shopping-list line. Simple plurals match
 * too ("Pretzel" / "Pretzels"). Brand/flavor notes live in `details`, so they
 * never block a match.
 */
export function itemKey(item: string): string {
  const words = item
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/&/g, " and ")
    .replace(/['’`.]/g, "") // Reese's -> reeses, Dr. -> dr
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  const last = words[words.length - 1];
  words[words.length - 1] = singular(last);
  return words.join(" ");
}

function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y"; // cookies -> cooky
  if (w.endsWith("ss") || w.endsWith("us") || w.endsWith("is")) return w; // Celsius, hummus
  if (w.endsWith("s")) w = w.slice(0, -1);
  if (w.endsWith("ie") && w.length > 3) w = w.slice(0, -2) + "y"; // cookie -> cooky (matches "cookies")
  return w;
}

/** Trim, collapse whitespace, strip control characters. */
export function cleanText(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}
