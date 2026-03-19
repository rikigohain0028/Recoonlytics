import { useState, useEffect } from 'react';
import { X, CheckCircle2, Zap, Crown, Star, Lock, Loader2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUsage } from '@/context/UsageContext';
import { useAuth } from '@/context/AuthContext';

interface SpotData {
  founderSpotsRemaining: number;
  founderSpotsTotal: number;
}

const GUMROAD_URL = 'https://recoonlytics.gumroad.com/l/bfkkx';

export function PricingModal() {
  const { showPricingModal, closePricingModal, pricingReason, openAuthModal } = useUsage();
  const { isAuthenticated, token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [spots, setSpots] = useState<SpotData>({ founderSpotsRemaining: 300, founderSpotsTotal: 300 });
  const [buying, setBuying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (showPricingModal) {
      fetch('/api/config/spots')
        .then(r => r.json())
        .then(d => setSpots(d))
        .catch(() => {});
    }
  }, [showPricingModal]);

  useEffect(() => {
    if (!showPricingModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closePricingModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPricingModal, closePricingModal]);

  if (!showPricingModal) return null;

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closePricingModal();
  };

  const founderUsed = spots.founderSpotsTotal - spots.founderSpotsRemaining;
  const founderPct = Math.min(100, (founderUsed / spots.founderSpotsTotal) * 100);

  const handleUpgrade = async () => {
    setErrorMsg('');
    if (!isAuthenticated || !token) {
      closePricingModal();
      openAuthModal('signup');
      return;
    }
    if (user && user.planType !== 'free') {
      closePricingModal();
      return;
    }

    setBuying(true);
    try {
      const res = await fetch('/api/payment/initiate-gumroad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Failed to start payment. Please try again.');
        setBuying(false);
        return;
      }
      closePricingModal();
      window.location.href = data.gumroadUrl || GUMROAD_URL;
    } catch {
      setErrorMsg('Could not initiate payment. Please try again.');
      setBuying(false);
    }
  };

  const freePlan = [
    '3 analyses per day',
    'Upload CSV & XLSX (up to 20MB)',
    'Data preview & exploration',
    'Basic data cleaning',
    'Statistics (min, max, avg, median)',
    'Interactive charts',
  ];

  const proPlan = [
    'Everything in Free',
    '300 analyses per month',
    'AI-powered data report',
    'AI assistant chat',
    'Combine & merge files',
    'PDF data extraction',
    'Advanced cleaning engine',
    'Fuzzy duplicate detection',
    'Priority support',
  ];

  const upgradeLabel = !isAuthenticated
    ? 'Sign Up to Upgrade'
    : user && user.planType !== 'free'
    ? 'Plan Active'
    : buying
    ? 'Redirecting…'
    : 'Upgrade to Pro — ₹2,999';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdrop}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <button
          onClick={closePricingModal}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pb-0">
          <div className="text-center mb-6">
            {pricingReason && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${isDark ? 'bg-amber-900/30 text-amber-400 border border-amber-700/50' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <Lock className="w-3.5 h-3.5" />
                {pricingReason}
              </div>
            )}
            <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Upgrade to Recoonlytics Pro
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Unlock AI-powered analytics for your entire team
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mx-2 mb-4">
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl px-4 py-2.5 text-sm text-center">
                {errorMsg}
              </div>
            </div>
          )}

          {/* Founder spots bar */}
          {spots.founderSpotsRemaining > 0 && (
            <div className={`mx-2 mb-6 p-4 rounded-xl border ${isDark ? 'bg-amber-900/20 border-amber-700/50' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className={`text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Founder Plan — Limited Spots
                  </span>
                </div>
                <span className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  {spots.founderSpotsRemaining} / {spots.founderSpotsTotal} left
                </span>
              </div>
              <div className={`w-full rounded-full h-2 ${isDark ? 'bg-slate-700' : 'bg-amber-100'}`}>
                <div
                  className="h-2 rounded-full bg-amber-500 transition-all"
                  style={{ width: `${founderPct}%` }}
                />
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                First {spots.founderSpotsTotal} members get 1 year of Pro access. Price stays ₹2,999/year forever.
              </p>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 pt-2">
          {/* Free */}
          <div className={`rounded-xl p-5 border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-bold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Free</h3>
              <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>₹0</span>
            </div>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Forever free, no card needed</p>
            <ul className="space-y-2 mb-5">
              {freePlan.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => { closePricingModal(); if (!isAuthenticated) openAuthModal('signup'); }}
              className={`w-full py-2.5 rounded-xl border font-semibold text-sm transition-colors ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isAuthenticated ? 'Current Plan' : 'Get Started Free'}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl p-5 border-2 border-[#1e3a8a] bg-gradient-to-b from-blue-900/30 to-slate-900/40 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Founder Offer
              </span>
            </div>
            <h3 className="font-bold text-lg text-white mb-1">Pro / Founder</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-slate-400 line-through text-sm">₹3,999</span>
              <span className="text-3xl font-bold text-white">₹2,999</span>
            </div>
            <p className="text-xs text-blue-300 mb-4">per year · Launch price locked forever</p>
            <ul className="space-y-2 mb-5">
              {proPlan.map(f => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-200">{f}</span>
                </li>
              ))}
            </ul>
            <button
              data-testid="modal-upgrade-btn"
              onClick={handleUpgrade}
              disabled={buying || (!!user && user.planType !== 'free')}
              className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                buying || (!!user && user.planType !== 'free')
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-[#1e3a8a] hover:bg-[#1e40af] text-white'
              }`}
            >
              {buying && <Loader2 className="w-4 h-4 animate-spin" />}
              <Zap className="w-4 h-4" />
              {upgradeLabel}
            </button>
          </div>
        </div>

        <div className={`px-6 pb-5 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Secure payment via Gumroad ·{' '}
          <a href="mailto:support.reconlytics@gmail.com" className="text-blue-400 hover:underline">support.reconlytics@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
