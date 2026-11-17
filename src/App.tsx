import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SpaceProvider } from './context/SpaceContext';
import { SpaceNavbar } from './components/layout/SpaceNavbar';
import { SpaceLayout } from './components/space/SpaceLayout';
import { AuthModal } from './components/auth/AuthModal';
import { WelcomeGateway } from './components/auth/WelcomeGateway';
import { Layers } from 'lucide-react';

function AppContent({ theme, toggleTheme }: { theme: 'dark' | 'light'; toggleTheme: () => void }) {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0d131f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#16A085] flex items-center justify-center animate-pulse shadow-lg shadow-[#16A085]/30">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-slate-400 font-mono tracking-widest uppercase">Loading OMNI Space...</span>
        </div>
      </div>
    );
  }

  // If not logged in and not guest, gate with the Welcome Gateway!
  if (!user && !isGuest) {
    return <WelcomeGateway theme={theme} toggleTheme={toggleTheme} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--canvas-bg)] text-[var(--text-main)] antialiased select-none transition-colors">
      <SpaceNavbar theme={theme} toggleTheme={toggleTheme} />
      <div className="flex-1 flex overflow-hidden relative">
        <SpaceLayout />
      </div>
      <AuthModal />
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('omni_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('omni_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return (
    <AuthProvider>
      <SpaceProvider>
        <AppContent theme={theme} toggleTheme={toggleTheme} />
      </SpaceProvider>
    </AuthProvider>
  );
}
