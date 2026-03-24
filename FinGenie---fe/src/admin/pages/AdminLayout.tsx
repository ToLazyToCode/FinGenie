import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Navbar } from '../components/Navbar';
import { Sidebar, type AdminPage } from '../components/Sidebar';
import { DashboardPage } from './DashboardPage';

/**
 * Main admin layout: fixed Navbar at top, Sidebar on the left,
 * and the active page content fills the remaining space.
 */
export function AdminLayout() {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <View style={styles.root}>
      {/* Top navigation bar */}
      <Navbar title="FinGenie Admin" />

      {/* Body: sidebar + content */}
      <View style={styles.body}>
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <View style={styles.content}>{renderPage()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    flexDirection: 'column',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden' as any,
  },
  content: {
    flex: 1,
    overflow: 'scroll' as any,
    padding: 24,
  },
});
