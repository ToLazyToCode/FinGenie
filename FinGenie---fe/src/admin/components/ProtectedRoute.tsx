import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAdminAuthStore } from '../stores/adminAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

/**
 * Renders `children` when the admin is authenticated,
 * otherwise renders `fallback` (e.g. the login page).
 * Hydrates from localStorage on first render.
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
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
