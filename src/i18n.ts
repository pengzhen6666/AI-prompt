import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import zh from "./locales/zh.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: en.common,
        home: en.home,
        auth: en.auth,
        blog: en.blog,
        profile: en.profile,
      },
      zh: {
        common: zh.common,
        home: zh.home,
        auth: zh.auth,
        blog: zh.blog,
        profile: zh.profile,
      },
    },
    lng: "zh",
    fallbackLng: "zh",

    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
