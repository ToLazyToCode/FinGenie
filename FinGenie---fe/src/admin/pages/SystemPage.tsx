import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Settings, Server, Database, Cpu, Wifi, RefreshCw,
  ToggleLeft, ToggleRight, Save, Clock, Activity,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminSystemHealth } from '../types/admin';
import {
  section, tableWrapper, tableDivider, tableRow,
  btnPrimary, btnSecondary, input as inputClass,
  pageTitle, pageSubtitle, animSlideUp,
} from '../theme/tokens';

interface Setting {
  key: string;
  value: string;
  type: 'boolean' | 'string' | 'number';
  description: string;
}

const defaultSettings: Setting[] = [
  { key: 'AI_SUGGESTIONS_ENABLED', value: 'true', type: 'boolean', description: 'Enable AI financial suggestions' },
  { key: 'GAMIFICATION_ENABLED', value: 'true', type: 'boolean', description: 'Enable gamification features' },
  { key: 'MAX_DAILY_TRANSACTIONS', value: '100', type: 'number', description: 'Maximum transactions per user per day' },
  { key: 'SUPPORT_EMAIL', value: 'support@fingenie.com', type: 'string', description: 'Support team email address' },
];

export function SystemPage() {
  const { accessToken } = useAdminAuth();
  const h = { Authorization: `Bearer ${accessToken}` };

  const [settings, setSettings] = useState<Setting[]>(defaultSettings);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await apiClient.get('/admin/dashboard/system-health', { headers: h });
      setHealth(res.data.data ?? res.data);
    } catch {
      // Silent fail - health is supplementary
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => { void fetchHealth(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await apiClient.put(`/admin/settings/${key}`, { value }, { headers: h });
      setSettings(settings.map(s => s.key === key ? { ...s, value } : s));
      setEditingKey(null);
      toast.success(`"${key}" updated`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (setting: Setting) => {
    const newVal = setting.value === 'true' ? 'false' : 'true';
    await handleSave(setting.key, newVal);
  };

  const formatUptime = (s: number) => {
    if (!s) return '–';
    const d = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${hrs}h ${m}m`;
    if (hrs > 0) return `${hrs}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>System</h1>
          <p className={pageSubtitle}>Settings, health, and monitoring</p>
        </div>
        <button
          onClick={() => void fetchHealth()}
          className={btnSecondary}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* System Health */}
      <div className={`${section} p-5 ${animSlideUp}`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">System Health</h3>
        {healthLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-grid">
            <HealthCard icon={Server} label="API Server" value={health?.status ?? 'UNKNOWN'}
              ok={health?.status === 'UP'} />
            <HealthCard icon={Database} label="Database" value={health?.databaseStatus ?? 'UNKNOWN'}
              ok={health?.databaseStatus === 'UP'} />
            <HealthCard icon={Cpu} label="Heap Usage"
              value={`${health?.heapUsagePercent?.toFixed(1) ?? '–'}%`}
              sub={`${health?.heapUsedMb?.toFixed(0) ?? '–'} / ${health?.heapMaxMb?.toFixed(0) ?? '–'} MB`}
              ok={(health?.heapUsagePercent ?? 0) < 85} />
            <HealthCard icon={Clock} label="Uptime"
              value={formatUptime(health?.uptimeSeconds ?? 0)}
              sub={`${health?.activeThreads ?? '–'} active threads`}
              ok />
          </div>
        )}
      </div>

      {/* Heap Usage Bar */}
      {health && (
        <div className={`${section} p-5 ${animSlideUp}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-300">Memory Usage</h3>
            <span className="text-xs text-slate-500">
              {health.heapUsedMb?.toFixed(0) ?? '–'} MB / {health.heapMaxMb?.toFixed(0) ?? '–'} MB
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500
                ${(health.heapUsagePercent ?? 0) > 85 ? 'bg-red-500' :
                  (health.heapUsagePercent ?? 0) > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(health.heapUsagePercent ?? 0, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-600">0%</span>
            <span className={`text-xs font-medium
              ${(health.heapUsagePercent ?? 0) > 85 ? 'text-red-400' :
                (health.heapUsagePercent ?? 0) > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {health.heapUsagePercent?.toFixed(1) ?? '–'}%
            </span>
            <span className="text-xs text-slate-600">100%</span>
          </div>
        </div>
      )}

      {/* Feature Settings */}
      <div className={`${tableWrapper} ${animSlideUp}`}>
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-slate-300">Feature Settings</h3>
        </div>
        <div className={tableDivider}>
          {settings.map(setting => (
            <div key={setting.key} className={`${tableRow} px-5 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-6">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-semibold text-slate-200">{setting.key}</h4>
                  </div>
                  <p className="text-xs text-slate-500">{setting.description}</p>
                </div>

                {setting.type === 'boolean' ? (
                  <button
                    onClick={() => void handleToggle(setting)}
                    className="flex items-center gap-2 transition-all"
                    title={`Toggle ${setting.key}`}
                  >
                    {setting.value === 'true' ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                ) : editingKey === setting.key ? (
                  <div className="flex items-center gap-2">
                    <div className="w-48">
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <button
                      onClick={() => void handleSave(setting.key, editValue)}
                      disabled={saving}
                      className={`${btnPrimary} px-3 py-2 disabled:opacity-50`}
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className={`${btnSecondary} px-3 py-2`}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-sm text-slate-300 font-mono">
                      {setting.value}
                    </span>
                    <button
                      onClick={() => { setEditingKey(setting.key); setEditValue(setting.value); }}
                      className={`${btnSecondary} px-3 py-1.5 text-xs`}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Info */}
      <div className={`${section} p-5 ${animSlideUp}`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">System Information</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between px-4 py-2.5 rounded-xl bg-white/[0.03]">
            <span className="text-slate-500">API Version</span>
            <span className="text-slate-300 font-mono">v1.0.0</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 rounded-xl bg-white/[0.03]">
            <span className="text-slate-500">Environment</span>
            <span className="text-slate-300 font-mono">production</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 rounded-xl bg-white/[0.03]">
            <span className="text-slate-500">Active Threads</span>
            <span className="text-slate-300 font-mono">{health?.activeThreads ?? '–'}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 rounded-xl bg-white/[0.03]">
            <span className="text-slate-500">Database</span>
            <span className={`font-mono ${health?.databaseStatus === 'UP' ? 'text-emerald-400' : 'text-red-400'}`}>
              {health?.databaseStatus ?? '–'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Health Card ─────────────────────────────────────── */
function HealthCard({ icon: Icon, label, value, sub, ok }: {
  icon: React.ElementType; label: string; value: string; sub?: string; ok: boolean;
}) {
  return (
    <div className={`${section} p-4 ${animSlideUp}`}>
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
