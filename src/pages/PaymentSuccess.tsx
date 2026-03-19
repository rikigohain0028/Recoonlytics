import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

type VerifyState = 'verifying' | 'success' | 'failed' | 'already-paid';

export default function PaymentSuccess() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { token, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [state, setState] = useState<VerifyState>('verifying');
  const [planType, setPlanType] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (!orderId) {
      setState('failed');
      setErrorMsg('No order ID found. Please contact support.');
      return;
    }

    const authToken = token || localStorage.getItem('rco_token');
    if (!authToken) {
      navigate('/');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setPlanType(data.planType || 'pro');
          const isAlreadyPaid = !!data.message?.includes('already');
          setState(isAlreadyPaid ? 'already-paid' : 'success');
          await refreshUser();
        } else {
          setState('failed');
          setErrorMsg(data.message || 'Payment could not be confirmed. Please contact support.');
        }
      } catch {
        setState('failed');
        setErrorMsg('Network error. Please try again or contact support.');
      }
    })();
  }, [token, navigate, refreshUser]);

  const planLabel =
    planType === 'founder' ? 'Founder (1 Year)' :
    planType === 'early' ? 'Early Access (6 Months)' :
    'Pro (30 Days)';

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`max-w-md w-full rounded-2xl p-8 text-center shadow-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>

        {state === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Confirming Payment
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Please wait while we verify your payment…
            </p>
          </>
        )}

        {(state === 'success' || state === 'already-paid') && (
          <>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {state === 'already-paid' ? 'Plan Active!' : 'Payment Successful!'}
            </h1>
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Your <span className="font-semibold text-blue-500">{planLabel}</span> plan is now active.
              {state !== 'already-paid' && ' Welcome to Recoonlytics Pro!'}
            </p>
            <div className={`rounded-xl p-4 mb-6 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                You now have <strong>300 analyses/month</strong>, AI reports, AI chat, and all Pro features unlocked.
              </p>
            </div>
            <button
              data-testid="go-to-dashboard"
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Payment Not Confirmed
            </h1>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {errorMsg || 'We could not confirm your payment. If money was deducted, please contact support.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                data-testid="try-again"
                onClick={() => navigate('/pricing')}
                className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition-colors"
              >
                Try Again
              </button>
              <a
                href="mailto:support.reconlytics@gmail.com?subject=Payment Issue"
                className={`w-full py-3 rounded-xl border font-semibold text-sm transition-colors text-center ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                Contact Support
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
