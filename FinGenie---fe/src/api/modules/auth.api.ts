import { apiClient } from '../client';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// ============ Auth Request Types ============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  dateOfBirth: string;
}

export interface VerifyEmailOtpRequest {
  sessionId: string;
  otp: string;
}

export interface ResendOtpRequest {
  sessionId: string;
}

export interface ForgotPasswordRequestOtpRequest {
  email: string;
}

export interface ForgotPasswordVerifyOtpRequest {
  sessionId: string;
  otp: string;
}

export interface ForgotPasswordResetRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

// ============ Google OAuth Types ============

export interface GoogleAuthRequest {
  idToken: string;
  platform?: 'android' | 'ios' | 'web';
  deviceId?: string;
}

// ============ Account Linking Types ============

export interface GoogleAuthResponse {
  // Auth tokens (only present on SUCCESS)
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  accountId?: number;
  email?: string;
  fullName?: string;
  
  // Response code: SUCCESS or ACCOUNT_LINK_REQUIRED
  code: 'SUCCESS' | 'ACCOUNT_LINK_REQUIRED';
  
  // Linking fields (only present on ACCOUNT_LINK_REQUIRED)
  linkToken?: string;
  hasPassword?: boolean;
  existingProviders?: string[];
}

export interface CompleteLinkingRequest {
  linkToken: string;
  password: string;
  deviceId?: string;
}

export interface LinkGoogleAccountRequest {
  idToken: string;
  password: string;
}

export interface UnlinkProviderRequest {
  password?: string;
}

export interface ProviderInfo {
  provider: string;
  email?: string;
  displayName?: string;
  pictureUrl?: string;
  active: boolean;
  linkedAt?: string;
}

export interface AccountLinkingResponse {
  success: boolean;
  message: string;
  linkedProviders?: ProviderInfo[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
}

// ============ Auth Response Types ============

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  // User info
  accountId: number;
  email: string;
  fullName: string;
}

export interface RegisterOtpResponse {
  sessionId: string;
  email: string;
  expiresInSeconds: number;
  message: string;
}

export interface ForgotPasswordOtpResponse {
  sessionId: string;
  email: string;
  expiresInSeconds: number;
  message: string;
}

export interface ForgotPasswordVerifyResponse {
  resetToken: string;
  expiresInSeconds: number;
  message: string;
}

// ============ Session Status Types ============

export interface SessionStatusResponse {
  valid: boolean;
  reason?: 'ACCOUNT_DISABLED' | 'SESSION_EXPIRED' | 'CONCURRENT_SESSION' | 'TOKEN_REVOKED';
}

// ============ OTP State Types ============

export interface OtpState {
  sessionId: string | null;
  email: string | null;
  expiresAt: number | null;
  isBlacklisted: boolean;
  cooldownUntil: number | null;
  attemptsRemaining: number;
}

// ============ Auth API ============

export const authApi = {
  // ===== Login/Logout =====
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  /**
   * Login or register with Google OAuth
   * @param data - Google ID token and optional platform
   * @returns Auth tokens and user info, or ACCOUNT_LINK_REQUIRED response
   */
  loginWithGoogle: (data: GoogleAuthRequest) =>
    apiClient.post<GoogleAuthResponse>('/auth/google', data),

  logout: () =>
    apiClient.post('/auth/logout'),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>('/auth/refresh/header', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),

  // ===== Session Management =====
  /**
   * Check if current session is still valid
   * Used for heartbeat and cross-device logout detedction
   */
  sessionStatus: () =>
    apiClient.get<SessionStatusResponse>('/auth/session-status'),

  // ===== Register Flow =====
  register: (data: RegisterRequest) =>
    apiClient.post<RegisterOtpResponse>('/auth/register', data),

  verifyEmailOtp: (data: VerifyEmailOtpRequest) =>
    apiClient.post<AuthResponse>('/auth/verify-email-otp', data),

  resendRegisterOtp: (data: ResendOtpRequest) =>
    apiClient.post<RegisterOtpResponse>('/auth/resend-otp', data),

  // ===== Forgot Password Flow =====
  forgotPasswordRequestOtp: (data: ForgotPasswordRequestOtpRequest) =>
    apiClient.post<ForgotPasswordOtpResponse>('/auth/forgot-password/request-otp', data),

  forgotPasswordVerifyOtp: (data: ForgotPasswordVerifyOtpRequest) =>
    apiClient.post<ForgotPasswordVerifyResponse>('/auth/forgot-password/verify-otp', data),

  forgotPasswordReset: (data: ForgotPasswordResetRequest) =>
    apiClient.post<{ message: string }>('/auth/forgot-password/reset', data),

  resendForgotPasswordOtp: (data: ResendOtpRequest) =>
    apiClient.post<ForgotPasswordOtpResponse>('/auth/forgot-password/resend-otp', data),

  // ===== Account Linking =====
  
  /**
   * Complete Google account linking after ACCOUNT_LINK_REQUIRED
   * @param data - Link token and password for verification
   * @returns Auth tokens on success
   */
  completeLinking: (data: CompleteLinkingRequest) =>
    apiClient.post<GoogleAuthResponse>('/auth/link/complete', data),

  /**
   * Link Google account to currently logged-in account
   * @param data - Google ID token and password
   * @returns Linking result with provider list
   */
  linkGoogle: (data: LinkGoogleAccountRequest) =>
    apiClient.post<AccountLinkingResponse>('/auth/link/google', data),

  /**
   * Unlink a provider from the account
   * @param provider - Provider to unlink (GOOGLE, APPLE, etc.)
   * @param data - Password for verification (if account has one)
   */
  unlinkProvider: (provider: string, data: UnlinkProviderRequest) =>
    apiClient.delete<AccountLinkingResponse>(`/auth/unlink/${provider}`, { data }),

  /**
   * Get all linked providers for current account
   */
  getLinkedProviders: () =>
    apiClient.get<ProviderInfo[]>('/auth/providers'),

  // ===== Secure Token Refresh =====
  
  /**
   * Refresh tokens with device binding (new secure endpoint)
   * @param data - Refresh token and device ID
   */
  refreshSecure: (data: RefreshTokenRequest) =>
    apiClient.post<AuthResponse>('/auth/refresh', data),
};

// ============ Helper Functions ============

/**
 * Get unique device identifier for token binding
 */
export async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || `android_${Date.now()}`;
    } else if (Platform.OS === 'ios') {
      // iOS doesn't have a persistent device ID, use installation ID
      const installId = await Application.getIosIdForVendorAsync();
      return installId || `ios_${Date.now()}`;
    }
    return `web_${Date.now()}`;
  } catch {
    return `device_${Date.now()}`;
  }
}
