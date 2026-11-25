import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  Sun, 
  Moon, 
  Layers, 
  Clock, 
  Home, 
  Sparkles, 
  FolderKanban, 
  ChevronDown, 
  LogOut, 
  Lock, 
  User, 
  ExternalLink,
  X
} from 'lucide-react';

interface SpaceNavbarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const SpaceNavbar: React.FC<SpaceNavbarProps> = ({ theme, toggleTheme }) => {
  const { user, isGuest, setIsAuthModalOpen, signOut } = useAuth();
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const omniTimeUrl = import.meta.env.VITE_OMNI_TIME_URL || 'https://omni-tm.ujjwalnikam100.workers.dev';

  const ecosystemApps = [
    { id: 'space', name: 'OMNI Space', icon: Layers, status: 'active', url: '#' },
    { id: 'time', name: 'OMNI Time', icon: Clock, status: 'active', url: omniTimeUrl },
    { id: 'home', name: 'OMNI Home', icon: Home, status: 'coming_soon', url: '#' },
    { id: 'intelligence', name: 'OMNI Intelligence', icon: Sparkles, status: 'coming_soon', url: '#' },
    { id: 'flow', name: 'OMNI Flow', icon: FolderKanban, status: 'paused', url: '#' }
  ];

  return (
    <header className="h-14 border-b border-[var(--border-line)] bg-[var(--header-bg)] backdrop-blur-md px-3 sm:px-4 flex items-center justify-between select-none relative z-30 transition-colors">
      {/* Left: OMNI Menu & Space Brand Badge */}
      <div className="flex items-center gap-2">
        {/* THREE-LINE MENU BAR BUTTON (HAMBURGER) */}
        <button
          onClick={() => setIsMainMenuOpen(prev => !prev)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
            isMainMenuOpen 
              ? 'bg-[#16A085]/20 text-[#16A085] border-[#16A085]/40 ring-2 ring-[#16A085]/20' 
              : 'text-[var(--text-main)] bg-white/[0.04] hover:bg-white/[0.08] border-[var(--border-line)]'
          }`}
          title="Open OMNI Ecosystem Menu"
        >
          <Menu className="w-4 h-4 text-[#16A085]" />
          <span className="text-xs font-semibold hidden sm:inline">Menu</span>
        </button>

        {/* Clean OMNI Space Brand Badge */}
        <div className="flex items-center gap-2 ml-1">
          <div className="w-6 h-6 rounded-md bg-[#16A085] flex items-center justify-center shadow-sm shadow-[#16A085]/30">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-xs tracking-wider uppercase text-[#16A085]">OMNI</span>
            <span className="font-medium text-sm text-[var(--text-main)]">Space</span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle & User Auth */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 dark:hover:bg-white/5 rounded-lg transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
        </button>

        {/* User Authentication */}
        {user ? (
          <div className="relative shrink-0">
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 p-1 pr-2 rounded-lg bg-[#16A085]/10 hover:bg-[#16A085]/20 border border-[#16A085]/30 transition shadow-sm"
            >
              <div className="w-6 h-6 rounded-md bg-[#16A085] flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs text-[var(--text-main)] font-medium max-w-[110px] truncate hidden sm:inline">
                {user.email?.split('@')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 glass-panel rounded-xl shadow-2xl p-2 z-50 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-[var(--border-line)]">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Signed in as</p>
                    <p className="text-xs font-medium text-[var(--text-main)] truncate mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : isGuest ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-400 dark:border-amber-500/25 text-amber-900 dark:text-amber-300 text-[10px] font-bold shadow-sm">
              <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Guest</span>
            </span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A085] hover:bg-[#138d75] text-white text-xs font-semibold shadow-md shadow-[#16A085]/30 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A085] hover:bg-[#138d75] text-white text-xs font-semibold shadow-md shadow-[#16A085]/30 transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>

      {/* THREE-LINE MENU BAR FLYOUT DRAWER / MODAL */}
      {isMainMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-100" 
            onClick={() => setIsMainMenuOpen(false)} 
          />
          <div className="absolute top-14 left-2 sm:left-4 mt-1.5 w-80 glass-panel rounded-2xl shadow-2xl p-4 z-50 border border-[var(--border-line)] bg-[var(--surface-bg)] text-[var(--text-main)] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-line)] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#16A085] flex items-center justify-center text-white shadow-sm shadow-[#16A085]/30">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">OMNI Ecosystem</h4>
                  <p className="text-[10px] text-[var(--text-muted)]">Connected Productivity Suite</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMainMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-[var(--text-main)] rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ecosystem Modules List */}
            <div className="space-y-1">
              {ecosystemApps.map(app => {
                const Icon = app.icon;
                const isCurrent = app.id === 'space';
                const isAvailable = app.status === 'active';
                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      if (isCurrent) {
                        setIsMainMenuOpen(false);
                      } else if (app.id === 'time') {
                        window.open(app.url, '_blank');
                        setIsMainMenuOpen(false);
                      }
                    }}
                    className={`flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? 'bg-[#16A085]/20 text-[#16A085] border border-[#16A085]/30 font-semibold'
                        : isAvailable
                        ? 'text-[var(--text-main)] hover:bg-white/10 cursor-pointer font-medium'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isCurrent ? 'text-[#16A085]' : app.id === 'time' ? 'text-purple-400' : 'text-slate-400'}`} />
                      <span>{app.name}</span>
                    </div>

                    {isCurrent ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#16A085]/30 text-[#16A085]">Current App</span>
                    ) : app.id === 'time' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold flex items-center gap-1">
                        <span>Open Time</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-muted)]">Coming Soon</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </header>
  );
};
