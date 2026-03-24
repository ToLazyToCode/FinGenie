import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { KPICard } from '../components/Dashboard/KPICard';
import { StatusGrid } from '../components/Dashboard/StatusGrid';
import type {
  AdminDashboardStats,
  AdminRecentTransaction,
  AdminSystemHealth,
} from '../types/admin';

const BASE = 'http://localhost:8080/api/v1/admin/dashboard';

/**
 * Main admin dashboard page.
 * Fetches KPI stats, recent transactions, and system health in parallel.
 */
export function DashboardPage() {
  const { token } = useAdminAuthStore();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [transactions, setTransactions] = useState<AdminRecentTransaction[]>([]);
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const authHeader = { Authorization: `Bearer ${token ?? ''}` };

  const fetchAll = useCallback(async () => {
    setFetchError(null);
    try {
      const [statsRes, txnRes, healthRes] = await Promise.all([
        axios.get<AdminDashboardStats>(`${BASE}/stats`, { headers: authHeader }),
        axios.get<AdminRecentTransaction[]>(`${BASE}/recent-transactions?limit=10`, { headers: authHeader }),
        axios.get<AdminSystemHealth>(`${BASE}/system-health`, { headers: authHeader }),
      ]);
      setStats(statsRes.data);
      setTransactions(txnRes.data);
      setHealth(healthRes.data);
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.message as string | undefined) ?? 'Failed to load dashboard data'
        : 'Network error';
      setFetchError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAll();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard Overview</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Error */}
      {fetchError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      {/* KPI Cards */}
      <Text style={styles.sectionLabel}>Key Metrics</Text>
      <View style={styles.kpiRow}>
        <KPICard
          title="Active Users"
          value={stats?.totalActiveUsers ?? '–'}
          subtitle="Non-deleted accounts"
          accentColor="#3b82f6"
          icon="👥"
        />
        <KPICard
          title="New Today"
          value={stats?.newUsersToday ?? '–'}
          subtitle="Registered since midnight"
          accentColor="#22c55e"
          icon="🆕"
        />
        <KPICard
          title="Total Income"
          value={stats ? `₫${Number(stats.totalIncome).toLocaleString()}` : '–'}
          subtitle="All positive transactions"
          accentColor="#f59e0b"
          icon="💰"
        />
        <KPICard
          title="Transactions"
          value={stats?.totalTransactions ?? '–'}
          subtitle="All time"
          accentColor="#a78bfa"
          icon="📋"
        />
      </View>

      {/* System Health */}
      <Text style={styles.sectionLabel}>System Health</Text>
      <StatusGrid health={health} isLoading={false} />

      {/* Recent Transactions */}
      <Text style={styles.sectionLabel}>Recent Transactions</Text>
      <View style={styles.table}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.headerCell, { flex: 2 }]}>Account</Text>
          <Text style={[styles.tableCell, styles.headerCell, { flex: 1.5 }]}>Category</Text>
          <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>Amount</Text>
          <Text style={[styles.tableCell, styles.headerCell, { flex: 1 }]}>Date</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        ) : (
          transactions.map((txn) => (
            <View key={txn.transactionId} style={styles.tableRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.tableCell} numberOfLines={1}>
                  {txn.accountName ?? txn.accountEmail ?? '–'}
                </Text>
                {txn.accountEmail && txn.accountName ? (
                  <Text style={styles.subCell} numberOfLines={1}>{txn.accountEmail}</Text>
                ) : null}
              </View>
              <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                {txn.categoryName ?? '–'}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 1, color: txn.amount >= 0 ? '#22c55e' : '#ef4444' },
                ]}
              >
                {txn.amount >= 0 ? '+' : ''}
                {Number(txn.amount).toLocaleString()}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {txn.transactionDate ?? '–'}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  refreshBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  refreshText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  sectionLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 24,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  table: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#0f172a',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  headerCell: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCell: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  subCell: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 14,
  },
});
