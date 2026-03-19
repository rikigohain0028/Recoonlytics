import { XCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTheme } from '@/context/ThemeContext';

export default function PaymentFailed() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [, navigate] = useLocation();

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`max-w-md w-full rounded-2xl p-8 text-center shadow-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Payment Failed
        </h1>
        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Your payment was not completed. No money has been charged. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <button
            data-testid="try-again-failed"
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
      </div>
    </div>
  );
}
