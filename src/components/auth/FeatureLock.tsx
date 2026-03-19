import { Lock } from 'lucide-react';
import { useUsage, FeatureKey } from '@/context/UsageContext';
import { useTheme } from '@/context/ThemeContext';

interface FeatureLockProps {
  feature: FeatureKey;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

const FEATURE_LABELS: Record<FeatureKey, string> = {
  ai_report: 'AI Data Report',
  ai_assistant: 'AI Assistant',
  combine_files: 'Combine Files',
  pdf_upload: 'PDF Extraction',
  advanced_cleaning: 'Advanced Cleaning',
  fuzzy_duplicates: 'Fuzzy Duplicate Detection',
};

export function FeatureLock({ feature, label, children, className = '' }: FeatureLockProps) {
  const { canUseFeature, openPricingModal } = useUsage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const featureLabel = label || FEATURE_LABELS[feature];

  return (
    <div className={`relative group ${className}`}>
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl cursor-pointer z-10 transition-all
          ${isDark ? 'bg-slate-900/80 hover:bg-slate-900/90' : 'bg-white/80 hover:bg-white/90'}
          backdrop-blur-[2px]`}
        onClick={() => openPricingModal(`${featureLabel} is a Pro feature. Upgrade to unlock it.`)}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
          <Lock className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-[#1e3a8a]'}`} />
        </div>
        <p className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{featureLabel}</p>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pro feature</p>
        <button className="mt-3 px-4 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-[#1e40af] transition-colors">
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}

// Inline lock badge (for tab labels etc.)
export function LockBadge({ feature }: { feature: FeatureKey }) {
  const { canUseFeature } = useUsage();
  if (canUseFeature(feature)) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 ml-1">
      <Lock className="w-2.5 h-2.5" /> PRO
    </span>
  );
}
