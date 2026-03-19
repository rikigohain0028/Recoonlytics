import { useState } from 'react';
import { Mail, Loader2, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Link } from 'wouter';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setIsLoading(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      setError(data.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`w-full max-w-md rounded-2xl shadow-xl p-8 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#1e3a8a]">Recoonlytics</span>
        </div>

        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Check your email</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
            <Link href="/">
              <span className={`block w-full py-3 rounded-xl border text-center font-semibold text-sm cursor-pointer transition-colors ${
                isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}>
                Back to Home
              </span>
            </Link>
          </div>
        ) : (
          <>
            <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Reset your password</h2>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your email and we'll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    data-testid="input-email"
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-blue-500/30 ${
                      isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                data-testid="button-reset"
                className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send Reset Link
              </button>
            </form>

            <div className={`mt-4 pt-4 border-t text-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <Link href="/">
                <span className={`inline-flex items-center gap-1 text-sm cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                  <ArrowLeft className="w-4 h-4" /> Back to Home
                </span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
