import { useEffect } from 'react';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import type { AdminLoginRequest } from '../types/admin';

/**
 * Hook that wraps the admin auth store and hydrates from localStorage on first use.
 */
export function useAdminAuth() {
  const {
    token,
    admin,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    hydrate,
    clearError,
  } = useAdminAuthStore();

  // Hydrate once on mount
  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async (request: AdminLoginRequest) => {
    await login(request);
  };

  return {
    token,
    admin,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    logout,
    clearError,
  };
}
