import { Zap, Crown, LogIn } from 'lucide-react';
import { useUsage } from '@/context/UsageContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export function UsageBar() {
  const { usageDisplay, openAuthModal, openPricingModal } = useUsage();
  const { user, isPremium, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!usageDisplay) return null;

  const { used, total, label } = usageDisplay;
  const pct = Math.min(100, (used / total) * 100);
  const isNearLimit = pct >= 70;
  const isAtLimit = pct >= 100;

  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500';

  const planBadge = isPremium
    ? { label: (user?.planType || 'pro').charAt(0).toUpperCase() + (user?.planType || 'pro').slice(1), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
    : isAuthenticated
    ? { label: 'Free', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' }
    : null;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
      {planBadge && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${planBadge.color}`}>
          {isPremium && <Crown className="w-3 h-3" />}
          {planBadge.label}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {used}/{total} {label}
          </span>
          {!isAuthenticated && (
            <button
              onClick={() => openAuthModal('signup')}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              <LogIn className="w-3 h-3" /> Sign up
            </button>
          )}
          {isAuthenticated && !isPremium && (
            <button
              onClick={() => openPricingModal()}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> Upgrade
            </button>
          )}
        </div>
        <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
