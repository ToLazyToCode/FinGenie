import React, { useState, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useTailwind } from '../hooks/useTailwind';
import { useAdminAuth } from '../hooks/useAdminAuth';
import type { AdminPage } from '../types/admin';
import { DashboardPage } from './DashboardPage';
import { UsersPage } from './UsersPage';
import { FinancialPage } from './FinancialPage';
import { GamificationPage } from './GamificationPage';
import { AnalyticsPage } from './AnalyticsPage';
import { ContentPage } from './ContentPage';
import { SystemPage } from './SystemPage';

const pageTitles: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  financial: 'Financial',
  gamification: 'Gamification',
  analytics: 'Analytics',
  content: 'Content Management',
  system: 'System Settings',
};

export function AdminLayout() {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout } = useAdminAuth();
  const twReady = useTailwind();

  const currentPage = useMemo(() => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'users': return <UsersPage />;
      case 'financial': return <FinancialPage />;
      case 'gamification': return <GamificationPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'content': return <ContentPage />;
      case 'system': return <SystemPage />;
      default: return <DashboardPage />;
    }
  }, [activePage]);

  // Show loading while Tailwind loads
  if (!twReady) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', backgroundColor: '#070b14', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: '#10b981',
              animation: `bounce-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
              opacity: 0.4,
            }} />
          ))}
        </div>
        <style>{`
          @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(16,185,129,0.2), 0 0 40px rgba(6,182,212,0.1); transform: scale(1); }
            50% { box-shadow: 0 0 30px rgba(16,185,129,0.35), 0 0 60px rgba(6,182,212,0.2); transform: scale(1.05); }
          }
          @keyframes bounce-dot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-navy-950 font-sans text-slate-300 admin-scroll">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f1629',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            fontSize: '13px',
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
          },
          success: {
            duration: 3000,
            iconTheme: { primary: '#10b981', secondary: '#070b14' },
          },
          error: {
            duration: 5000,
            iconTheme: { primary: '#ef4444', secondary: '#070b14' },
          },
        }}
      />

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={logout}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <Navbar
        pageTitle={pageTitles[activePage]}
        adminName={admin?.name || 'Admin'}
        collapsed={collapsed}
      />

      {/* Main content area with page transition */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ease-in-out
          ${collapsed ? 'ml-[72px]' : 'ml-[240px]'}`}
      >
        <div key={activePage} className="p-6 page-enter">
          {currentPage}
        </div>
      </main>
    </div>
  );
}
