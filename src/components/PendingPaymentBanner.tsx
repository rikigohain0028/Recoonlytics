import { useState } from 'react';
import { CheckCircle2, Loader2, X, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export function PendingPaymentBanner() {
  const { user, token, refreshUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (!user || !user.pendingPayment || user.planType !== 'free' || dismissed) return null;

  const handleConfirm = async () => {
    setError('');
    setConfirming(true);
    try {
      const res = await fetch('/api/payment/confirm-gumroad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmed(true);
        await refreshUser();
      } else {
        setError(data.message || 'Could not activate plan. Please contact support.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  if (confirmed) {
    return (
      <div className={`w-full px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium ${
        isDark ? 'bg-emerald-900/40 text-emerald-300 border-b border-emerald-800/50' : 'bg-emerald-50 text-emerald-700 border-b border-emerald-200'
      }`}>
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        Pro activated successfully! You now have 300 uploads/month and all Pro features.
      </div>
    );
  }

  return (
    <div className={`w-full px-4 py-3 border-b ${
      isDark
        ? 'bg-amber-900/20 border-amber-800/40 text-amber-300'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 flex-1">
          <CreditCard className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-sm">Payment pending — </span>
            <span className="text-sm opacity-90">
              Have you completed payment on Gumroad? Click confirm to activate your Pro plan.
            </span>
            {error && (
              <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-6 sm:ml-0">
          <button
            data-testid="confirm-payment-btn"
            onClick={handleConfirm}
            disabled={confirming}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              isDark
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {confirming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            I have completed payment
          </button>
          <button
            data-testid="dismiss-pending-banner"
            onClick={() => setDismissed(true)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-amber-800/40' : 'hover:bg-amber-100'
            }`}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
}
