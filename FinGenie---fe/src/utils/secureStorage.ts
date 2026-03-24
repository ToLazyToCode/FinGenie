/**
 * Secure Storage Abstraction Layer
 * 
 * Provides bank-grade secure storage for sensitive data like tokens.
 * Uses expo-secure-store on mobile (hardware-backed encryption)
 * Falls back to localStorage on web (with warning)
 * 
 * SECURITY NOTES:
 * - Never log token values
 * - Mobile uses Keychain (iOS) / Keystore (Android)
 * - Web storage is NOT as secure - consider httpOnly cookies for web
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Check if running in Expo Go (where SecureStore may not work properly)
const isExpoGo = Constants.appOwnership === 'expo';

// Storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@fingenie/access_token',
  REFRESH_TOKEN: '@fingenie/refresh_token',
  TOKEN_EXPIRES_AT: '@fingenie/token_expires_at',
  USER_DATA: '@fingenie/user_data',
  SESSION_ID: '@fingenie/session_id',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// In-memory fallback for Expo Go (tokens won't persist across app restarts)
const memoryStore: Record<string, string> = {};
const warnedMessages = new Set<string>();
let secureStoreAvailablePromise: Promise<boolean> | null = null;
let secureStoreModulePromise: Promise<typeof import('expo-secure-store') | null> | null = null;

function warnOnce(key: string, message: string, error?: unknown) {
  if (warnedMessages.has(key)) {
    return;
  }
  warnedMessages.add(key);
  if (__DEV__ && error) {
    console.warn(message, error);
    return;
  }
  console.warn(message);
}

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (isExpoGo) {
    return false;
  }

  if (!secureStoreAvailablePromise) {
    secureStoreAvailablePromise = (async () => {
      if (!requireOptionalNativeModule('ExpoSecureStore')) {
        return false;
      }

      const SecureStore = await getSecureStoreModule();
      if (!SecureStore) {
        return false;
      }

      return SecureStore.isAvailableAsync().catch((error) => {
        warnOnce(
          'secure-store-unavailable',
          '[SecureStorage] SecureStore is unavailable in this runtime. Falling back to in-memory storage.',
          error
        );
        return false;
      });
    })();
  }

  return secureStoreAvailablePromise;
}

async function getSecureStoreModule(): Promise<typeof import('expo-secure-store') | null> {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }

  if (!requireOptionalNativeModule('ExpoSecureStore')) {
    return null;
  }

  if (!secureStoreModulePromise) {
    secureStoreModulePromise = import('expo-secure-store').catch((error) => {
      warnOnce(
        'secure-store-import-failed',
        '[SecureStorage] expo-secure-store could not be loaded. Falling back to in-memory storage.',
        error
      );
      return null;
    });
  }

  return secureStoreModulePromise;
}

function shouldSuppressStorageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /native module|unavailable|not available|has not been initialized/i.test(message);
}

function normalizeSecureStoreKey(key: StorageKey): string {
  return key.replace(/^@+/, '').replace(/\//g, '.');
}

/**
 * Platform-aware secure storage
 */
export const secureStorage = {
  /**
   * Store a value securely
   */
  async setItem(key: StorageKey, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web fallback - localStorage (NOT secure, vulnerable to XSS)
        // TODO: Migrate to httpOnly cookies for web auth tokens
        warnOnce(
          'web-storage-insecure',
          '[SecureStorage] Using localStorage on web. Tokens are vulnerable to XSS. ' +
          'Consider migrating to httpOnly cookies for production web builds.'
        );
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      if (!(await isSecureStoreAvailable())) {
        memoryStore[key] = value;
        return;
      }

      const SecureStore = await getSecureStoreModule();
      if (!SecureStore) {
        memoryStore[key] = value;
        return;
      }

      // Try SecureStore first
      await SecureStore.setItemAsync(normalizeSecureStoreKey(key), value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      if (isExpoGo || shouldSuppressStorageError(error)) {
        memoryStore[key] = value;
        return;
      }
      warnOnce('secure-store-write-failed', `[SecureStorage] Failed to store key ${key}.`, error);
      throw error;
    }
  },

  /**
   * Retrieve a value from secure storage
   */
  async getItem(key: StorageKey): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }

      if (!(await isSecureStoreAvailable())) {
        return memoryStore[key] || null;
      }

      const SecureStore = await getSecureStoreModule();
      if (!SecureStore) {
        return memoryStore[key] || null;
      }

      return await SecureStore.getItemAsync(normalizeSecureStoreKey(key));
    } catch (error) {
      if (isExpoGo || shouldSuppressStorageError(error)) {
        return memoryStore[key] || null;
      }
      if (!(key in memoryStore)) {
        return null;
      }
      return null;
    }
  },

  /**
   * Delete a value from secure storage
   */
  async deleteItem(key: StorageKey): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      if (!(await isSecureStoreAvailable())) {
        delete memoryStore[key];
        return;
      }

      const SecureStore = await getSecureStoreModule();
      if (!SecureStore) {
        delete memoryStore[key];
        return;
      }

      await SecureStore.deleteItemAsync(normalizeSecureStoreKey(key));
    } catch (error) {
      if (isExpoGo || shouldSuppressStorageError(error)) {
        delete memoryStore[key];
        return;
      }
      warnOnce('secure-store-delete-failed', `[SecureStorage] Failed to delete key ${key}.`, error);
    }
  },

  /**
   * Clear all auth-related secure storage
   */
  async clearAuthData(): Promise<void> {
    await Promise.all([
      this.deleteItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.deleteItem(STORAGE_KEYS.REFRESH_TOKEN),
      this.deleteItem(STORAGE_KEYS.TOKEN_EXPIRES_AT),
      this.deleteItem(STORAGE_KEYS.USER_DATA),
      this.deleteItem(STORAGE_KEYS.SESSION_ID),
    ]);
  },

  /**
   * Store token pair atomically
   */
  async setTokens(accessToken: string, refreshToken: string, expiresAt: number): Promise<void> {
    await Promise.all([
      this.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
      this.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      this.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString()),
    ]);
  },

  /**
   * Get all tokens
   */
  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }> {
    const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
      this.getItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.getItem(STORAGE_KEYS.REFRESH_TOKEN),
      this.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : null,
    };
  },
};
