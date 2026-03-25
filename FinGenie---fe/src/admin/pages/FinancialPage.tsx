import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  DollarSign, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight,
  RefreshCw, Filter, CheckCircle, XCircle, RotateCcw, Wifi, WifiOff,
  TrendingUp, Activity, CreditCard,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type {
  AdminFinancialSummaryResponse, AdminTransactionResponse,
  AdminRefundResponse, AdminPaymentGatewayResponse,
} from '../types/admin';
import {
  fmt, fmtMoney, fmtPct, fmtDate, safe, statusColor,
  card, cardInner, section, elevated,
  tableWrapper, tableHeader, tableHeaderRight, tableRow, tableCell, tableDivider,
  badge, btnPrimary, btnSecondary, btnDanger,
  input as inputClass, tabContainer, tabActive, tabInactive,
  pageTitle, pageSubtitle, accentMap, colors,
  chartTooltipStyle, animSlideUp, animScaleIn,
} from '../theme/tokens';

type Tab = 'overview' | 'transactions' | 'refunds';

export function FinancialPage() {
  const { accessToken } = useAdminAuth();
  const h = { Authorization: `Bearer ${accessToken}` };

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AdminFinancialSummaryResponse | null>(null);
  const [gateways, setGateways] = useState<AdminPaymentGatewayResponse[]>([]);
  const [transactions, setTransactions] = useState<AdminTransactionResponse[]>([]);
  const [refunds, setRefunds] = useState<AdminRefundResponse[]>([]);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [txnStatus, setTxnStatus] = useState('ALL');
  const [gateway, setGateway] = useState('ALL');
  const [refundStatus, setRefundStatus] = useState('PENDING');

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{
    open: boolean; title: string; message: string; color: string;
    inputLabel?: string; inputRequired?: boolean;
    onConfirm: (v?: string) => void;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');

  /* ── Fetchers ──────────────────────────────────────── */
  const fetchSummary = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([
        apiClient.get('/admin/financial/summary', { headers: h }),
        apiClient.get('/admin/payment-gateways', { headers: h }),
      ]);
      setSummary(s.data.data ?? s.data);
      setGateways(g.data.data ?? g.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load financial data');
    }
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTransactions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (txnStatus !== 'ALL') params.append('status', txnStatus);
      if (gateway !== 'ALL') params.append('gateway', gateway);
      const res = await apiClient.get(`/admin/transactions?${params}`, { headers: h });
      const data = res.data.data ?? res.data;
      setTransactions(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to fetch transactions');
    }
  }, [page, pageSize, txnStatus, gateway, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRefunds = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: refundStatus });
      const res = await apiClient.get(`/admin/refunds?${params}`, { headers: h });
      setRefunds(res.data.data ?? res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to fetch refunds');
    }
  }, [refundStatus, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchTransactions(), fetchRefunds()])
      .finally(() => setLoading(false));
  }, [fetchSummary, fetchTransactions, fetchRefunds]);

  /* ── Actions ───────────────────────────────────────── */
  const approveRefund = (id: number) => {
    setConfirmAction({
      open: true, title: 'Approve Refund', color: 'emerald',
      message: `Approve refund #${id}? This will process the refund.`,
      inputLabel: 'Notes (optional)',
      onConfirm: async (notes) => {
        try {
          await apiClient.post(`/admin/refunds/${id}/approve`, { notes }, { headers: h });
          toast.success('Refund approved');
          void fetchRefunds();
        } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
        setConfirmAction(null); setConfirmInput('');
      },
    });
  };

  const rejectRefund = (id: number) => {
    setConfirmAction({
      open: true, title: 'Reject Refund', color: 'red',
      message: `Reject refund #${id}? This cannot be undone.`,
      inputLabel: 'Reason', inputRequired: true,
      onConfirm: async (reason) => {
        try {
          await apiClient.post(`/admin/refunds/${id}/reject`, { reason: reason || 'Rejected' }, { headers: h });
          toast.success('Refund rejected');
          void fetchRefunds();
        } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
        setConfirmAction(null); setConfirmInput('');
      },
    });
  };

  const initiateRefund = (txnId: number, amount: number) => {
    setConfirmAction({
      open: true, title: 'Initiate Refund', color: 'cyan',
      message: `Refund ${fmtMoney(amount)} for transaction #${txnId}?`,
      inputLabel: 'Reason', inputRequired: true,
      onConfirm: async (reason) => {
        try {
          await apiClient.post(`/admin/transactions/${txnId}/refund`, { amount, reason }, { headers: h });
          toast.success('Refund initiated');
          void fetchTransactions();
        } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed'); }
        setConfirmAction(null); setConfirmInput('');
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 rounded-2xl skeleton" />
          ))}
        </div>
        <div className="h-64 rounded-2xl skeleton" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'refunds', label: `Refunds (${refunds.length})` },
  ];

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>Financial</h1>
          <p className={pageSubtitle}>Revenue, transactions &amp; refund management</p>
        </div>
        <button
          onClick={() => { void fetchSummary(); void fetchTransactions(); void fetchRefunds(); }}
          className={`${btnSecondary} flex items-center gap-2`}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 stagger-grid">
        <KPICard icon={DollarSign} label="24h Volume" value={fmtMoney(summary?.volume24h ?? 0)}
          change={summary?.volumeChange24h} accent="emerald" />
        <KPICard icon={TrendingUp} label="7d Revenue" value={fmtMoney(summary?.revenue7d ?? 0)}
          change={summary?.revenueChange7d} accent="cyan" />
        <KPICard icon={Activity} label="Success Rate"
          value={`${((1 - (summary?.refundRate ?? 0) / 100) * 100).toFixed(1)}%`}
          accent="violet" />
        <KPICard icon={CreditCard} label="Total Orders" value={fmt(summary?.totalPaidOrders ?? 0)}
          accent="amber" />
      </div>

      {/* Tabs */}
      <div className={tabContainer}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? tabActive : tabInactive}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {gateways.map(gw => {
              const gwDot = statusColor(gw.status ?? 'UNKNOWN').dot;
              return (
                <div key={gw.gatewayName} className={`${card} ${cardInner} animate-slide-up`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-200">{gw.gatewayName}</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${gwDot}`} />
                      <span className="text-xs text-slate-500">{gw.status ?? 'UNKNOWN'}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-slate-500">Volume</span>
                      <div className="text-sm font-semibold text-white mt-0.5">{fmtMoney(gw.totalVolume)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Success</span>
                      <div className="text-sm font-semibold text-emerald-400 mt-0.5">{fmtPct(gw.successRate, 100)}%</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Transactions</span>
                      <div className="text-sm font-semibold text-white mt-0.5">{fmt(gw.transactionCount)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transactions Tab ─────────────────────────── */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <select value={txnStatus} onChange={e => { setTxnStatus(e.target.value); setPage(0); }}
              className={inputClass}>
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select value={gateway} onChange={e => { setGateway(e.target.value); setPage(0); }}
              className={inputClass}>
              <option value="ALL">All Gateways</option>
              <option value="PAYOS">PayOS</option>
              <option value="VNPAY">VNPay</option>
            </select>
          </div>

          <div className={tableWrapper}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className={tableHeader}>ID</th>
                    <th className={tableHeader}>User</th>
                    <th className={tableHeader}>Plan</th>
                    <th className={tableHeaderRight}>Amount</th>
                    <th className={tableHeader}>Status</th>
                    <th className={tableHeader}>Gateway</th>
                    <th className={tableHeader}>Date</th>
                    <th className={tableHeaderRight}>Action</th>
                  </tr>
                </thead>
                <tbody className={tableDivider}>
                  {transactions.map(txn => {
                    const sc = statusColor(txn.status);
                    return (
                      <tr key={txn.id} className={tableRow}>
                        <td className={`${tableCell} font-mono text-xs text-slate-500`}>{txn.id}</td>
                        <td className={`${tableCell} text-xs text-slate-300`}>{safe(txn.accountEmail)}</td>
                        <td className={`${tableCell} text-xs text-slate-400`}>{safe(txn.planTitle)}</td>
                        <td className={`${tableCell} text-right font-semibold text-white tabular-nums`}>{fmtMoney(txn.amount)}</td>
                        <td className={tableCell}>
                          <span className={`${badge} ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {safe(txn.status, 'UNKNOWN')}
                          </span>
                        </td>
                        <td className={`${tableCell} text-xs text-slate-400`}>{safe(txn.gateway)}</td>
                        <td className={`${tableCell} text-xs text-slate-500`}>{fmtDate(txn.createdAt)}</td>
                        <td className={`${tableCell} text-right`}>
                          {txn.status === 'PAID' && (
                            <button onClick={() => initiateRefund(txn.id, txn.amount)}
                              className={btnSecondary}>
                              <RotateCcw className="w-3 h-3 inline mr-1" /> Refund
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-slate-600">No transactions</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
              <span className="text-xs text-slate-500">Page {page + 1} of {totalPages || 1}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Refunds Tab ──────────────────────────────── */}
      {tab === 'refunds' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
              <button key={s} onClick={() => setRefundStatus(s)}
                className={refundStatus === s ? tabActive : tabInactive}>
                {s}
              </button>
            ))}
          </div>

          <div className={tableWrapper}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className={tableHeader}>ID</th>
                    <th className={tableHeader}>User</th>
                    <th className={tableHeaderRight}>Amount</th>
                    <th className={tableHeader}>Reason</th>
                    <th className={tableHeader}>Status</th>
                    <th className={tableHeader}>Created</th>
                    {refundStatus === 'PENDING' && (
                      <th className={tableHeaderRight}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className={tableDivider}>
                  {refunds.map(r => {
                    const sc = statusColor(r.status);
                    return (
                      <tr key={r.id} className={tableRow}>
                        <td className={`${tableCell} font-mono text-xs text-slate-500`}>{r.id}</td>
                        <td className={`${tableCell} text-xs text-slate-300`}>{safe(r.accountEmail)}</td>
                        <td className={`${tableCell} text-right font-semibold text-white tabular-nums`}>{fmtMoney(r.amount)}</td>
                        <td className={`${tableCell} text-xs text-slate-400 max-w-[200px] truncate`}>{safe(r.reason)}</td>
                        <td className={tableCell}>
                          <span className={`${badge} ${sc.bg} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {safe(r.status, 'UNKNOWN')}
                          </span>
                        </td>
                        <td className={`${tableCell} text-xs text-slate-500`}>{fmtDate(r.createdAt)}</td>
                        {refundStatus === 'PENDING' && (
                          <td className={`${tableCell} text-right space-x-1`}>
                            <button onClick={() => approveRefund(r.id)}
                              className={btnPrimary}>
                              <CheckCircle className="w-3 h-3 inline mr-1" />Approve
                            </button>
                            <button onClick={() => rejectRefund(r.id)}
                              className={btnDanger}>
                              <XCircle className="w-3 h-3 inline mr-1" />Reject
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {refunds.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-600">No refunds</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ────────────────────────────── */}
      {confirmAction?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${elevated} rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in`}>
            <h2 className="text-lg font-bold text-white mb-1">{confirmAction.title}</h2>
            <p className="text-sm text-slate-500 mb-4">{confirmAction.message}</p>
            {confirmAction.inputLabel && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{confirmAction.inputLabel}</label>
                <textarea
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  rows={2}
                  className={`${inputClass} w-full resize-none`}
                />
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => confirmAction.onConfirm(confirmInput)}
                disabled={confirmAction.inputRequired && !confirmInput.trim()}
                className={`flex-1 disabled:opacity-50 ${
                  confirmAction.color === 'red' ? btnDanger : btnPrimary
                }`}
              >
                Confirm
              </button>
              <button
                onClick={() => { setConfirmAction(null); setConfirmInput(''); }}
                className={`flex-1 ${btnSecondary}`}
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

/* ── KPI Card ────────────────────────────────────────── */
function KPICard({ icon: Icon, label, value, change, accent }: {
  icon: React.ElementType; label: string; value: string; change?: number; accent: keyof typeof accentMap;
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
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {change >= 0
            ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            : <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
          <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
