import type { Dispatch, SetStateAction } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { ApiError } from '../api/client';
import { authApi, getDeviceId } from '../api/modules/auth.api';
import { translate } from '../i18n';
import { authStore } from '../store/authStore';
import { languageStore } from '../store/languageStore';

export type GooglePlatform = 'android' | 'ios' | 'web';

export interface GoogleAuthState {
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  linkingRequired: boolean;
  linkToken: string | null;
  linkEmail: string | null;
  existingProviders: string[];
}

export interface GoogleAuthResult {
  success: boolean;
  error?: string;
  user?: {
    accountId: number;
    email: string;
    fullName: string;
  };
  linkingRequired?: boolean;
  linkEmail?: string;
  existingProviders?: string[];
}

export interface UseGoogleAuthReturn extends GoogleAuthState {
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  completeAccountLinking: (password: string) => Promise<GoogleAuthResult>;
  cancelAccountLinking: () => void;
  clearError: () => void;
}

const GOOGLE_CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '',
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '',
} as const;

const warnedMessages = new Set<string>();

export type GoogleStateSetter = Dispatch<SetStateAction<GoogleAuthState>>;

function warnOnce(key: string, message: string) {
  if (warnedMessages.has(key)) {
    return;
  }
  warnedMessages.add(key);
  console.warn(message);
}

function tr(key: Parameters<typeof translate>[1]): string {
  const language = languageStore.getState().language;
  return translate(language, key);
}

export function getGooglePlatform(): GooglePlatform {
  if (Platform.OS === 'android') {
    return 'android';
  }
  if (Platform.OS === 'ios') {
    return 'ios';
  }
  return 'web';
}

export function getGoogleClientIds() {
  return GOOGLE_CLIENT_IDS;
}

export function isValidGoogleClientId(value?: string | null): boolean {
  return Boolean(value && value.includes('.apps.googleusercontent.com'));
}

export function isGoogleRuntimeSupported(platform = getGooglePlatform()): boolean {
  if (platform === 'ios') {
    return false;
  }

  if (platform === 'android') {
    return Constants.appOwnership !== 'expo';
  }

  return true;
}

export function checkGoogleConfigured(platform = getGooglePlatform()): boolean {
  if (!isGoogleRuntimeSupported(platform)) {
    return false;
  }

  if (platform === 'web') {
    return isValidGoogleClientId(GOOGLE_CLIENT_IDS.web);
  }

  if (platform === 'android') {
    return isValidGoogleClientId(GOOGLE_CLIENT_IDS.web) && isValidGoogleClientId(GOOGLE_CLIENT_IDS.android);
  }

  return isValidGoogleClientId(GOOGLE_CLIENT_IDS.web) && isValidGoogleClientId(GOOGLE_CLIENT_IDS.ios);
}

export function getGoogleConfigurationError(platform = getGooglePlatform()): string {
  if (platform === 'ios') {
    return tr('auth.login.googleUnsupportedPlatform');
  }

  if (platform === 'android' && Constants.appOwnership === 'expo') {
    return tr('auth.login.googleNativeUnavailable');
  }

  if (platform === 'android') {
    return tr('auth.login.googleAndroidNotConfigured');
  }

  return tr('auth.login.googleWebNotConfigured');
}

export function createInitialGoogleState(platform = getGooglePlatform()): GoogleAuthState {
  return {
    isLoading: false,
    error: null,
    isConfigured: checkGoogleConfigured(platform),
    linkingRequired: false,
    linkToken: null,
    linkEmail: null,
    existingProviders: [],
  };
}

export function isGoogleCancelledError(message?: string | null): boolean {
  return message === tr('auth.login.googleCancelled');
}

function persistGoogleAuthSuccess(response: {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  accountId?: number;
  email?: string;
  fullName?: string;
}): GoogleAuthResult {
  const { setTokens, setUser } = authStore.getState();

  setTokens(
    response.accessToken!,
    response.refreshToken!,
    Date.now() + (response.expiresIn || 86400000)
  );

  setUser({
    accountId: response.accountId!,
    email: response.email!,
    fullName: response.fullName!,
  });

  return {
    success: true,
    user: {
      accountId: response.accountId!,
      email: response.email!,
      fullName: response.fullName!,
    },
  };
}

export async function handleGoogleIdToken(
  idToken: string,
  platform: GooglePlatform,
  setState: GoogleStateSetter
): Promise<GoogleAuthResult> {
  try {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const deviceId = await getDeviceId();
    const apiResponse = await authApi.loginWithGoogle({
      idToken,
      platform,
      deviceId,
    });

    const googleAuthResponse = apiResponse.data;

    if (googleAuthResponse.code === 'ACCOUNT_LINK_REQUIRED') {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        linkingRequired: true,
        linkToken: googleAuthResponse.linkToken || null,
        linkEmail: googleAuthResponse.email || null,
        existingProviders: googleAuthResponse.existingProviders || [],
      }));

      return {
        success: false,
        linkingRequired: true,
        linkEmail: googleAuthResponse.email,
        existingProviders: googleAuthResponse.existingProviders,
      };
    }

    if (googleAuthResponse.accessToken && googleAuthResponse.refreshToken) {
      const result = persistGoogleAuthSuccess(googleAuthResponse);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        linkingRequired: false,
        linkToken: null,
        linkEmail: null,
        existingProviders: [],
      }));

      return result;
    }

    throw new Error(tr('auth.login.googleInvalidServerResponse'));
  } catch (error) {
    const errorMessage = extractGoogleErrorMessage(error, platform);
    setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function completeGoogleLinking(
  linkToken: string | null,
  password: string,
  setState: GoogleStateSetter
): Promise<GoogleAuthResult> {
  if (!linkToken) {
    return {
      success: false,
      error: tr('auth.login.googleLinkMissing'),
    };
  }

  try {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const deviceId = await getDeviceId();
    const apiResponse = await authApi.completeLinking({
      linkToken,
      password,
      deviceId,
    });

    const googleAuthResponse = apiResponse.data;

    if (googleAuthResponse.code === 'SUCCESS' && googleAuthResponse.accessToken && googleAuthResponse.refreshToken) {
      const result = persistGoogleAuthSuccess(googleAuthResponse);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
        linkingRequired: false,
        linkToken: null,
        linkEmail: null,
        existingProviders: [],
      }));

      return result;
    }

    throw new Error(tr('auth.login.googleLinkFailed'));
  } catch (error) {
    const errorMessage = extractGoogleErrorMessage(error, getGooglePlatform());
    setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export function extractGoogleErrorMessage(error: unknown, platform = getGooglePlatform()): string {
  if (typeof error === 'string') {
    return error;
  }

  const apiError = error as ApiError & {
    response?: { data?: { message?: string; code?: string } };
    code?: string;
  };

  const rawMessage = apiError.response?.data?.message || apiError.message;

  if (apiError.isNetworkError || apiError.code === 'ERR_NETWORK') {
    return tr('auth.login.networkUnavailable');
  }

  if (apiError.status === 503) {
    return tr('auth.login.googleServiceUnavailable');
  }

  if ((apiError.status ?? 0) >= 500) {
    return tr('auth.login.backendUnavailable');
  }

  if (apiError.status === 401) {
    return rawMessage || tr('auth.login.googleRejected');
  }

  if (/sign.?in.*cancel/i.test(rawMessage || '')) {
    return tr('auth.login.googleCancelled');
  }

  if (/play services/i.test(rawMessage || '')) {
    return tr('auth.login.googlePlayServicesUnavailable');
  }

  if (/native module|RNGoogleSignin|ExpoPushTokenManager|require native module/i.test(rawMessage || '')) {
    if (platform === 'android') {
      warnOnce(
        'google-native-runtime',
        '[GoogleAuth] Native Google Sign-In module is unavailable. Android Google login requires a development build or production build.'
      );
    }
    return tr('auth.login.googleNativeUnavailable');
  }

  return rawMessage || tr('auth.login.googleFailedMessage');
}
