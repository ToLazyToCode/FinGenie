import { useCallback, useEffect, useState } from 'react';
import { NativeModules } from 'react-native';
import {
  checkGoogleConfigured,
  completeGoogleLinking,
  createInitialGoogleState,
  extractGoogleErrorMessage,
  getGoogleClientIds,
  getGoogleConfigurationError,
  getGooglePlatform,
  handleGoogleIdToken,
  type GoogleAuthResult,
  type GoogleAuthState,
  type UseGoogleAuthReturn,
} from './useGoogleAuth.shared';

const GOOGLE_CLIENT_IDS = getGoogleClientIds();
const warnedMessages = new Set<string>();

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');
type GoogleSigninRuntime = Pick<GoogleSigninModule, 'GoogleSignin' | 'statusCodes'>;

let googleSigninRuntimePromise: Promise<GoogleSigninRuntime | null> | null = null;

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

async function getGoogleSigninRuntime(): Promise<GoogleSigninRuntime | null> {
  if (!googleSigninRuntimePromise) {
    googleSigninRuntimePromise = Promise.resolve().then(() => {
      if (!NativeModules.RNGoogleSignin) {
        warnOnce(
          'google-signin-native-missing',
          '[GoogleAuth] Native Google Sign-In module is missing from this Android binary. Rebuild the app or dev client to enable Google login.'
        );
        return null;
      }

      try {
        const module = require('@react-native-google-signin/google-signin') as GoogleSigninModule;
        if (!module?.GoogleSignin || !module?.statusCodes) {
          return null;
        }
        return {
          GoogleSignin: module.GoogleSignin,
          statusCodes: module.statusCodes,
        };
      } catch (error) {
        warnOnce(
          'google-signin-native-missing',
          '[GoogleAuth] Native Google Sign-In module is missing from this Android binary. Rebuild the app or dev client to enable Google login.',
          error
        );
        return null;
      }
    });
  }

  return googleSigninRuntimePromise;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const platform = getGooglePlatform();
  const [state, setState] = useState<GoogleAuthState>(() => createInitialGoogleState(platform));

  useEffect(() => {
    const isConfigured = checkGoogleConfigured(platform);
    setState((prev) => ({ ...prev, isConfigured }));
  }, [platform]);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    if (platform !== 'android') {
      const error = getGoogleConfigurationError(platform);
      return {
        success: false,
        error,
      };
    }

    if (!checkGoogleConfigured(platform)) {
      const error = getGoogleConfigurationError(platform);
      setState((prev) => ({ ...prev, error, isConfigured: false }));
      return {
        success: false,
        error,
      };
    }

    try {
      const runtime = await getGoogleSigninRuntime();
      if (!runtime) {
        const errorMessage = extractGoogleErrorMessage(
          new Error('RNGoogleSignin native module is unavailable.'),
          platform
        );
        setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
        return {
          success: false,
          error: errorMessage,
        };
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      runtime.GoogleSignin.configure({
        webClientId: GOOGLE_CLIENT_IDS.web,
        offlineAccess: false,
      });

      await runtime.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await runtime.GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return {
          success: false,
          error: 'CANCELLED',
        };
      }

      const idToken = response.data.idToken ?? (await runtime.GoogleSignin.getTokens()).idToken;
      if (!idToken) {
        throw new Error('Google ID token is missing from the sign-in response.');
      }

      return handleGoogleIdToken(idToken, platform, setState);
    } catch (error) {
      let errorMessage = extractGoogleErrorMessage(error, platform);
      const code = (error as { code?: string }).code;

      const runtime = await getGoogleSigninRuntime();
      const statusCodes = runtime?.statusCodes;

      if (code === statusCodes?.SIGN_IN_CANCELLED) {
        errorMessage = 'CANCELLED';
      } else if (code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = extractGoogleErrorMessage(
          new Error('Google Play Services is not available on this device.'),
          platform
        );
      } else if (code === statusCodes?.IN_PROGRESS) {
        errorMessage = extractGoogleErrorMessage(
          new Error('Google Sign-In is already in progress.'),
          platform
        );
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage === 'CANCELLED' ? null : errorMessage,
      }));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [platform]);

  const completeAccountLinkingHandler = useCallback(
    (password: string) => completeGoogleLinking(state.linkToken, password, setState),
    [state.linkToken]
  );

  const cancelAccountLinking = useCallback(() => {
    setState((prev) => ({
      ...prev,
      linkingRequired: false,
      linkToken: null,
      linkEmail: null,
      existingProviders: [],
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signInWithGoogle,
    completeAccountLinking: completeAccountLinkingHandler,
    cancelAccountLinking,
    clearError,
  };
}

export type { GoogleAuthResult, GoogleAuthState, UseGoogleAuthReturn } from './useGoogleAuth.shared';
export default useGoogleAuth;
