/**
 * JWT Token Utilities
 * 
 * Safe JWT decoding without external dependencies.
 * NEVER verify signatures client-side - that's the backend's job.
 * 
 * These utilities are for:
 * - Extracting expiration time
 * - Checking if token is expired
 * - Scheduling proactive refresh
 */

interface JwtPayload {
  exp?: number;      // Expiration timestamp (seconds)
  iat?: number;      // Issued at timestamp (seconds)
  sub?: string;      // Subject (user ID)
  email?: string;    // User email
  [key: string]: unknown;
}

/**
 * Decode a JWT token payload (does NOT verify signature)
 * This is safe for client-side use to read claims
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url to base64
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Pad if necessary
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);

    // Decode - handle both browser and React Native
    let decoded: string;
    if (typeof atob === 'function') {
      decoded = atob(padded);
    } else {
      // React Native fallback
      decoded = Buffer.from(padded, 'base64').toString('utf-8');
    }

    return JSON.parse(decoded);
  } catch {
    console.warn('[TokenUtils] Failed to decode JWT payload');
    return null;
  }
}

/**
 * Get the expiration timestamp from a JWT token (in milliseconds)
 */
export function getTokenExpiration(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (payload?.exp) {
    // JWT exp is in seconds, convert to milliseconds
    return payload.exp * 1000;
  }
  return null;
}

/**
 * Check if a token is expired (with optional buffer time)
 * @param token JWT token string
 * @param bufferSeconds Extra seconds before actual expiration to consider as "expired"
 */
export function isTokenExpired(token: string, bufferSeconds: number = 0): boolean {
  const expMs = getTokenExpiration(token);
  if (!expMs) {
    // If we can't determine expiration, treat as expired (safe default)
    return true;
  }
  return Date.now() >= expMs - (bufferSeconds * 1000);
}

/**
 * Get time until token expires in milliseconds
 * Returns 0 if already expired or can't determine
 */
export function getTimeUntilExpiration(token: string): number {
  const expMs = getTokenExpiration(token);
  if (!expMs) return 0;
  
  const remaining = expMs - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Calculate when to refresh token (before expiration)
 * Returns timestamp in milliseconds for when refresh should occur
 * 
 * Strategy: Refresh 60 seconds before expiration, but:
 * - At least 30 seconds from now (don't refresh too soon)
 * - Immediately if less than 30 seconds remaining
 */
export function getRefreshTime(token: string, bufferSeconds: number = 60): number {
  const expMs = getTokenExpiration(token);
  if (!expMs) return Date.now(); // Refresh now if unknown
  
  const refreshTime = expMs - (bufferSeconds * 1000);
  const minRefreshTime = Date.now() + (30 * 1000); // At least 30 seconds from now
  
  // If token expires soon, refresh immediately
  if (refreshTime <= Date.now()) {
    return Date.now();
  }
  
  // Otherwise, schedule for buffer time before expiration
  return Math.max(refreshTime, minRefreshTime);
}

/**
 * Get human-readable expiration info for debugging
 * NEVER log the actual token
 */
export function getTokenDebugInfo(token: string): {
  isExpired: boolean;
  expiresAt: string | null;
  remainingSeconds: number;
} {
  const expMs = getTokenExpiration(token);
  
  return {
    isExpired: isTokenExpired(token),
    expiresAt: expMs ? new Date(expMs).toISOString() : null,
    remainingSeconds: Math.max(0, Math.floor(getTimeUntilExpiration(token) / 1000)),
  };
}

// =====================================
// AUTH ERROR CODES
// =====================================

export const AUTH_ERROR_CODES = {
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  CONCURRENT_SESSION: 'CONCURRENT_SESSION',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

/**
 * Check if an error code indicates token revocation
 */
export function isTokenRevokedError(code?: string): boolean {
  return code === AUTH_ERROR_CODES.TOKEN_REVOKED || 
         code === AUTH_ERROR_CODES.SESSION_EXPIRED ||
         code === AUTH_ERROR_CODES.CONCURRENT_SESSION;
}

/**
 * Check if an error indicates we should NOT auto-logout
 */
export function shouldNotLogout(status?: number, code?: string): boolean {
  // 403 Forbidden with valid token = permission issue, not auth issue
  if (status === 403 && !isTokenRevokedError(code)) {
    return true;
  }
  
  // 429 Rate limit = temporary, do not logout
  if (status === 429) {
    return true;
  }
  
  return false;
}
