import React from 'react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { DatasetSummary } from './DatasetSummary';

export const OverviewTab = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h2 className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Dashboard Overview</h2>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Instant insights and data health overview.</p>
      </div>

      <DatasetSummary />
    </div>
  );
};
