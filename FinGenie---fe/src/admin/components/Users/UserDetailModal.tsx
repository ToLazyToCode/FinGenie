/**
 * User detail modal with tabs
 */

import { useState } from 'react';
import type { AdminUserDetailResponse } from '../../types/admin';

interface UserDetailModalProps {
  user: AdminUserDetailResponse;
  onClose: () => void;
  onBan: (userId: number, reason: string) => Promise<void>;
  authHeader: { Authorization: string };
}

type Tab = 'info' | 'activity' | 'transactions' | 'wallets';

export default function UserDetailModal({
  user,
  onClose,
  onBan,
  authHeader,
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [banReason, setBanReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBan = async () => {
    if (!banReason.trim()) return;
    setIsSubmitting(true);
    try {
      await onBan(user.id, banReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'info', label: 'Info', icon: 'ℹ️' },
    { id: 'activity', label: 'Activity', icon: '📅' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'wallets', label: 'Wallets', icon: '💰' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-100">{user.email}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-700/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-cyan-500 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Email</label>
                  <p className="text-slate-100 mt-1">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Name</label>
                  <p className="text-slate-100 mt-1">{user.name || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Phone</label>
                  <p className="text-slate-100 mt-1">{user.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Status</label>
                  <p className="text-slate-100 mt-1">{user.status}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">KYC Status</label>
                  <p className="text-slate-100 mt-1">{user.kycStatus || 'PENDING'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Joined</label>
                  <p className="text-slate-100 mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Total Balance</label>
                  <p className="text-slate-100 mt-1">${user.totalBalance?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Total Spent</label>
                  <p className="text-slate-100 mt-1">${user.totalSpent?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              {user.status !== 'BANNED' && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Ban User</label>
                  <textarea
                    placeholder="Reason for banning..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                    rows={2}
                  />
                  <button
                    onClick={handleBan}
                    disabled={!banReason.trim() || isSubmitting}
                    className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold transition-colors"
                  >
                    {isSubmitting ? 'Banning...' : 'Ban This User'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-slate-400">
              <p>Login history will appear here (requires LoginLog table)</p>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="text-slate-400">
              <p>Transactions will appear here</p>
            </div>
          )}

          {activeTab === 'wallets' && (
            <div className="text-slate-400">
              <p>Wallets will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
