import { AlertCircle, Zap, UserPlus, Calendar } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useUsage } from '@/context/UsageContext';
import { useAuth } from '@/context/AuthContext';

interface LimitModalProps {
  open: boolean;
  onClose: () => void;
}

export function LimitModal({ open, onClose }: LimitModalProps) {
  const { limitType, openAuthModal, openPricingModal } = useUsage();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!open) return null;

  const isAnon = limitType === 'anon';
  const isDaily = limitType === 'daily';

  const title = isAnon
    ? 'You\'ve used your 2 free analyses'
    : isDaily
    ? 'Daily free limit reached'
    : 'Monthly limit reached';

  const description = isAnon
    ? 'Create a free account to get 3 analyses every day — no credit card needed.'
    : isDaily
    ? 'You\'ve used all 3 free analyses for today. Come back tomorrow or upgrade for unlimited access.'
    : 'You\'ve used all 300 analyses this month. Your limit resets in 30 days.';

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-8 text-center ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>

        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h2>
        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>

        <div className="flex flex-col gap-3">
          {isAnon && (
            <button
              onClick={() => { onClose(); openAuthModal('signup'); }}
              data-testid="button-create-account"
              className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Create Free Account
            </button>
          )}

          <button
            onClick={() => { onClose(); openPricingModal('Upgrade for unlimited access and AI analytics.'); }}
            data-testid="button-upgrade"
            className="w-full py-3 rounded-xl border-2 border-[#1e3a8a] text-[#1e3a8a] dark:border-blue-500 dark:text-blue-400 font-semibold text-sm transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Upgrade to Pro
          </button>

          {isDaily && !isAnon && (
            <button
              onClick={onClose}
              className={`w-full py-2.5 rounded-xl border font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4" /> Come Back Tomorrow
            </button>
          )}

          {!isAnon && !isAuthenticated && (
            <button
              onClick={() => { onClose(); openAuthModal('login'); }}
              className={`text-sm font-medium text-blue-500 hover:text-blue-600`}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
