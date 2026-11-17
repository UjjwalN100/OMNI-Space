import React, { useState } from 'react';
import { 
  Layers, 
  ArrowRight, 
  Check, 
  User, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Loader2, 
  Sun, 
  Moon,
  HardDrive,
  FileText,
  FileSpreadsheet,
  Presentation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface WelcomeGatewayProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export const WelcomeGateway: React.FC<WelcomeGatewayProps> = ({ theme, toggleTheme }) => {
  const { signInWithGoogle, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-[var(--canvas-bg)] text-[var(--text-main)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#16A085] flex items-center justify-center text-white shadow-md shadow-[#16A085]/30">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-xs tracking-wider uppercase text-[#16A085]">OMNI</span>
            <span className="font-semibold text-base text-[var(--text-main)]">Space</span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-[var(--text-main)] hover:bg-white/10 rounded-xl transition"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-400" />}
        </button>
      </div>

      {/* Main Content Hero */}
      <div className="max-w-4xl w-full mx-auto my-auto text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16A085]/10 border border-[#16A085]/20 text-[#16A085] text-xs font-semibold mb-6">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Unified Cloud Storage & Document Suite</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-main)] mb-4 max-w-2xl mx-auto leading-tight">
          Your files, spreadsheets, and ideas in <span className="text-[#16A085]">one place</span>.
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl mx-auto mb-8">
          A distraction-free alternative to Google Drive and Microsoft OneDrive with native office creation and zero-friction ecosystem linking.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-10">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-[#16A085] hover:bg-[#138d75] text-white font-bold text-sm shadow-xl shadow-[#16A085]/30 transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            onClick={continueAsGuest}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-line)] text-[var(--text-main)] font-semibold text-sm transition"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Try as Guest</span>
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 max-w-md mx-auto mb-6">
            {error}
          </p>
        )}

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)]">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-[var(--text-main)]">Docs, Sheets & Slides</h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Native Microsoft Office (.docx, .xlsx, .pptx) file management.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)]">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-[#16A085] flex items-center justify-center mb-3">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-[var(--text-main)]">Private & Encrypted</h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Strict storage quotas with private encrypted vaults by default.</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-[var(--border-line)]">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-[var(--text-main)]">OMNI Ecosystem</h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Instant bi-directional links into OMNI Time calendar blocks.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 font-mono py-2">
        OMNI Workspace • OMNI Space v0.1.0
      </div>
    </div>
  );
};
