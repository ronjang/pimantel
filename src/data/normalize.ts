import { GameLanguage } from "./languageConfig";

/**
 * Normalizes a German word for matching:
 *  - lowercase
 *  - transliterate umlauts/ß to match the word2vec model's encoding
 *    (ü→ue, ä→ae, ö→oe, ß→ss)
 * So "Küche", "küche", and "kueche" all normalize to "kueche".
 */
export function normalizeGerman(word: string): string {
  return word
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

/**
 * Language-aware guess normalization.
 * German uses umlaut transliteration; other languages just lowercase + trim.
 */
export function normalizeGuess(word: string, language: GameLanguage): string {
  const trimmed = word.trim();
  if (language === "de") {
    return normalizeGerman(trimmed);
  }
  return trimmed.toLowerCase();
}
