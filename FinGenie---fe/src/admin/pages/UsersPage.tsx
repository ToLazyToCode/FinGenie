import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Search, Filter, ChevronLeft, ChevronRight, Download,
  Ban, ShieldCheck, Mail, X, Eye, MoreHorizontal,
  UserCheck, UserX, Crown, RefreshCw, Users as UsersIcon,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminUserResponse, AdminUserDetailResponse } from '../types/admin';
import {
  fmt, safe, statusColor,
  card, cardInner, cardStatic, section, elevated,
  tableWrapper, tableHeader, tableHeaderRight, tableRow, tableCell, tableDivider,
  badge, btnPrimary, btnSecondary, btnDanger, btnGhost,
  input as inputClass, pageTitle, pageSubtitle,
  accentMap, animSlideUp, animScaleIn
} from '../theme/tokens';

export function UsersPage() {
  const { accessToken } = useAdminAuth();
  const h = { Authorization: `Bearer ${accessToken}` };

  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Detail modal
  const [detailUser, setDetailUser] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Modals
  const [banModal, setBanModal] = useState<{ open: boolean; userId?: number; bulk?: boolean }>({ open: false });
  const [banReason, setBanReason] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  /* ── Fetch ─────────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const res = await apiClient.get(`/admin/users?${params}`, { headers: h });
      const data = res.data.data ?? res.data;
      setUsers(data.content ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalElements(data.totalElements ?? 0);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const fetchDetail = async (userId: number) => {
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/admin/users/${userId}`, { headers: h });
      setDetailUser(res.data.data ?? res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load user');
    } finally {
      setDetailLoading(false);
    }
  };

  /* ── Actions ───────────────────────────────────────── */
  const handleBan = async () => {
    if (!banReason.trim()) { toast.error('Reason required'); return; }
    try {
      if (banModal.bulk) {
        await apiClient.post('/admin/users/bulk-ban', { userIds: selectedRows, reason: banReason }, { headers: h });
        toast.success(`${selectedRows.length} user(s) banned`);
        setSelectedRows([]);
      } else if (banModal.userId) {
        await apiClient.post(`/admin/users/${banModal.userId}/ban`, { reason: banReason }, { headers: h });
        toast.success('User banned');
      }
      setBanModal({ open: false }); setBanReason('');
      void fetchUsers();
      setDetailUser(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to ban');
    }
  };

  const handleRestore = async (userId: number) => {
    try {
      await apiClient.post(`/admin/users/${userId}/restore`, {}, { headers: h });
      toast.success('User restored');
      void fetchUsers();
      setDetailUser(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to restore');
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/admin/users/export', {
        headers: h, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
      toast.success('Export downloaded');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Export failed');
    }
  };

  const handleBulkEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) { toast.error('Subject and body required'); return; }
    try {
      await apiClient.post('/admin/users/bulk-email', {
        userIds: selectedRows, subject: emailSubject, body: emailBody,
      }, { headers: h });
      toast.success(`Email sent to ${selectedRows.length} user(s)`);
      setEmailModal(false); setEmailSubject(''); setEmailBody('');
      setSelectedRows([]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send email');
    }
  };

  const toggleRow = (id: number) =>
    setSelectedRows(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelectedRows(prev => prev.length === users.length ? [] : users.map(u => u.id));

  /* ── Render ────────────────────────────────────────── */
  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={pageTitle}>User Management</h1>
          <p className={pageSubtitle}>{fmt(totalElements)} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className={`${btnPrimary} flex items-center gap-2`}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => { void fetchUsers(); }}
            className={`${btnGhost} p-2`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by name or email..."
            className={`${inputClass} pl-10`}
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className={inputClass}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="BANNED">Banned</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <span className="text-sm text-emerald-400 font-medium">{selectedRows.length} selected</span>
          <div className="flex gap-2">
            <button onClick={() => setBanModal({ open: true, bulk: true })}
              className={`${btnDanger} flex items-center gap-1.5 text-xs px-3 py-1.5`}>
              <Ban className="w-3.5 h-3.5" /> Ban Selected
            </button>
            <button onClick={() => setEmailModal(true)}
              className={`${btnPrimary} flex items-center gap-1.5 text-xs px-3 py-1.5`}>
              <Mail className="w-3.5 h-3.5" /> Email Selected
            </button>
            <button onClick={() => setSelectedRows([])}
              className={`${btnGhost} flex items-center gap-1.5 text-xs px-3 py-1.5`}>
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={tableWrapper}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3 text-left w-10">
                  <input type="checkbox" checked={selectedRows.length === users.length && users.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-600 bg-white/[0.04] text-emerald-500 focus:ring-emerald-500/30" />
                </th>
                <th className={tableHeader}>User</th>
                <th className={tableHeader}>Status</th>
                <th className={tableHeader}>Role</th>
                <th className={tableHeader}>KYC</th>
                <th className={tableHeader}>Joined</th>
                <th className={tableHeaderRight}>Actions</th>
              </tr>
            </thead>
            <tbody className={tableDivider}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="w-4 h-4 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-40 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-16 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-12 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-5 w-20 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 rounded skeleton" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-8 rounded skeleton ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-slate-600">
                    <UsersIcon className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const sc = statusColor(user.status ?? '');
                  return (
                    <tr key={user.id} className={tableRow}>
                      <td className={tableCell}>
                        <input type="checkbox" checked={selectedRows.includes(user.id)} onChange={() => toggleRow(user.id)}
                          className="rounded border-slate-600 bg-white/[0.04] text-emerald-500 focus:ring-emerald-500/30" />
                      </td>
                      <td className={tableCell}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
                            {(user.name?.[0] ?? (user.email ?? '?')[0]).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-200 flex items-center gap-1.5">
                              {safe(user.name)}
                              {user.isPremium && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                            </div>
                            <div className="text-xs text-slate-500">{safe(user.email)}</div>
                          </div>
                        </div>
                      </td>
                      <td className={tableCell}>
                        <span className={`${badge} ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {safe(user.status, 'UNKNOWN')}
                        </span>
                      </td>
                      <td className={`${tableCell} text-slate-400 text-xs`}>{safe(user.role)}</td>
                      <td className={tableCell}>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium
                          ${(user.kycStatus ?? '') === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400'
                            : (user.kycStatus ?? '') === 'PENDING' ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-slate-500/10 text-slate-500'}`}>
                          {safe(user.kycStatus, 'N/A')}
                        </span>
                      </td>
                      <td className={`${tableCell} text-slate-500 text-xs`}>
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '–'}
                      </td>
                      <td className={`${tableCell} text-right`}>
                        <button onClick={() => fetchDetail(user.id)}
                          className={`${btnGhost} p-2`}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Rows:</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
              className={`${inputClass} px-2 py-1 text-xs`}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className={`${btnGhost} p-1.5 disabled:opacity-30`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
              className={`${btnGhost} p-1.5 disabled:opacity-30`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── User Detail Modal ────────────────────────── */}
      {(detailUser || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${elevated} border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl ${animScaleIn}`}>
            {detailLoading ? (
              <div className="p-10 text-center">
                <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : detailUser && (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-lg font-bold text-emerald-400">
                      {(detailUser.name?.[0] ?? (detailUser.email ?? '?')[0]).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {safe(detailUser.name)}
                        {detailUser.isPremium && <Crown className="w-4 h-4 text-amber-400" />}
                      </h2>
                      <p className="text-xs text-slate-500">{safe(detailUser.email)}</p>
                    </div>
                  </div>
                  <button onClick={() => setDetailUser(null)}
                    className={`${btnGhost} p-2`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status + Info */}
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoItem label="Status" value={safe(detailUser.status, 'UNKNOWN')}
                      badgeClass={`${badge} ${statusColor(detailUser.status ?? '').bg} ${statusColor(detailUser.status ?? '').text}`} />
                    <InfoItem label="Role" value={safe(detailUser.role)} />
                    <InfoItem label="Phone" value={safe(detailUser.phone)} />
                    <InfoItem label="KYC" value={safe(detailUser.kycStatus, 'N/A')}
                      badgeClass={(detailUser.kycStatus ?? '') === 'VERIFIED' ? 'px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400' : 'px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400'} />
                    <InfoItem label="Joined" value={detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleString('vi-VN') : '–'} />
                    <InfoItem label="Last Login" value={detailUser.lastLogin ? new Date(detailUser.lastLogin).toLocaleString('vi-VN') : 'Never'} />
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-grid">
                    <MiniStat label="Balance" value={`₫${fmt(detailUser.totalBalance ?? 0)}`} />
                    <MiniStat label="Income" value={`₫${fmt(detailUser.totalIncome ?? 0)}`} accent="emerald" />
                    <MiniStat label="Spent" value={`₫${fmt(detailUser.totalSpent ?? 0)}`} accent="red" />
                    <MiniStat label="Transactions" value={fmt(detailUser.transactionCount ?? 0)} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {detailUser.status === 'BANNED' ? (
                      <button onClick={() => handleRestore(detailUser.id)}
                        className={`${btnPrimary} flex items-center gap-2`}>
                        <ShieldCheck className="w-4 h-4" /> Restore User
                      </button>
                    ) : (
                      <button onClick={() => setBanModal({ open: true, userId: detailUser.id })}
                        className={`${btnDanger} flex items-center gap-2`}>
                        <Ban className="w-4 h-4" /> Ban User
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Ban Modal ────────────────────────────────── */}
      {banModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${elevated} border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl ${animScaleIn}`}>
            <h2 className="text-lg font-bold text-white mb-1">
              {banModal.bulk ? `Ban ${selectedRows.length} Users` : 'Ban User'}
            </h2>
            <p className="text-sm text-slate-500 mb-4">This action will restrict user access.</p>
            <textarea
              value={banReason} onChange={e => setBanReason(e.target.value)}
              placeholder="Reason for banning (required)..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={handleBan}
                className={`${btnDanger} flex-1`}>
                Confirm Ban
              </button>
              <button onClick={() => { setBanModal({ open: false }); setBanReason(''); }}
                className={`${btnSecondary} flex-1`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Email Modal ─────────────────────────── */}
      {emailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`${elevated} border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 shadow-2xl ${animScaleIn}`}>
            <h2 className="text-lg font-bold text-white mb-1">Send Bulk Email</h2>
            <p className="text-sm text-slate-500 mb-4">Send to {selectedRows.length} selected user(s)</p>
            <div className="space-y-3">
              <input
                type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
                className={inputClass}
              />
              <textarea
                value={emailBody} onChange={e => setEmailBody(e.target.value)}
                placeholder="Email body..."
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleBulkEmail}
                className={`${btnPrimary} flex-1 flex items-center justify-center gap-2`}>
                <Mail className="w-4 h-4" /> Send
              </button>
              <button onClick={() => { setEmailModal(false); setEmailSubject(''); setEmailBody(''); }}
                className={`${btnSecondary} flex-1`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────── */
function InfoItem({ label, value, badgeClass }: { label: string; value: string; badgeClass?: string }) {
  return (
    <div className={`${section} p-3`}>
      <span className="text-xs text-slate-500 block mb-1">{label}</span>
      {badgeClass ? (
        <span className={badgeClass}>{value}</span>
      ) : (
        <span className="text-sm text-slate-200 font-medium">{value}</span>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'red' }) {
  const color = accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className={`${card} ${cardInner} ${animSlideUp} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 text-center`}>
      <span className="text-xs text-slate-500 block mb-1">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}
