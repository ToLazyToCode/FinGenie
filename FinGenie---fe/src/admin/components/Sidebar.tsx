import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type AdminPage = 'dashboard';

interface SidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

interface NavItem {
  id: AdminPage;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <View style={styles.container}>
      {/* Logo area */}
      <View style={styles.logoArea}>
        <Text style={styles.logoText}>🏦</Text>
        <Text style={styles.logoLabel}>Admin</Text>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.id)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: '#0f172a',
    height: '100%' as any,
    paddingTop: 16,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  logoText: {
    fontSize: 24,
  },
  logoLabel: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nav: {
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#3b82f6',
  },
  navIcon: {
    fontSize: 16,
  },
  navLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
