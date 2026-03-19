import { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUsage } from '@/context/UsageContext';
import { useTheme } from '@/context/ThemeContext';

export function AuthModal() {
  const { login, signup } = useAuth();
  const { showAuthModal, closeAuthModal, authModalMode, setAuthModalMode, openPricingModal } = useUsage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Escape key to close
  useEffect(() => {
    if (!showAuthModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAuthModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showAuthModal, closeAuthModal]);

  if (!showAuthModal) return null;

  const isLogin = authModalMode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await signup(email, password);

    setIsLoading(false);

    if (result.success) {
      if (!isLogin) {
        setSuccessMsg('Account created! Please check your email to verify your account.');
      } else {
        closeAuthModal();
      }
    } else {
      setError(result.message);
    }
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeAuthModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className={`relative w-full max-w-md rounded-2xl shadow-2xl p-8 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <button
          onClick={closeAuthModal}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-[#1e3a8a]">Recoonlytics</span>
        </div>

        <h2 className={`text-2xl font-bold mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {isLogin ? 'Sign in to continue analyzing your data' : 'Get 3 free analyses every day — no credit card needed'}
        </p>

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
            {successMsg}
          </div>
        )}

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
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                data-testid="input-password"
                className={`w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-500/30 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isLogin && (
              <a
                href="/forgot-password"
                className="block mt-1 text-xs text-blue-500 hover:text-blue-600 text-right"
              >
                Forgot password?
              </a>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid="button-submit-auth"
            className="w-full py-3 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>

        <div className={`mt-4 pt-4 border-t text-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setError(''); setSuccessMsg(''); setAuthModalMode(isLogin ? 'signup' : 'login'); }}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>

        {!isLogin && (
          <div className={`mt-3 pt-3 border-t text-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              onClick={() => { closeAuthModal(); openPricingModal('Upgrade for unlimited access and AI-powered analytics.'); }}
              className="text-xs text-amber-500 hover:text-amber-600 font-medium"
            >
              Want unlimited access? View Founder Plan →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
