import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell, BellRing, FolderOpen, Tag, RefreshCw,
  Send, CheckCircle, XCircle, Eye, Clock,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { Category, PersonalReward } from '../types/admin';
import {
  accentMap,
  card, cardInner, section, tableWrapper, tableHeader, tableHeaderRight,
  tableRow, tableCell, tableDivider, badge,
  btnPrimary, btnSecondary, input as inputClass,
  tabContainer, tabActive, tabInactive, pageTitle, pageSubtitle,
  animSlideUp,
} from '../theme/tokens';

export function ContentPage() {
  const { accessToken } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'rewards' | 'notifications'>('categories');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rewards, setRewards] = useState<PersonalReward[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const h = { Authorization: `Bearer ${accessToken}` };

  const fetchData = async () => {
    try {
      const [catRes, rewardRes] = await Promise.all([
        apiClient.get('/categories', { headers: h }).catch(() => ({ data: { data: [] } })),
        apiClient.get('/rewards/personal/catalog', { headers: h }).catch(() => ({ data: { data: [] } })),
      ]);
      setCategories(catRes.data.data ?? catRes.data ?? []);
      setRewards(rewardRes.data.data ?? rewardRes.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchData(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => { setRefreshing(true); void fetchData(); };

  const tabs = [
    { id: 'categories' as const, label: 'Categories', icon: Tag, count: categories.length },
    { id: 'rewards' as const, label: 'Rewards', icon: FolderOpen, count: rewards.length },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, count: null },
  ];

  if (loading) {
    return (
      <div className="space-y-6 page-enter">
        <div className="h-12 skeleton rounded-xl w-96" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Content Management</h1>
          <p className={pageSubtitle}>Manage categories, rewards, and notifications</p>
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

      {/* Tabs */}
      <div className={`${tabContainer} w-fit`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${activeTab === tab.id ? tabActive : tabInactive} flex items-center gap-2`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md
                  ${activeTab === tab.id ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content — key forces re-animation on tab switch */}
      <div key={activeTab} className={animSlideUp}>
        {activeTab === 'categories' && <CategoriesTab categories={categories} />}
        {activeTab === 'rewards' && <RewardsTab rewards={rewards} />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
}

/* ── Categories Tab ──────────────────────────────────── */
function CategoriesTab({ categories }: { categories: Category[] }) {
  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 stagger-grid">
        <StatCard label="Total Categories" value={categories.length} icon={Tag} />
        <StatCard label="Income Categories" value={incomeCategories.length} accent="emerald" icon={CheckCircle} />
        <StatCard label="Expense Categories" value={expenseCategories.length} accent="red" icon={XCircle} />
      </div>

      {/* Table */}
      <div className={tableWrapper}>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-300">All Categories</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className={tableHeader}>Icon</th>
                <th className={tableHeader}>Name</th>
                <th className={tableHeader}>Type</th>
                <th className={tableHeader}>Source</th>
                <th className={tableHeaderRight}>Transactions</th>
              </tr>
            </thead>
            <tbody className={tableDivider}>
              {categories.map(cat => (
                <tr key={cat.id} className={tableRow}>
                  <td className={tableCell}>
                    {cat.iconUrl ? (
                      <img src={cat.iconUrl} alt="" className="w-8 h-8 rounded-lg" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <Tag className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                  </td>
                  <td className={`${tableCell} text-slate-200 font-medium`}>{cat.name ?? '–'}</td>
                  <td className={tableCell}>
                    <span className={`${badge} ${cat.type === 'INCOME'
                      ? `${accentMap.emerald.bg} ${accentMap.emerald.text}`
                      : `${accentMap.red.bg} ${accentMap.red.text}`}`}
                    >
                      {cat.type}
                    </span>
                  </td>
                  <td className={tableCell}>
                    <span className={`${badge} ${cat.isSystem
                      ? `${accentMap.cyan.bg} ${accentMap.cyan.text}`
                      : `${accentMap.violet.bg} ${accentMap.violet.text}`}`}
                    >
                      {cat.isSystem ? 'System' : 'Custom'}
                    </span>
                  </td>
                  <td className={`${tableCell} text-right text-slate-400 tabular-nums`}>{cat.transactionCount ?? 0}</td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-600">No categories found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Rewards Tab ─────────────────────────────────────── */
function RewardsTab({ rewards }: { rewards: PersonalReward[] }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-5 stagger-grid">
        <StatCard label="Total Rewards" value={rewards.length} icon={FolderOpen} />
        <StatCard label="Active Rewards" value={rewards.filter(r => r.isActive).length} accent="emerald" icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-grid">
        {rewards.map(reward => (
          <div key={reward.id} className={`${card} ${cardInner} ${animSlideUp}`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl ${accentMap.amber.bg} flex items-center justify-center flex-shrink-0 ${accentMap.amber.ring}`}>
                {reward.iconUrl ? (
                  <img src={reward.iconUrl} alt="" className="w-7 h-7 rounded" />
                ) : (
                  <FolderOpen className={`w-5 h-5 ${accentMap.amber.text}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-slate-200 truncate">{reward.name}</h4>
                  <span className={`ml-2 flex-shrink-0 ${badge} ${reward.isActive
                    ? `${accentMap.emerald.bg} ${accentMap.emerald.text}`
                    : 'bg-slate-500/10 text-slate-500'}`}
                  >
                    {reward.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{reward.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${accentMap.amber.text} ${accentMap.amber.bg} px-2 py-1 rounded-lg`}>
                    {reward.cost ?? 0} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {rewards.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-600">No rewards in catalog</div>
        )}
      </div>
    </div>
  );
}

/* ── Notifications Tab (Admin broadcast) ─────────────── */
function NotificationsTab() {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSending(true);
    try {
      // Placeholder - no dedicated admin broadcast endpoint yet
      toast.success('Notification feature coming soon');
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className={`${section} p-6 ${animSlideUp}`}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 rounded-xl ${accentMap.violet.bg} flex items-center justify-center ${accentMap.violet.ring}`}>
            <BellRing className={`w-5 h-5 ${accentMap.violet.text}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Broadcast Notification</h3>
            <p className="text-xs text-slate-500">Send a notification to all users</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Notification title..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className={`${btnPrimary} disabled:opacity-50`}
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className={`${section} ${cardInner} ${animSlideUp}`}>
        <p className="text-sm text-slate-500">
          Notification broadcasting is a planned feature. When available, you'll be able to send
          push notifications and in-app messages to all users or specific user segments.
        </p>
      </div>
    </div>
  );
}

/* ── Shared ──────────────────────────────────────────── */
function StatCard({ label, value, accent, icon: Icon }: {
  label: string;
  value: number;
  accent?: keyof typeof accentMap;
  icon?: React.ElementType;
}) {
  const a = accent ? accentMap[accent] : null;
  const valueCls = a ? a.text : 'text-white';

  return (
    <div className={`${card} ${cardInner} ${animSlideUp} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a ? `${a.bg} ${a.ring}` : 'bg-white/[0.06]'}`}>
            <Icon className={`w-4 h-4 ${a ? a.text : 'text-slate-400'}`} />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold ${valueCls}`}>{value}</div>
    </div>
  );
}
