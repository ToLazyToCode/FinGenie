import en, { type TranslationDictionary, type TranslationKey } from './resources/en';
import enExtra from './resources/en-extra';
import vi from './resources/vi';
import viExtra from './resources/vi-extra';

export type Language = 'en' | 'vi';
export type TranslationPrimitive = string | number | boolean | null | undefined;
export type TranslationParams = Record<string, TranslationPrimitive>;

const DEFAULT_LANGUAGE: Language = 'en';

const resources: Record<Language, TranslationDictionary> = {
  en: {
    ...en,
    ...enExtra,
  },
  vi: {
    ...vi,
    ...viExtra,
  },
};

export const getTranslations = (language: Language): TranslationDictionary => {
  return resources[language] ?? resources[DEFAULT_LANGUAGE];
};

const interpolate = (template: string, params?: TranslationParams): string => {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_match, token: string) => {
    const value = params[token];
    return value == null ? '' : String(value);
  });
};

export const translate = (
  language: Language,
  key: TranslationKey | string,
  params?: TranslationParams
): string => {
  const dictionary = getTranslations(language);
  if (key in dictionary) {
    return interpolate(dictionary[key as TranslationKey], params);
  }

  const fallbackDictionary = resources[DEFAULT_LANGUAGE];
  if (key in fallbackDictionary) {
    return interpolate(fallbackDictionary[key as TranslationKey], params);
  }

  return String(key);
};

export const resolveLocale = (language: Language): string => {
  return language === 'vi' ? 'vi-VN' : 'en-US';
};

export type { TranslationDictionary, TranslationKey };
