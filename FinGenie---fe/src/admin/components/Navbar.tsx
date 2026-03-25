import React from 'react';
import { Bell, Search, User } from 'lucide-react';

interface NavbarProps {
  pageTitle: string;
  adminName: string;
  collapsed: boolean;
}

export function Navbar({ pageTitle, adminName, collapsed }: NavbarProps) {
  return (
    <div
      className={`h-16 fixed top-0 right-0 z-30 flex items-center justify-between px-6
        transition-all duration-300 ease-in-out
        bg-navy-950/80 backdrop-blur-xl border-b border-white/[0.06]
        ${collapsed ? 'left-[72px]' : 'left-[240px]'}`}
    >
      {/* Left - Page title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
          <Search className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <button className="group relative p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all duration-200">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-navy-950 group-hover:animate-ping" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-navy-950" />
        </button>

        {/* Divider */}
        <div className="w-px h-7 bg-white/[0.06] mx-2" />

        {/* Admin profile */}
        <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all duration-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-white leading-tight">{adminName}</span>
            <span className="text-[10px] text-slate-500 leading-tight font-medium">Administrator</span>
          </div>
        </button>
      </div>
    </div>
  );
}
