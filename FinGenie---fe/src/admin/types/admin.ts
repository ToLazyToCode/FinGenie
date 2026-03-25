// ============================================
// AUTH TYPES
// ============================================
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

// ============================================
// DASHBOARD TYPES
// ============================================
export interface AdminDashboardStats {
  totalActiveUsers: number;
  newUsersToday: number;
  totalIncome: number;
  totalTransactions: number;
}

export interface AdminDashboardCharts {
  userGrowthByDay: number[];
  transactionVolumeByDay: number[];
  labels: string[];
}

export interface AdminRecentTransaction {
  transactionId: number;
  accountId: number;
  accountEmail: string;
  accountName: string;
  amount: number;
  categoryName: string;
  transactionDate: string;
}

export interface AdminSystemHealth {
  status: string;
  databaseStatus: string;
  heapUsedMb: number;
  heapMaxMb: number;
  heapUsagePercent: number;
  activeThreads: number;
  uptimeSeconds: number;
}

// ============================================
// USER MANAGEMENT TYPES
// ============================================
export interface AdminUserResponse {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  kycStatus: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  isPremium: boolean;
}

export interface AdminUserDetailResponse extends AdminUserResponse {
  totalBalance: number;
  totalSpent: number;
  totalIncome: number;
  transactionCount: number;
  walletCount: number;
}

export interface AdminUserActivity {
  id: number;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface AdminUserWallet {
  id: number;
  name: string;
  balance: number;
  currency: string;
  isDefault: boolean;
}

// ============================================
// FINANCIAL TYPES
// ============================================
export interface AdminFinancialSummaryResponse {
  volume24h: number;
  volumeChange24h: number;
  revenue7d: number;
  revenueChange7d: number;
  refundRate: number;
  refundRateChange: number;
  totalPaidOrders: number;
  totalRevenue: number;
}

export interface AdminTransactionResponse {
  id: number;
  accountId: number;
  accountEmail: string;
  amount: number;
  status: string;
  gateway: string;
  orderCode: string;
  planTitle: string;
  createdAt: string;
}

export interface AdminRefundResponse {
  id: number;
  transactionId: number;
  accountEmail: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  processedBy: string | null;
  notes: string | null;
}

export interface AdminPaymentGatewayResponse {
  gatewayName: string;
  status: string;
  totalVolume: number;
  successRate: number;
  transactionCount: number;
  lastChecked: string;
}

// ============================================
// GAMIFICATION TYPES
// ============================================
export interface AdminAchievement {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  xpReward: number;
  category: string;
  usersEarned: number;
}

export interface AdminLeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
}

export interface AdminReward {
  id: number;
  name: string;
  description: string;
  cost: number;
  category: string;
  stock: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================
export interface AnalyticsData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  categories: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  amount: number;
  percentage: number;
  type: 'INCOME' | 'EXPENSE';
}

// ============================================
// CONTENT TYPES
// ============================================
export interface Category {
  id: number;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  iconUrl: string | null;
  isSystem: boolean;
  transactionCount: number;
}

export interface PersonalReward {
  id: number;
  name: string;
  description: string;
  cost: number;
  iconUrl: string | null;
  isActive: boolean;
}

// ============================================
// SYSTEM TYPES
// ============================================
export interface SystemSetting {
  key: string;
  value: string;
  type: 'boolean' | 'number' | 'string';
  label: string;
  description: string;
}

export interface APILog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  responseTime: number;
}

// ============================================
// COMMON TYPES
// ============================================
export type AdminPage = 'dashboard' | 'users' | 'financial' | 'gamification' | 'analytics' | 'content' | 'system';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
