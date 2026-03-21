"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

// Import all locale files
import zhTW from "./locales/zh-TW.json";
import zhCN from "./locales/zh-CN.json";
import en from "./locales/en.json";
import th from "./locales/th.json";
import vi from "./locales/vi.json";
import ko from "./locales/ko.json";
import ja from "./locales/ja.json";

const locales = {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  en,
  th,
  vi,
  ko,
  ja,
};

export const LANGUAGES = [
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
];

const DEFAULT_LANG = "zh-TW";
const STORAGE_KEY = "la1_lang";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && locales[saved]) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((code) => {
    if (locales[code]) {
      setLangState(code);
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  // t() function: look up nested keys like "nav.home"
  const t = useCallback(
    (key, fallback) => {
      const keys = key.split(".");
      let value = locales[lang];
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          // Fallback to zh-TW
          let fb = locales[DEFAULT_LANG];
          for (const fk of keys) {
            if (fb && typeof fb === "object" && fk in fb) {
              fb = fb[fk];
            } else {
              return fallback || key;
            }
          }
          return typeof fb === "string" ? fb : fallback || key;
        }
      }
      return typeof value === "string" ? value : fallback || key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
