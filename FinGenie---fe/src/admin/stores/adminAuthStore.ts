import { create } from 'zustand';
import type { AdminUser, AdminLoginRequest, AdminLoginResponse } from '../types/admin';
import axios from 'axios';

const ADMIN_BASE_URL = 'http://localhost:8080/api/v1/admin';
const TOKEN_KEY = 'admin_access_token';
const ADMIN_KEY = 'admin_user';

interface AdminAuthStore {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (request: AdminLoginRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthStore>((set, get) => ({
  token: null,
  admin: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post<AdminLoginResponse>(
        `${ADMIN_BASE_URL}/login`,
        request,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const admin: AdminUser = {
        adminId: data.adminId,
        email: data.email,
        name: data.name,
        role: data.role,
      };

      // Persist to localStorage (admin panel is web-only)
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));

      set({
        token: data.accessToken,
        admin,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err)
          ? (err.response?.data?.message as string | undefined) ?? 'Login failed'
          : 'An unexpected error occurred';
      set({ isLoading: false, error: message, isAuthenticated: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    set({ token: null, admin: null, isAuthenticated: false, error: null });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const adminStr = localStorage.getItem(ADMIN_KEY);
      if (token && adminStr) {
        const admin: AdminUser = JSON.parse(adminStr) as AdminUser;
        set({ token, admin, isAuthenticated: true });
      }
    } catch {
      // Corrupted storage – start fresh
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ADMIN_KEY);
    }
  },

  clearError: () => set({ error: null }),
}));
