import React from 'react';
import {
  LayoutDashboard, Users, DollarSign, Trophy,
  BarChart3, FolderOpen, Settings, ChevronLeft,
  ChevronRight, LogOut, Sparkles
} from 'lucide-react';
import type { AdminPage } from '../types/admin';

interface SidebarProps {
  activePage: AdminPage;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: { id: AdminPage; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'gamification', label: 'Gamification', icon: Trophy },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'content', label: 'Content', icon: FolderOpen },
  { id: 'system', label: 'System', icon: Settings },
];

export function Sidebar({ activePage, onNavigate, onLogout, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div
      className={`h-screen fixed left-0 top-0 z-40 flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
        bg-navy-900 border-r border-white/[0.06]`}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 animate-glow-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap">FinGenie</span>
            <span className="text-[10px] font-semibold text-emerald-500/60 uppercase tracking-[0.2em] whitespace-nowrap">Admin Panel</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto admin-scroll">
        {navItems.map((item) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]'
                }
                ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400 transition-all duration-300" />
              )}
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-emerald-400' : 'group-hover:text-slate-200'}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-navy-800 border border-white/[0.08] text-xs font-medium text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 shadow-xl shadow-black/40 z-50">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rotate-45 bg-navy-800 border-l border-b border-white/[0.08]" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={onToggleCollapse}
          className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <ChevronRight className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform duration-200" />
            : <ChevronLeft className="w-[18px] h-[18px] group-hover:-translate-x-0.5 transition-transform duration-200" />
          }
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Log out' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] group-hover:rotate-[-8deg] transition-transform duration-200" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}

export type { AdminPage };
