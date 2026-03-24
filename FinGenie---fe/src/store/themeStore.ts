import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  amoledColors,
  highContrastColors,
  themeGradients,
  themeShadows,
  type ThemeColors,
  type ThemeGradient,
  type ThemeShadowSet,
} from '../theme/colors';

// Re-export colors for backward compatibility
export { lightColors, darkColors, amoledColors, highContrastColors };

/**
 * Extended theme modes including accessibility options
 * - light: Standard light theme
 * - dark: Standard dark theme  
 * - amoled: True black for OLED displays
 * - highContrast: WCAG AAA compliant high contrast
 * - system: Follow system appearance (light/dark)
 */
export type ThemeMode = 'light' | 'dark' | 'amoled' | 'highContrast' | 'system';

/**
 * Accessibility state managed alongside theme
 */
export interface AccessibilityPreferences {
  /** User has enabled reduce motion in settings */
  reduceMotion: boolean;
  /** User prefers larger text */
  largeText: boolean;
  /** Screen reader is active (detected automatically) */
  screenReaderActive: boolean;
}

/**
 * Get colors for a specific theme mode
 */
function getColorsForMode(mode: ThemeMode, isSystemDark: boolean = false): ThemeColors {
  switch (mode) {
    case 'light':
      return lightColors;
    case 'dark':
      return darkColors;
    case 'amoled':
      return amoledColors;
    case 'highContrast':
      return highContrastColors;
    case 'system':
      return isSystemDark ? darkColors : lightColors;
    default:
      return lightColors;
  }
}

/**
 * Check if a mode uses dark appearance
 */
function isDarkMode(mode: ThemeMode, isSystemDark: boolean = false): boolean {
  switch (mode) {
    case 'dark':
    case 'amoled':
    case 'highContrast':
      return true;
    case 'system':
      return isSystemDark;
    default:
      return false;
  }
}

/**
 * Get gradient set for a theme mode
 */
function getGradientsForMode(mode: ThemeMode, isSystemDark: boolean = false): ThemeGradient {
  switch (mode) {
    case 'light':
      return themeGradients.light;
    case 'dark':
      return themeGradients.dark;
    case 'amoled':
      return themeGradients.amoled;
    case 'highContrast':
      return themeGradients.highContrast;
    case 'system':
      return isSystemDark ? themeGradients.dark : themeGradients.light;
    default:
      return themeGradients.light;
  }
}

/**
 * Get shadow set for a theme mode
 */
function getShadowsForMode(mode: ThemeMode, isSystemDark: boolean = false): ThemeShadowSet {
  switch (mode) {
    case 'light':
      return themeShadows.light;
    case 'dark':
      return themeShadows.dark;
    case 'amoled':
      return themeShadows.amoled;
    case 'highContrast':
      return themeShadows.highContrast;
    case 'system':
      return isSystemDark ? themeShadows.dark : themeShadows.light;
    default:
      return themeShadows.light;
  }
}

interface ThemeState {
  // Theme state
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradient;
  shadows: ThemeShadowSet;
  
  // System state (for 'system' mode)
  isSystemDark: boolean;
  
  // Accessibility preferences
  accessibility: AccessibilityPreferences;

  // Theme actions
  setMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
  applySystemTheme: (isSystemDark: boolean) => void;
  
  // Accessibility actions
  setReduceMotion: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setScreenReaderActive: (active: boolean) => void;
}

export const themeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Initial theme state
      mode: 'light',
      isDark: false,
      colors: lightColors,
      gradients: themeGradients.light,
      shadows: themeShadows.light,
      isSystemDark: false,
      
      // Initial accessibility state
      accessibility: {
        reduceMotion: false,
        largeText: false,
        screenReaderActive: false,
      },

      setMode: (mode) => {
        const { isSystemDark } = get();
        const newIsDark = isDarkMode(mode, isSystemDark);
        const newColors = getColorsForMode(mode, isSystemDark);
        const newGradients = getGradientsForMode(mode, isSystemDark);
        const newShadows = getShadowsForMode(mode, isSystemDark);
        
        set({
          mode,
          isDark: newIsDark,
          colors: newColors,
          gradients: newGradients,
          shadows: newShadows,
        });
      },

      toggleDarkMode: () => {
        const { mode, isSystemDark } = get();
        
        // Cycle through modes: light -> dark -> amoled -> light
        let newMode: ThemeMode;
        switch (mode) {
          case 'light':
            newMode = 'dark';
            break;
          case 'dark':
            newMode = 'amoled';
            break;
          case 'amoled':
            newMode = 'light';
            break;
          case 'highContrast':
            newMode = 'light';
            break;
          case 'system':
            newMode = isSystemDark ? 'light' : 'dark';
            break;
          default:
            newMode = 'dark';
        }
        
        const newIsDark = isDarkMode(newMode, isSystemDark);
        const newColors = getColorsForMode(newMode, isSystemDark);
        const newGradients = getGradientsForMode(newMode, isSystemDark);
        const newShadows = getShadowsForMode(newMode, isSystemDark);
        
        set({
          mode: newMode,
          isDark: newIsDark,
          colors: newColors,
          gradients: newGradients,
          shadows: newShadows,
        });
      },

      applySystemTheme: (isSystemDark) => {
        const { mode } = get();
        set({ isSystemDark });
        
        if (mode === 'system') {
          const newIsDark = isDarkMode(mode, isSystemDark);
          const newColors = getColorsForMode(mode, isSystemDark);
          const newGradients = getGradientsForMode(mode, isSystemDark);
          const newShadows = getShadowsForMode(mode, isSystemDark);
          
          set({
            isDark: newIsDark,
            colors: newColors,
            gradients: newGradients,
            shadows: newShadows,
          });
        }
      },
      
      // Accessibility actions
      setReduceMotion: (enabled) => {
        set({
          accessibility: {
            ...get().accessibility,
            reduceMotion: enabled,
          },
        });
      },
      
      setLargeText: (enabled) => {
        set({
          accessibility: {
            ...get().accessibility,
            largeText: enabled,
          },
        });
      },
      
      setScreenReaderActive: (active) => {
        set({
          accessibility: {
            ...get().accessibility,
            screenReaderActive: active,
          },
        });
      },
    }),
    {
      name: 'fingenie-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        mode: state.mode,
        accessibility: state.accessibility,
      }),
    }
  )
);

/**
 * Hook for components - provides theme colors, gradients, and mode
 * 
 * Usage:
 * ```tsx
 * const { theme, mode, isDark, gradients, shadows, accessibility } = useThemeStore();
 * ```
 */
export const useThemeStore = () => {
  const mode = themeStore((state) => state.mode);
  const isDark = themeStore((state) => state.isDark);
  const colors = themeStore((state) => state.colors);
  const gradients = themeStore((state) => state.gradients);
  const shadows = themeStore((state) => state.shadows);
  const accessibility = themeStore((state) => state.accessibility);
  const setMode = themeStore((state) => state.setMode);
  const toggleDarkMode = themeStore((state) => state.toggleDarkMode);
  const applySystemTheme = themeStore((state) => state.applySystemTheme);
  const setReduceMotion = themeStore((state) => state.setReduceMotion);
  const setLargeText = themeStore((state) => state.setLargeText);

  return {
    theme: colors,
    colors,
    mode,
    isDark,
    gradients,
    shadows,
    accessibility,
    setMode,
    toggleDarkMode,
    applySystemTheme,
    setReduceMotion,
    setLargeText,
  };
};

/**
 * Hook specifically for accessibility settings
 */
export const useAccessibilitySettings = () => {
  const accessibility = themeStore((state) => state.accessibility);
  const setReduceMotion = themeStore((state) => state.setReduceMotion);
  const setLargeText = themeStore((state) => state.setLargeText);
  
  return {
    ...accessibility,
    setReduceMotion,
    setLargeText,
  };
};
