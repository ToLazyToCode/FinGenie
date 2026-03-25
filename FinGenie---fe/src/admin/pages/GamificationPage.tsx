import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Trophy, Star, Plus, Pencil, Trash2, X,
  RefreshCw, Sparkles, Medal, Award,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import {
  accentMap, elevated,
  card, cardInner, section,
  btnPrimary, btnSecondary, btnDanger,
  input as inputClass,
  pageTitle, pageSubtitle,
} from '../theme/tokens';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category?: string;
  usersEarned: number;
}

interface AchievementForm {
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

const emptyForm: AchievementForm = { name: '', description: '', icon: '', xpReward: 100 };

export function GamificationPage() {
  const { accessToken } = useAdminAuth();
  const h = { Authorization: `Bearer ${accessToken}` };

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AchievementForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Achievement | null>(null);

  const fetchAchievements = async () => {
    try {
      const res = await apiClient.get('/admin/achievements', { headers: h });
      setAchievements(res.data.data ?? res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAchievements(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/admin/achievements/${editingId}`, form, { headers: h });
        toast.success('Achievement updated');
      } else {
        await apiClient.post('/admin/achievements', form, { headers: h });
        toast.success('Achievement created');
      }
      void fetchAchievements();
      setShowForm(false); setForm(emptyForm); setEditingId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/admin/achievements/${deleteTarget.id}`, { headers: h });
      toast.success(`"${deleteTarget.name}" deleted`);
      void fetchAchievements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to delete');
    }
    setDeleteTarget(null);
  };

  const startEdit = (a: Achievement) => {
    setForm({ name: a.name, description: a.description, icon: a.icon, xpReward: a.xpReward });
    setEditingId(a.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-xl skeleton w-72" />
        <div className="grid grid-cols-3 gap-5 stagger-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Gamification</h1>
          <p className={pageSubtitle}>Manage achievements &amp; reward system</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchAchievements()}
            className={btnSecondary}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }}
            className={showForm ? btnSecondary : btnPrimary}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Achievement'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 stagger-grid">
        <StatCard icon={Trophy} label="Achievements" value={achievements.length} accent="amber" />
        <StatCard
          icon={Star}
          label="Total Earned"
          value={achievements.reduce((s, a) => s + (a.usersEarned ?? 0), 0)}
          accent="emerald"
        />
        <StatCard
          icon={Sparkles}
          label="Total XP Available"
          value={achievements.reduce((s, a) => s + (a.xpReward ?? 0), 0).toLocaleString('vi-VN')}
          accent="violet"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className={`${section} ${cardInner}`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            {editingId ? 'Edit Achievement' : 'Create Achievement'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Achievement name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Icon (emoji)</label>
                  <input
                    type="text"
                    required
                    value={form.icon}
                    onChange={e => setForm({ ...form, icon: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., 🏆"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">XP Reward</label>
                  <input
                    type="number"
                    required
                    value={form.xpReward}
                    onChange={e => setForm({ ...form, xpReward: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
              <textarea
                required
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="Describe the achievement..."
              />
            </div>
            <button type="submit" className={btnPrimary}>
              {editingId ? 'Update' : 'Create'} Achievement
            </button>
          </form>
        </div>
      )}

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-grid">
        {achievements.map(a => (
          <div
            key={a.id}
            className={`${card} ${cardInner} animate-slide-up group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl ring-1 ring-amber-500/20">
                  {a.icon || '🏆'}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200">{a.name}</h4>
                  <span className="text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md">
                    +{a.xpReward} XP
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(a)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-cyan-400 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(a)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{a.description}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Medal className="w-3.5 h-3.5" />
              <span>{a.usersEarned} users earned</span>
            </div>
          </div>
        ))}
        {achievements.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-600">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-700" />
            No achievements yet. Create one to get started.
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${elevated} w-full max-w-md p-6 animate-scale-in`}>
            <h2 className="text-lg font-bold text-white mb-1">Delete Achievement</h2>
            <p className="text-sm text-slate-500 mb-4">
              Delete &quot;{deleteTarget.name}&quot;? This removes it from all users who earned it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className={`flex-1 ${btnDanger} justify-center`}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className={`flex-1 ${btnSecondary} justify-center`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent: 'amber' | 'emerald' | 'violet';
}) {
  const a = accentMap[accent];
  return (
    <div className={`${card} ${cardInner} animate-slide-up`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center ring-1 ${a.ring}`}>
          <Icon className={`w-[18px] h-[18px] ${a.text}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
    </div>
  );
}
