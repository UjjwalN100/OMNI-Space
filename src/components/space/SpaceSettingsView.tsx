import React from 'react';
import { useSpace } from '../../context/SpaceContext';
import { HardDrive, Shield, CheckCircle, Zap, ArrowRight, RefreshCw } from 'lucide-react';

export const SpaceSettingsView: React.FC = () => {
  const { quota } = useSpace();

  const plans = [
    { name: 'Free', storage: '2 GB', price: '$0', current: quota.planTier === 'free', features: ['Unified file storage', 'ONLYOFFICE Community editor', '30-day Trash retention', 'Basic search'] },
    { name: 'Plus', storage: '50 GB', price: '$2.99 / mo', current: quota.planTier === 'plus', features: ['50 GB Cloudflare R2 storage', 'Full version history', 'Priority sync', 'High-res media previews'] },
    { name: 'Pro', storage: '200 GB', price: '$7.99 / mo', current: quota.planTier === 'pro', features: ['200 GB Cloudflare R2 storage', 'Advanced search & indexing', 'Unlimited version history', 'Early access to OMNI Flow'] },
    { name: 'Max', storage: '1 TB', price: '$17.99 / mo', current: quota.planTier === 'max', features: ['1 TB High-speed storage', 'Dedicated enterprise cluster', 'Priority 24/7 support', 'Team sharing & permissions'] },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto select-none">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-main)]">Space Settings & Storage Plans</h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">Manage your cloud storage capacity, quotas, and subscription plan.</p>
      </div>

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(p => (
          <div 
            key={p.name} 
            className={`p-5 rounded-2xl border flex flex-col justify-between transition ${
              p.current 
                ? 'bg-[#16A085]/10 border-[#16A085] shadow-md ring-2 ring-[#16A085]/20' 
                : 'bg-white/[0.03] border-[var(--border-line)] hover:border-slate-400/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-[var(--text-main)]">{p.name}</h3>
                {p.current && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A085] text-white">
                    Active
                  </span>
                )}
              </div>
              <div className="text-xl font-bold text-[var(--text-main)]">{p.storage}</div>
              <div className="text-xs text-[var(--text-muted)] mb-4">{p.price}</div>

              <div className="space-y-2 border-t border-[var(--border-line)] pt-3 text-[11px] text-[var(--text-muted)]">
                {p.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#16A085] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={p.current}
              onClick={() => alert(`Upgrading to ${p.name} plan is coming in Phase 6 (Stripe integration)!`)}
              className={`w-full py-2 mt-5 rounded-xl text-xs font-bold transition ${
                p.current 
                  ? 'bg-white/10 text-slate-400 cursor-default' 
                  : 'bg-[#16A085] hover:bg-[#138d75] text-white shadow-sm'
              }`}
            >
              {p.current ? 'Current Plan' : `Upgrade to ${p.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* System Rules & Security info */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--border-line)] space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
          <Shield className="w-4 h-4 text-[#16A085]" />
          <span>Security & Data Policy</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Your files are private by default, encrypted in transit and at rest via Cloudflare R2 and Supabase Row-Level Security. We enforce strict storage quotas and never sell your document data.
        </p>
      </div>
    </div>
  );
};
