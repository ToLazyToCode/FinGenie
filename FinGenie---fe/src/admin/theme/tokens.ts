/**
 * Admin Design Tokens
 * Single source of truth for all admin UI colors, spacing, and style classes.
 * Every admin page MUST use these tokens instead of hardcoded values.
 */

/* ── Color palette (hex values for charts, recharts, inline styles) ── */
export const colors = {
  // Backgrounds
  bgBase: '#070b14',
  bgSurface: '#0a0f1e',
  bgCard: 'rgba(255,255,255,0.025)',
  bgCardHover: 'rgba(255,255,255,0.05)',
  bgElevated: '#0f1629',
  bgOverlay: 'rgba(0,0,0,0.6)',

  // Borders
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  borderActive: 'rgba(255,255,255,0.18)',

  // Text
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDim: '#475569',

  // Accents
  emerald: '#10b981',
  emeraldLight: '#34d399',
  emeraldDim: 'rgba(16,185,129,0.15)',
  cyan: '#06b6d4',
  cyanLight: '#22d3ee',
  cyanDim: 'rgba(6,182,212,0.15)',
  violet: '#8b5cf6',
  violetLight: '#a78bfa',
  violetDim: 'rgba(139,92,246,0.15)',
  amber: '#f59e0b',
  amberLight: '#fbbf24',
  amberDim: 'rgba(245,158,11,0.15)',
  red: '#ef4444',
  redLight: '#f87171',
  redDim: 'rgba(239,68,68,0.15)',
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueDim: 'rgba(59,130,246,0.15)',
  pink: '#ec4899',
  teal: '#14b8a6',
  indigo: '#6366f1',

  // Chart palette
  chartColors: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'],
} as const;

/* ── Tailwind class tokens ───────────────────────────── */

/** Card container */
export const card = 'rounded-2xl bg-white/[0.025] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300';
export const cardInner = 'p-5';
export const cardStatic = 'rounded-2xl bg-white/[0.025] border border-white/[0.06]';

/** Elevated card (modals, dropdowns) */
export const elevated = 'rounded-2xl bg-[#0f1629] border border-white/[0.08] shadow-2xl shadow-black/40';

/** Page section card (no hover) */
export const section = 'rounded-2xl bg-white/[0.025] border border-white/[0.06]';

/** Table styles */
export const tableWrapper = 'rounded-2xl bg-white/[0.025] border border-white/[0.06] overflow-hidden';
export const tableHeader = 'px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider';
export const tableHeaderRight = 'px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider';
export const tableRow = 'hover:bg-white/[0.03] transition-colors duration-200';
export const tableCell = 'px-5 py-3.5';
export const tableDivider = 'divide-y divide-white/[0.04]';

/** Badge base */
export const badge = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium';

/** Button variants */
export const btnPrimary = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/30 transition-all duration-200';
export const btnSecondary = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.06] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 hover:border-white/[0.12] transition-all duration-200';
export const btnDanger = 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200';
export const btnGhost = 'flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-200';

/** Input */
export const input = 'w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200';

/** Tab navigation */
export const tabContainer = 'flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]';
export const tabActive = 'px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 transition-all duration-200';
export const tabInactive = 'px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200';

/** Page header */
export const pageTitle = 'text-2xl font-bold text-white tracking-tight';
export const pageSubtitle = 'text-sm text-slate-500 mt-1';

/** Accent icon wrappers */
export const accentMap = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', ring: 'ring-1 ring-emerald-500/20', gradient: 'from-emerald-500 to-emerald-600' },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    ring: 'ring-1 ring-cyan-500/20',    gradient: 'from-cyan-500 to-cyan-600' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   ring: 'ring-1 ring-amber-500/20',   gradient: 'from-amber-500 to-amber-600' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  ring: 'ring-1 ring-violet-500/20',  gradient: 'from-violet-500 to-violet-600' },
  red:     { bg: 'bg-red-500/10',     text: 'text-red-400',     ring: 'ring-1 ring-red-500/20',     gradient: 'from-red-500 to-red-600' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    ring: 'ring-1 ring-blue-500/20',    gradient: 'from-blue-500 to-blue-600' },
} as const;

/** Recharts tooltip style */
export const chartTooltipStyle = {
  background: '#0f1629',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};
export const chartLabelStyle = { color: '#94a3b8' };
export const chartGrid = 'rgba(255,255,255,0.04)';

/** Animation classes (defined in useTailwind) */
export const animFadeIn = 'animate-fade-in';
export const animSlideUp = 'animate-slide-up';
export const animScaleIn = 'animate-scale-in';

/** Status color mapping */
export function statusColor(status: string): { bg: string; text: string; dot: string } {
  const s = (status ?? '').toUpperCase();
  if (['ACTIVE', 'UP', 'COMPLETED', 'SUCCESS', 'PAID', 'APPROVED'].includes(s))
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' };
  if (['PENDING', 'PROCESSING', 'IN_PROGRESS'].includes(s))
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' };
  if (['INACTIVE', 'SUSPENDED', 'BANNED', 'FAILED', 'REJECTED', 'DOWN', 'ERROR'].includes(s))
    return { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' };
  if (['CANCELLED', 'REFUNDED', 'EXPIRED'].includes(s))
    return { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
  return { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' };
}

/** Null-safe helpers */
export const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('vi-VN');
export const fmtMoney = (n: number | null | undefined) => {
  const v = n ?? 0;
  if (v >= 1_000_000_000) {
    const b = (v / 1_000_000_000).toFixed(1);
    return b + ' ty VND';
  }
  if (v >= 1_000_000) {
    const m = (v / 1_000_000).toFixed(1);
    return m + ' tr VND';
  }
  return new Intl.NumberFormat('vi-VN').format(v) + ' VND';
};
export const fmtPct = (n: number | null | undefined, mult = 1) => ((n ?? 0) * mult).toFixed(1);
export const fmtDate = (d: string | null | undefined) => {
  if (!d) return '–';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '–' : date.toLocaleString('vi-VN');
};
export const safe = (s: string | null | undefined, fallback = '–') => s ?? fallback;
