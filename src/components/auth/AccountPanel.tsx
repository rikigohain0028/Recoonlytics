import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Crown, Zap, ChevronDown, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsage } from '@/context/UsageContext';
import { useTheme } from '@/context/ThemeContext';

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  founder: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  early: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function AccountPanel() {
  const { user, logout, isAuthenticated, isPremium } = useAuth();
  const { openAuthModal, openPricingModal, usageDisplay } = useUsage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleResend = async () => {
    if (resending || resendSent) return;
    setResending(true);
    const token = localStorage.getItem('rco_token');
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setResending(false);
    setResendSent(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openAuthModal('login')}
          data-testid="button-login"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Sign In
        </button>
        <button
          onClick={() => openAuthModal('signup')}
          data-testid="button-signup"
          className="px-4 py-1.5 rounded-lg bg-[#1e3a8a] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors"
        >
          Sign Up Free
        </button>
      </div>
    );
  }

  const planLabel = (user?.planType || 'free').charAt(0).toUpperCase() + (user?.planType || 'free').slice(1);
  const planColor = PLAN_COLORS[user?.planType || 'free'] || PLAN_COLORS.free;
  const monthlyUsed = user?.uploadsUsedMonth ?? 0;
  const monthlyTotal = isPremium ? 300 : 3;
  const monthlyPct = Math.min(100, (monthlyUsed / monthlyTotal) * 100);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(v => !v)}
        data-testid="button-account"
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
        }`}
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isDark ? 'bg-blue-600 text-white' : 'bg-[#1e3a8a] text-white'}`}>
          {user?.email?.[0]?.toUpperCase() || <User className="w-3 h-3" />}
        </div>
        <span className="text-sm font-medium max-w-[120px] truncate hidden md:block">{user?.email}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>{planLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl shadow-xl border z-50 overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          {/* User info */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isDark ? 'bg-blue-600 text-white' : 'bg-[#1e3a8a] text-white'}`}>
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{user?.email}</p>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${planColor}`}>{planLabel} Plan</span>
              </div>
            </div>

            {!user?.emailVerified && (
              <div className={`mt-3 p-2.5 rounded-lg flex items-start gap-2 ${isDark ? 'bg-amber-900/20 border border-amber-700/50' : 'bg-amber-50 border border-amber-200'}`}>
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Email not verified</p>
                  <button
                    onClick={handleResend}
                    disabled={resendSent || resending}
                    className="text-xs text-blue-500 hover:text-blue-600 mt-0.5 flex items-center gap-1"
                  >
                    {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    {resendSent ? 'Sent! Check your inbox.' : 'Resend verification email'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Usage */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Usage</p>
            {usageDisplay && (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{usageDisplay.label}</span>
                  <span className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{usageDisplay.used}/{usageDisplay.total}</span>
                </div>
                <div className={`w-full rounded-full h-2 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all ${monthlyPct >= 90 ? 'bg-red-500' : monthlyPct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, (usageDisplay.used / usageDisplay.total) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="p-2">
            {!isPremium && (
              <button
                onClick={() => { setOpen(false); openPricingModal(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors bg-[#1e3a8a] text-white hover:bg-[#1e40af] mb-1"
              >
                <Zap className="w-4 h-4" /> Upgrade to Pro
                <span className="ml-auto text-xs font-normal opacity-80">₹2,999/yr</span>
              </button>
            )}
            {isPremium && (
              <div className="flex items-center gap-2 px-3 py-2.5">
                <Crown className="w-4 h-4 text-amber-500" />
                <span className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {planLabel} Plan Active
                </span>
              </div>
            )}
            <a
              href="mailto:support.reconlytics@gmail.com"
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Mail className="w-4 h-4" /> Contact Support
            </a>
            <button
              onClick={() => { setOpen(false); logout(); }}
              data-testid="button-logout"
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-red-400' : 'text-slate-600 hover:bg-slate-50 hover:text-red-500'}`}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
