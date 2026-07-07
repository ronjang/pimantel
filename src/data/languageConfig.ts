export type GameLanguage = "de" | "en";

export const LANGUAGE_STORAGE_KEY = "pimantel-language";

export function getStoredLanguage(): GameLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en") return "en";
  return "de"; // German is default
}

export const LANGUAGE_LABELS: Record<GameLanguage, string> = {
  de: "🇩🇪 Deutsch",
  en: "🇬🇧 English",
};

export type LanguageConfig = {
  label: string;
  secretWordsFolder: string;
  semantleWordsFolder: string;
  wordListFile: string;
};

export const LANGUAGE_CONFIGS: Record<GameLanguage, LanguageConfig> = {
  de: {
    label: "Deutsch",
    secretWordsFolder: "secret_words_de",
    semantleWordsFolder: "semantle_words_de",
    wordListFile: "word_list_de",
  },
  en: {
    label: "English",
    secretWordsFolder: "secret_words",
    semantleWordsFolder: "semantle_words",
    wordListFile: "word_list",
  },
};
