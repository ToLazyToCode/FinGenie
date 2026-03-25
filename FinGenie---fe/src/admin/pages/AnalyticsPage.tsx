import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, PiggyBank, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AnalyticsData, CategoryBreakdown } from '../types/admin';
import {
  colors, fmt, fmtMoney,
  chartTooltipStyle, chartGrid,
  card, cardInner, section,
  tableWrapper, tableHeader, tableHeaderRight,
  tableRow, tableDivider, tableCell,
  btnSecondary,
  tabContainer, tabActive, tabInactive,
  pageTitle, pageSubtitle,
} from '../theme/tokens';

type Period = 'weekly' | 'monthly' | 'yearly';

export function AnalyticsPage() {
  const { accessToken } = useAdminAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>('monthly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await apiClient.get(`/admin/analytics/overview?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setAnalytics(res.data.data ?? res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchAnalytics();
  }, [period, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { setRefreshing(true); void fetchAnalytics(); };

  const incomeCategories = analytics?.categories?.filter(c => c.type === 'INCOME') ?? [];
  const expenseCategories = analytics?.categories?.filter(c => c.type === 'EXPENSE') ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-5 stagger-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div className="h-80 rounded-2xl skeleton" />
          <div className="h-80 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Analytics</h1>
          <p className={pageSubtitle}>Platform-wide financial analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className={tabContainer}>
            {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={period === p ? tabActive : tabInactive}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className={`${btnSecondary} disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 stagger-grid">
        <KPICard
          icon={TrendingUp}
          label="Total Income"
          value={fmtMoney(analytics?.totalIncome ?? 0)}
          accent="emerald"
          trend="up"
          period={period}
        />
        <KPICard
          icon={TrendingDown}
          label="Total Expense"
          value={fmtMoney(analytics?.totalExpense ?? 0)}
          accent="red"
          trend="down"
          period={period}
        />
        <KPICard
          icon={PiggyBank}
          label="Net Savings"
          value={fmtMoney(analytics?.netSavings ?? 0)}
          accent={(analytics?.netSavings ?? 0) >= 0 ? 'emerald' : 'red'}
          trend={(analytics?.netSavings ?? 0) >= 0 ? 'up' : 'down'}
          period={period}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Income Breakdown Pie */}
        <div className={`${section} ${cardInner} chart-enter`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Income by Category</h3>
          {incomeCategories.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-600">No income data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={incomeCategories}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  strokeWidth={0}
                  label={(props: any) =>
                    `${props.categoryName ?? props.name ?? ''} (${(props.percentage ?? props.percent * 100)?.toFixed(1)}%)`
                  }
                >
                  {incomeCategories.map((_, i) => (
                    <Cell key={i} fill={colors.chartColors[i % colors.chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: any) => [fmtMoney(Number(value)), 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Breakdown Pie */}
        <div className={`${section} ${cardInner} chart-enter`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Expenses by Category</h3>
          {expenseCategories.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-600">No expense data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseCategories}
                  dataKey="amount"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  strokeWidth={0}
                  label={(props: any) =>
                    `${props.categoryName ?? props.name ?? ''} (${(props.percentage ?? props.percent * 100)?.toFixed(1)}%)`
                  }
                >
                  {expenseCategories.map((_, i) => (
                    <Cell key={i} fill={colors.chartColors[i % colors.chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: any) => [fmtMoney(Number(value)), 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Bar Chart */}
      <div className={`${section} ${cardInner} chart-enter`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Categories by Amount</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={[...incomeCategories, ...expenseCategories]
              .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
              .slice(0, 10)}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis
              type="number"
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₫${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="categoryName"
              type="category"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: any) => [fmtMoney(Number(value)), 'Amount']}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
              {[...incomeCategories, ...expenseCategories]
                .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                .slice(0, 10)
                .map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.type === 'INCOME' ? colors.emerald : colors.red}
                    fillOpacity={0.7}
                  />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 rounded bg-emerald-500/70" /> Income
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 rounded bg-red-500/70" /> Expense
          </div>
        </div>
      </div>

      {/* Category Details Table */}
      <div className={tableWrapper}>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-300">Category Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className={tableHeader}>Category</th>
                <th className={tableHeader}>Type</th>
                <th className={tableHeaderRight}>Amount</th>
                <th className={tableHeaderRight}>Share</th>
              </tr>
            </thead>
            <tbody className={tableDivider}>
              {analytics?.categories
                ?.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                .map(cat => (
                  <tr key={cat.categoryId} className={tableRow}>
                    <td className={`${tableCell} text-slate-200 font-medium`}>
                      {cat.categoryName ?? '–'}
                    </td>
                    <td className={tableCell}>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          cat.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {cat.type}
                      </span>
                    </td>
                    <td className={`${tableCell} text-right font-semibold tabular-nums text-slate-200`}>
                      {fmtMoney(cat.amount ?? 0)}
                    </td>
                    <td className={`${tableCell} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cat.type === 'INCOME' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(cat.percentage ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums w-12 text-right">
                          {(cat.percentage ?? 0).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              {(!analytics?.categories || analytics.categories.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                    No category data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── sub-components ──────────────────────────────────── */
function KPICard({
  icon: Icon,
  label,
  value,
  accent,
  trend,
  period,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: 'emerald' | 'red';
  trend: 'up' | 'down';
  period?: string;
}) {
  const c =
    accent === 'emerald'
      ? { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-emerald-500/20' }
      : { bg: 'bg-red-500/10', text: 'text-red-400', ring: 'ring-red-500/20' };

  return (
    <div
      className={`${card} ${cardInner} animate-slide-up hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div
          className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ring-1 ${c.ring}`}
        >
          <Icon className={`w-[18px] h-[18px] ${c.text}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="flex items-center gap-1 mt-1">
        {trend === 'up' ? (
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
        )}
        <span
          className={`text-xs font-medium ${
            trend === 'up' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          This {period === 'yearly' ? 'year' : period === 'monthly' ? 'month' : 'week'}
        </span>
      </div>
    </div>
  );
}
