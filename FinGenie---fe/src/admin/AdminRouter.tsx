import React from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './pages/AdminLayout';
import { LoginPage } from './pages/LoginPage';

/**
 * Top-level admin router.
 *
 * Usage – mount this component anywhere in the React tree when the URL
 * indicates the admin section (e.g. path starts with /admin).
 *
 * It uses ProtectedRoute to gate access:
 *   - Authenticated admin  → AdminLayout (dashboard + sidebar + navbar)
 *   - Unauthenticated      → LoginPage
 */
export function AdminRouter() {
  return (
    <ProtectedRoute fallback={<LoginPage />}>
      <AdminLayout />
    </ProtectedRoute>
  );
}
