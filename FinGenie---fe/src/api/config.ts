/**
 * API Configuration
 *
 * Development routing rules:
 * - Web local: localhost
 * - Android emulator: 10.0.2.2
 * - Android physical device: explicit LAN URL or Expo dev host fallback
 * - Production builds: explicit EXPO_PUBLIC_API_URL
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = '8080';
const DEFAULT_ANDROID_EMULATOR_URL = 'http://10.0.2.2:8080';
const DEFAULT_WEB_URL = 'http://localhost:8080';
const warnedMessages = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warnedMessages.has(key)) {
    return;
  }
  warnedMessages.add(key);
  console.warn(message);
}

function normalizeUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/+$/, '');
}

function parseUrl(value?: string | null): URL | null {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }
  try {
    return new URL(normalized);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname?: string | null): boolean {
  if (!hostname) {
    return false;
  }
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function isLoopbackUrl(value?: string | null): boolean {
  const parsed = parseUrl(value);
  return isLoopbackHost(parsed?.hostname);
}

function getExpoDevHost(): string | null {
  const directHost = Constants.expoConfig?.hostUri;
  if (directHost) {
    return directHost.split(':')[0] ?? null;
  }

  const manifestHost = (Constants.manifest2 as { extra?: { expoClient?: { hostUri?: string } } } | null)
    ?.extra?.expoClient?.hostUri;

  if (manifestHost) {
    return manifestHost.split(':')[0] ?? null;
  }

  return null;
}

function buildUrlFromHost(host: string, port: string): string {
  return `http://${host}:${port}`;
}

function resolveAndroidDevUrl(envUrl: string | null): string {
  const emulatorUrl =
    normalizeUrl(process.env.EXPO_PUBLIC_API_URL_ANDROID_EMULATOR) ?? DEFAULT_ANDROID_EMULATOR_URL;
  const deviceUrl = normalizeUrl(process.env.EXPO_PUBLIC_API_URL_ANDROID_DEVICE);

  if (envUrl && !isLoopbackUrl(envUrl)) {
    return envUrl;
  }

  const expoHost = getExpoDevHost();
  const configuredPort = parseUrl(envUrl)?.port || DEFAULT_PORT;
  if (deviceUrl && !isLoopbackUrl(deviceUrl)) {
    return deviceUrl;
  }

  if (expoHost && !isLoopbackHost(expoHost)) {
    warnOnce(
      'android-localhost-fallback',
      `[API Config] Android localhost override is invalid. Falling back to Expo dev host ${expoHost}:${configuredPort}. ` +
        'Set EXPO_PUBLIC_API_URL_ANDROID_DEVICE explicitly if your backend is not reachable on this LAN host.'
    );
    return buildUrlFromHost(expoHost, configuredPort);
  }

  warnOnce(
    'android-localhost-invalid',
    '[API Config] Android localhost override is invalid. Falling back to Android emulator host 10.0.2.2. ' +
      'Set EXPO_PUBLIC_API_URL_ANDROID_DEVICE to your machine LAN IP for physical-device testing.'
  );
  return emulatorUrl;
}

/**
 * Get the API base URL based on platform and environment
 */
export function getApiBaseUrl(): string {
  const envUrl = normalizeUrl(process.env.EXPO_PUBLIC_API_URL);
  const webUrl = normalizeUrl(process.env.EXPO_PUBLIC_API_URL_WEB) ?? envUrl ?? DEFAULT_WEB_URL;

  if (__DEV__) {
    if (Platform.OS === 'web') {
      return webUrl;
    }

    if (Platform.OS === 'android') {
      return resolveAndroidDevUrl(envUrl);
    }

    return envUrl ?? DEFAULT_WEB_URL;
  }

  if (!envUrl || !parseUrl(envUrl)) {
    console.error(
      '[API Config] EXPO_PUBLIC_API_URL is not configured for production build. ' +
      'Please set it in your eas.json or .env file.'
    );
    return 'https://api.fingenie.com';
  }

  return envUrl;
}

/**
 * API prefix for all endpoints
 */
export const API_PREFIX = '/api/v1';

/**
 * Get the full API URL including prefix
 */
export function getFullApiUrl(): string {
  return `${getApiBaseUrl()}${API_PREFIX}`;
}
