import { useState } from 'react';
import { Sparkles, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useTailwind } from '../hooks/useTailwind';

/**
 * Admin login form — web Tailwind version.
 * Uses the useAdminAuth hook; on success the ProtectedRoute/AdminRouter
 * will automatically render the dashboard.
 */
export function LoginPage() {
  const ready = useTailwind();
  const { login, isLoading, error, clearError } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    clearError();
    try {
      await login({ email: email.trim(), password });
    } catch {
      // Error is already stored in the store
    }
  };

  // Wait for Tailwind CDN to load before rendering
  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#070b14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 32, height: 32, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#070b14' }}
    >
      {/* Subtle dot-grid background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Ambient glow blobs */}
      <div
        className="fixed pointer-events-none"
        style={{
          top: '-20%',
          left: '10%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          bottom: '-10%',
          right: '5%',
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 65%)',
          borderRadius: '50%',
        }}
      />

      {/* Login card */}
      <div
        className="relative w-full max-w-sm animate-scale-in"
        style={{
          background: '#0f1629',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
          padding: '40px 36px',
        }}
      >
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          {/* Icon badge */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.2) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
              boxShadow: '0 8px 24px rgba(16,185,129,0.15)',
            }}
          >
            <Sparkles
              className="w-7 h-7"
              style={{
                color: '#10b981',
                filter: 'drop-shadow(0 0 8px rgba(16,185,129,0.5))',
              }}
            />
          </div>

          {/* Title with gradient */}
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            FinGenie Admin
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">Sign in to the admin dashboard</p>
        </div>

        {/* Error banner */}
        {error ? (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6 animate-slide-up"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300 leading-snug">{error}</p>
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="admin@fingenie.com"
              value={email}
              onChange={e => { clearError(); setEmail(e.target.value); }}
              disabled={isLoading}
              autoComplete="email"
              required
              className="focus-ring"
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
              }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(16,185,129,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => { clearError(); setPassword(e.target.value); }}
                disabled={isLoading}
                autoComplete="current-password"
                required
                className="focus-ring"
                style={{
                  width: '100%',
                  padding: '10px 44px 10px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1,
                }}
                onFocus={e => { e.currentTarget.style.border = '1px solid rgba(16,185,129,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)'; }}
                onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              marginTop: 8,
              background: isLoading || !email.trim() || !password.trim()
                ? 'rgba(16,185,129,0.1)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.9) 0%, rgba(6,182,212,0.85) 100%)',
              color: isLoading || !email.trim() || !password.trim() ? 'rgba(16,185,129,0.4)' : '#fff',
              border: '1px solid rgba(16,185,129,0.3)',
              cursor: isLoading || !email.trim() || !password.trim() ? 'not-allowed' : 'pointer',
              boxShadow: isLoading || !email.trim() || !password.trim()
                ? 'none'
                : '0 8px 24px rgba(16,185,129,0.25)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 mt-8">
          FinGenie Admin Portal · Restricted Access
        </p>
      </div>
    </div>
  );
}
