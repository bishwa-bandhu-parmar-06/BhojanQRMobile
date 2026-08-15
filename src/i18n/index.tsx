import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useSelector } from "react-redux";

import en, { type Translations } from "./en";
import hi from "./hi";

// Only the locales that have real translations are listed. A picker offering
// Bengali and Marathi that then renders English is worse than not offering
// them: it looks broken rather than unfinished. Adding one is this file plus
// a new locale module - nothing else in the app changes.
export const LANGUAGES = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

const CATALOGUES: Record<string, any> = { en, hi };

// A dotted key into the English catalogue - "settings.alertSound". Typing it
// loosely as string keeps call sites readable; the fallback below means a
// typo degrades to showing the key rather than crashing a live dashboard.
type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const lookup = (catalogue: any, key: string): string | undefined => {
  const value = key.split(".").reduce((node, part) => node?.[part], catalogue);
  return typeof value === "string" ? value : undefined;
};

const I18nContext = createContext<{ t: TranslateFn; language: string }>({
  t: (key) => key,
  language: "en",
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const language = useSelector((state: any) => state.preferences?.language) || "en";

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      // English is the fallback chain's end, so a key a translator has not
      // reached yet shows correct English rather than "settings.alertSound".
      const raw = lookup(CATALOGUES[language], key) ?? lookup(en, key) ?? key;

      if (!vars) return raw;
      return Object.keys(vars).reduce(
        (out, name) => out.replace(new RegExp(`\\{${name}\\}`, "g"), String(vars[name])),
        raw,
      );
    },
    [language],
  );

  const value = useMemo(() => ({ t, language }), [t, language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => useContext(I18nContext);

export type { Translations };
