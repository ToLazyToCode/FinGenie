// Admin Dashboard – TypeScript interfaces
// All types used across the admin feature

export interface AdminUser {
  adminId: number;
  email: string;
  name: string;
  role: string;
}

export interface AdminAuthState {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
}

// ── KPI Stats ─────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  totalActiveUsers: number;
  newUsersToday: number;
  totalIncome: number;
  totalTransactions: number;
}

// ── Chart Data ────────────────────────────────────────────────────────────────

export interface AdminDashboardCharts {
  userGrowthByDay: Record<string, number>;
  transactionVolumeByDay: Record<string, number>;
  labels: string[];
}

// ── Recent Transactions ───────────────────────────────────────────────────────

export interface AdminRecentTransaction {
  transactionId: number;
  accountId: number | null;
  accountEmail: string | null;
  accountName: string | null;
  amount: number;
  description: string | null;
  categoryName: string | null;
  transactionDate: string | null; // ISO date string
}

// ── System Health ─────────────────────────────────────────────────────────────

export interface AdminSystemHealth {
  status: 'UP' | 'DEGRADED' | 'DOWN';
  databaseStatus: 'UP' | 'DOWN';
  heapUsedMb: number;
  heapMaxMb: number;
  heapUsagePercent: number;
  activeThreads: number;
  uptimeSeconds: number;
}

// ── API Requests / Responses ──────────────────────────────────────────────────

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  adminId: number;
  email: string;
  name: string;
  role: string;
}
