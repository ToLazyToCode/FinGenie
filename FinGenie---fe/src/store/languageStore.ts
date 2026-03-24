import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Language } from '../i18n';

export type { Language };

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * Persisted language preference store.
 * Translation resources are owned by src/i18n.
 */
export const languageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'fingenie-language',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ language: state.language }),
    }
  )
);
