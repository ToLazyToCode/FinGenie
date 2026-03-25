import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, UserPlus, Wallet, RefreshCw, TrendingUp,
  Activity, Database, Cpu, Clock,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import {
  fmt, fmtMoney, safe,
  accentMap,
  card, cardInner, section, tableWrapper, tableHeader, tableRow, tableCell, tableDivider,
  btnSecondary,
  pageTitle, pageSubtitle,
  chartTooltipStyle, chartLabelStyle, chartGrid,
  colors,
} from '../theme/tokens';
import type {
  AdminDashboardStats,
  AdminDashboardCharts,
  AdminRecentTransaction,
  AdminSystemHealth,
} from '../types/admin';

/* ── component ───────────────────────────────────────── */
export function DashboardPage() {
  const { token } = useAdminAuthStore();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [charts, setCharts] = useState<AdminDashboardCharts | null>(null);
  const [transactions, setTransactions] = useState<AdminRecentTransaction[]>([]);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const h = { Authorization: `Bearer ${token ?? ''}` };

  const fetchAll = useCallback(async () => {
    try {
      const [s, c, t, he] = await Promise.all([
        apiClient.get<AdminDashboardStats>('/admin/dashboard/stats', { headers: h }),
        apiClient.get<AdminDashboardCharts>('/admin/dashboard/charts', { headers: h }),
        apiClient.get<AdminRecentTransaction[]>('/admin/dashboard/recent-transactions?limit=10', { headers: h }),
        apiClient.get<AdminSystemHealth>('/admin/dashboard/system-health', { headers: h }),
      ]);
      setStats(s.data);
      setCharts(c.data);
      setTransactions(t.data);
      setHealth(he.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const refresh = () => { setRefreshing(true); void fetchAll(); };

  /* ── chart data transform ─────────────────────────── */
  const chartData = charts
    ? charts.labels.map((label, i) => ({
      date: label,
      users: charts.userGrowthByDay[i] ?? 0,
      volume: charts.transactionVolumeByDay[i] ?? 0,
    }))
    : [];

  /* ── skeleton ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="h-80 rounded-2xl skeleton" />
          <div className="h-80 rounded-2xl skeleton" />
        </div>
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* ── header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Dashboard Overview</h1>
          <p className={pageSubtitle}>Real-time system metrics &amp; analytics</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className={`${btnSecondary} disabled:opacity-50`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── KPI cards ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 stagger-grid">
        <KPICard
          icon={Users} label="Active Users" value={fmt(stats?.totalActiveUsers ?? 0)}
          sub="Non-deleted accounts" accent="emerald"
        />
        <KPICard
          icon={UserPlus} label="New Today" value={fmt(stats?.newUsersToday ?? 0)}
          sub="Registered since midnight" accent="cyan"
        />
        <KPICard
          icon={Wallet} label="Total Income" value={fmtMoney(stats?.totalIncome ?? 0)}
          sub="All positive transactions" accent="amber"
        />
        <KPICard
          icon={TrendingUp} label="Transactions" value={fmt(stats?.totalTransactions ?? 0)}
          sub="All time" accent="violet"
        />
      </div>

      {/* ── Charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <div className={`${section} p-5 chart-enter`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">User Growth (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.emerald} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.emerald} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartLabelStyle}
              />
              <Area type="monotone" dataKey="users" stroke={colors.emerald} strokeWidth={2} fill="url(#gradUsers)" name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Transaction Volume */}
        <div className={`${section} p-5 chart-enter`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Transaction Volume (30 days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="gradVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.cyan} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={colors.cyan} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={chartLabelStyle}
                formatter={(value: any) => [`₫${fmt(Number(value))}`, 'Volume']}
              />
              <Bar dataKey="volume" fill="url(#gradVolume)" radius={[6, 6, 0, 0]} name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── System Health ──────────────────────────── */}
      <div className={`${section} p-5`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">System Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HealthCard
            icon={Activity}
            label="Status"
            value={health?.status ?? '–'}
            ok={health?.status === 'UP'}
          />
          <HealthCard
            icon={Database}
            label="Database"
            value={health?.databaseStatus ?? '–'}
            ok={health?.databaseStatus === 'UP'}
          />
          <HealthCard
            icon={Cpu}
            label="Heap Usage"
            value={`${health?.heapUsagePercent?.toFixed(1) ?? '–'}%`}
            sub={`${health?.heapUsedMb?.toFixed(0) ?? '–'} / ${health?.heapMaxMb?.toFixed(0) ?? '–'} MB`}
            ok={(health?.heapUsagePercent ?? 0) < 85}
          />
          <HealthCard
            icon={Clock}
            label="Uptime"
            value={formatUptime(health?.uptimeSeconds ?? 0)}
            sub={`${health?.activeThreads ?? '–'} threads`}
            ok
          />
        </div>
      </div>

      {/* ── Recent Transactions ────────────────────── */}
      <div className={tableWrapper}>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-300">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto admin-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className={tableHeader}>Account</th>
                <th className={tableHeader}>Category</th>
                <th className={`${tableHeader} text-right`}>Amount</th>
                <th className={`${tableHeader} text-right`}>Date</th>
              </tr>
            </thead>
            <tbody className={tableDivider}>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-600">No transactions found</td>
                </tr>
              ) : (
                transactions.map(txn => (
                  <tr key={txn.transactionId} className={`${tableRow} table-row-hover`}>
                    <td className={tableCell}>
                      <div className="font-medium text-slate-200">{safe(txn.accountName)}</div>
                      <div className="text-xs text-slate-500">{safe(txn.accountEmail)}</div>
                    </td>
                    <td className={`${tableCell} text-slate-400`}>{safe(txn.categoryName)}</td>
                    <td className={`${tableCell} text-right font-semibold tabular-nums`}>
                      <span className={(txn.amount ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {(txn.amount ?? 0) >= 0 ? '+' : ''}₫{fmt(Math.abs(txn.amount ?? 0))}
                      </span>
                    </td>
                    <td className={`${tableCell} text-right text-slate-500 text-xs`}>{safe(txn.transactionDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────── */

function KPICard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub: string;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className={`${card} ${cardInner} animate-slide-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center ring-1 ${a.ring}`}>
          <Icon className={`w-[18px] h-[18px] ${a.text}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}

function HealthCard({ icon: Icon, label, value, sub, ok }: {
  icon: React.ElementType; label: string; value: string; sub?: string; ok: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 hover:border-white/[0.10] transition-all duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className={`text-sm font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{value}</span>
      </div>
      {sub && <div className="text-xs text-slate-600 mt-1 ml-5">{sub}</div>}
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (!seconds) return '–';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
