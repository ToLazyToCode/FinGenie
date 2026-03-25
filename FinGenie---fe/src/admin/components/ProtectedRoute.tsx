import React, { useEffect } from 'react';
import { useAdminAuthStore } from '../stores/adminAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * Renders `children` when the admin is authenticated,
 * otherwise renders `fallback` (e.g. the login page).
 * Hydrates from localStorage on first render.
 *
 * Pure web component — no React Native dependencies.
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, hydrate } = useAdminAuthStore();
  const [hydrated, setHydrated] = React.useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#070b14',
        }}
      >
        {/* Emerald spinner matching admin theme */}
        <div
          style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(16,185,129,0.15)',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}
