import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ── Constants ─────────────────────────────────────────────────────────
const ANON_USES_KEY = 'rco_anon_uses';
const BROWSER_ID_KEY = 'rco_browser_id';
const ANON_MAX = 2;
const FREE_DAILY_MAX = 3;
const PREMIUM_MONTHLY_MAX = 300;

export type FeatureKey =
  | 'ai_report'
  | 'ai_assistant'
  | 'combine_files'
  | 'pdf_upload'
  | 'advanced_cleaning'
  | 'fuzzy_duplicates';

function generateBrowserId(): string {
  const nav = navigator;
  const fingerprint = [
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const c = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }

  const rand = Math.random().toString(36).slice(2);
  return `rco_${Math.abs(hash).toString(36)}_${rand}`;
}

function getOrCreateBrowserId(): string {
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = generateBrowserId();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

function getAnonUses(): number {
  return parseInt(localStorage.getItem(ANON_USES_KEY) || '0', 10);
}

function incrementAnonUses(): number {
  const current = getAnonUses();
  const next = current + 1;
  localStorage.setItem(ANON_USES_KEY, String(next));
  return next;
}

// ── Context ────────────────────────────────────────────────────────────
interface UsageContextType {
  browserId: string;
  anonUsesRemaining: number;
  canAnalyze: boolean;
  limitType: 'anon' | 'daily' | 'monthly' | null;
  usageDisplay: { used: number; total: number; label: string } | null;
  canUseFeature: (feature: FeatureKey) => boolean;
  recordAnalysis: () => Promise<{ allowed: boolean; message?: string }>;
  showAuthModal: boolean;
  showPricingModal: boolean;
  pricingReason: string;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  openPricingModal: (reason?: string) => void;
  closePricingModal: () => void;
  authModalMode: 'login' | 'signup';
  setAuthModalMode: (mode: 'login' | 'signup') => void;
  upgradeShownThisSession: boolean;
  setUpgradeShownThisSession: (v: boolean) => void;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export const UsageProvider = ({ children }: { children: ReactNode }) => {
  const { user, token, isAuthenticated, isPremium } = useAuth();
  const [browserId] = useState(getOrCreateBrowserId);
  const [anonUses, setAnonUses] = useState(getAnonUses);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingReason, setPricingReason] = useState('');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('signup');
  const [upgradeShownThisSession, setUpgradeShownThisSession] = useState(false);

  // Refresh anon uses from localStorage on mount
  useEffect(() => { setAnonUses(getAnonUses()); }, []);

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'signup') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => setShowAuthModal(false), []);

  const openPricingModal = useCallback((reason = '') => {
    setPricingReason(reason);
    setShowPricingModal(true);
  }, []);

  const closePricingModal = useCallback(() => setShowPricingModal(false), []);

  // ── Feature gating ───────────────────────────────────────────────────
  const canUseFeature = useCallback((feature: FeatureKey): boolean => {
    if (isPremium) return true;
    // Free/unauth cannot use these premium features
    const premiumFeatures: FeatureKey[] = [
      'ai_report', 'ai_assistant', 'combine_files', 'pdf_upload',
      'advanced_cleaning', 'fuzzy_duplicates',
    ];
    return !premiumFeatures.includes(feature);
  }, [isPremium]);

  // ── Compute limit state ──────────────────────────────────────────────
  const computeCanAnalyze = (): boolean => {
    if (isPremium) return true;
    if (!isAuthenticated) return anonUses < ANON_MAX;
    return (user?.uploadsUsedToday ?? 0) < FREE_DAILY_MAX;
  };

  const computeLimitType = (): 'anon' | 'daily' | 'monthly' | null => {
    if (isPremium) {
      if ((user?.uploadsUsedMonth ?? 0) >= PREMIUM_MONTHLY_MAX) return 'monthly';
      return null;
    }
    if (!isAuthenticated) return anonUses >= ANON_MAX ? 'anon' : null;
    return (user?.uploadsUsedToday ?? 0) >= FREE_DAILY_MAX ? 'daily' : null;
  };

  const computeUsageDisplay = () => {
    if (isPremium) {
      const used = user?.uploadsUsedMonth ?? 0;
      return { used, total: PREMIUM_MONTHLY_MAX, label: 'analyses this month' };
    }
    if (!isAuthenticated) {
      return { used: anonUses, total: ANON_MAX, label: 'free analyses used' };
    }
    const used = user?.uploadsUsedToday ?? 0;
    return { used, total: FREE_DAILY_MAX, label: 'analyses today' };
  };

  // ── Record an analysis ───────────────────────────────────────────────
  const recordAnalysis = useCallback(async (): Promise<{ allowed: boolean; message?: string }> => {
    if (isPremium) {
      // Record on server for premium users
      if (token) {
        const res = await fetch('/api/auth/record-usage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok && data.limitReached) {
          return { allowed: false, message: data.message };
        }
      }
      return { allowed: true };
    }

    if (!isAuthenticated) {
      const current = getAnonUses();
      if (current >= ANON_MAX) {
        return {
          allowed: false,
          message: `You've used your ${ANON_MAX} free analyses. Create a free account to get 3 analyses per day.`,
        };
      }
      const next = incrementAnonUses();
      setAnonUses(next);
      return { allowed: true };
    }

    // Signed-in free user — check server
    if (token) {
      const res = await fetch('/api/auth/record-usage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok && data.limitReached) {
        return { allowed: false, message: data.message };
      }
    }
    return { allowed: true };
  }, [isAuthenticated, isPremium, token]);

  const canAnalyze = computeCanAnalyze();
  const limitType = computeLimitType();
  const usageDisplay = computeUsageDisplay();

  return (
    <UsageContext.Provider value={{
      browserId, anonUsesRemaining: Math.max(0, ANON_MAX - anonUses),
      canAnalyze, limitType, usageDisplay,
      canUseFeature, recordAnalysis,
      showAuthModal, showPricingModal, pricingReason,
      openAuthModal, closeAuthModal, openPricingModal, closePricingModal,
      authModalMode, setAuthModalMode,
      upgradeShownThisSession, setUpgradeShownThisSession,
    }}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsage = () => {
  const ctx = useContext(UsageContext);
  if (!ctx) throw new Error('useUsage must be used within UsageProvider');
  return ctx;
};
