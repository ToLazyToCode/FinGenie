import { useCallback } from 'react';
import { languageStore } from '../store/languageStore';
import {
  resolveLocale,
  translate,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from './index';

export type { Language, TranslationKey, TranslationParams };

export type TranslateFn = (
  key: TranslationKey | string,
  params?: TranslationParams
) => string;

export const useI18n = () => {
  const language = languageStore((state) => state.language);
  const setLanguage = languageStore((state) => state.setLanguage);

  const t = useCallback<TranslateFn>(
    (key, params) => translate(language, key, params),
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    locale: resolveLocale(language),
  };
};
