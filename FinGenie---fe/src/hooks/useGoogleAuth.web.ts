import { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import {
  checkGoogleConfigured,
  completeGoogleLinking,
  createInitialGoogleState,
  extractGoogleErrorMessage,
  getGoogleClientIds,
  getGoogleConfigurationError,
  handleGoogleIdToken,
  type GoogleAuthResult,
  type GoogleAuthState,
  type UseGoogleAuthReturn,
} from './useGoogleAuth.shared';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = getGoogleClientIds();

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [state, setState] = useState<GoogleAuthState>(() => createInitialGoogleState('web'));
  const isConfigured = checkGoogleConfigured('web');

  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CLIENT_IDS.web,
    redirectUri: makeRedirectUri(),
  });

  useEffect(() => {
    setState((prev) => ({ ...prev, isConfigured }));
  }, [isConfigured]);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    if (!isConfigured || !request) {
      const error = getGoogleConfigurationError('web');
      setState((prev) => ({ ...prev, error, isConfigured }));
      return {
        success: false,
        error,
      };
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const result = await promptAsync();
      if (result.type === 'dismiss' || result.type === 'cancel') {
        setState((prev) => ({ ...prev, isLoading: false, error: null }));
        return {
          success: false,
          error: 'CANCELLED',
        };
      }

      if (result.type === 'success' && result.params.id_token) {
        return handleGoogleIdToken(result.params.id_token, 'web', setState);
      }

      throw new Error('Google sign-in could not be completed.');
    } catch (error) {
      const errorMessage = extractGoogleErrorMessage(error, 'web');
      setState((prev) => ({ ...prev, isLoading: false, error: errorMessage }));
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [isConfigured, request, promptAsync]);

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
