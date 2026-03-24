import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AdminSystemHealth } from '../../types/admin';

interface StatusGridProps {
  health: AdminSystemHealth | null;
  isLoading: boolean;
}

/**
 * Displays system health metrics in a 2×2 grid of status tiles.
 */
export function StatusGrid({ health, isLoading }: StatusGridProps) {
  if (isLoading || !health) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {isLoading ? 'Loading system health…' : 'No health data'}
        </Text>
      </View>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'UP') return '#22c55e';
    if (s === 'DEGRADED') return '#f59e0b';
    return '#ef4444';
  };

  const tiles = [
    {
      label: 'Overall',
      value: health.status,
      color: statusColor(health.status),
      icon: '🔥',
    },
    {
      label: 'Database',
      value: health.databaseStatus,
      color: statusColor(health.databaseStatus),
      icon: '🗄️',
    },
    {
      label: 'Heap Usage',
      value: `${health.heapUsagePercent.toFixed(1)}%`,
      sub: `${health.heapUsedMb} / ${health.heapMaxMb} MB`,
      color: health.heapUsagePercent > 80 ? '#ef4444' : '#3b82f6',
      icon: '🧠',
    },
    {
      label: 'Threads',
      value: String(health.activeThreads),
      sub: `Uptime: ${formatUptime(health.uptimeSeconds)}`,
      color: '#a78bfa',
      icon: '⚙️',
    },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <View style={styles.tileHeader}>
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
          <Text style={[styles.tileValue, { color: tile.color }]}>{tile.value}</Text>
          {tile.sub ? <Text style={styles.tileSub}>{tile.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 140,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  tileIcon: {
    fontSize: 16,
  },
  tileLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  tileValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  tileSub: {
    color: '#64748b',
    fontSize: 11,
  },
  placeholder: {
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
});
