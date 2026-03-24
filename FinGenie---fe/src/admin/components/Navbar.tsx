import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAdminAuthStore } from '../stores/adminAuthStore';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'FinGenie Admin' }: NavbarProps) {
  const { admin, logout } = useAdminAuthStore();

  return (
    <View style={styles.container}>
      {/* Brand */}
      <Text style={styles.brand}>{title}</Text>

      {/* Right side */}
      <View style={styles.right}>
        {admin && (
          <Text style={styles.adminLabel} numberOfLines={1}>
            {admin.name || admin.email}
          </Text>
        )}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    // Web shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  brand: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminLabel: {
    color: '#94a3b8',
    fontSize: 13,
    maxWidth: 160,
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
