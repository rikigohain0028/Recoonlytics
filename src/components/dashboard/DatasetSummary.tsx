import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { Hash, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export const DatasetSummary = () => {
  const { currentData, columns, numericColumns } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stats = useMemo(() => {
    let missingCount = 0;
    currentData.forEach(row => {
      columns.forEach(col => {
        const val = row[col];
        if (val === null || val === undefined || val === '' || val === '—' || (typeof val === 'number' && Number.isNaN(val))) {
          missingCount++;
        }
      });
    });

    const uniqueRows = new Set();
    let duplicateCount = 0;
    currentData.forEach(row => {
      const str = JSON.stringify(row);
      if (uniqueRows.has(str)) duplicateCount++;
      else uniqueRows.add(str);
    });

    const textColsCount = columns.length - numericColumns.length;

    let highest = -Infinity;
    let lowest = Infinity;
    let sum = 0;
    let count = 0;

    numericColumns.forEach(col => {
      currentData.forEach(row => {
        const rawVal = row[col];
        const val = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).replace(/,/g, ''));
        if (!isNaN(val)) {
          if (val > highest) highest = val;
          if (val < lowest) lowest = val;
          sum += val;
          count++;
        }
      });
    });

    const avg = count > 0 ? sum / count : 0;

    const totalCells = currentData.length * columns.length;
    const missingRatio = totalCells > 0 ? missingCount / totalCells : 0;
    const duplicateRatio = currentData.length > 0 ? duplicateCount / currentData.length : 0;
    
    let qualityLabel = 'Excellent';
    let qualityColor = 'bg-emerald-500';
    let qualityText = 'text-emerald-600 dark:text-emerald-400';

    if (missingRatio > 0.1 || duplicateRatio > 0.1) {
      qualityLabel = 'Good (Some Issues)';
      qualityColor = 'bg-amber-500';
      qualityText = 'text-amber-600 dark:text-amber-400';
    }
    if (missingRatio > 0.3 || duplicateRatio > 0.3) {
      qualityLabel = 'Poor (Many Issues)';
      qualityColor = 'bg-rose-500';
      qualityText = 'text-rose-600 dark:text-rose-400';
    }

    return {
      missingCount,
      duplicateCount,
      textColsCount,
      highest: highest === -Infinity ? 0 : highest,
      lowest: lowest === Infinity ? 0 : lowest,
      avg,
      qualityLabel,
      qualityColor,
      qualityText
    };
  }, [currentData, columns, numericColumns]);

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Summary Card */}
        <div className={`lg:col-span-2 rounded-3xl p-8 border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              <Zap className="w-5 h-5 text-blue-600" />
              Dataset Summary
            </h3>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-2 h-2 rounded-full ${stats.qualityColor} animate-pulse`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${stats.qualityText}`}>{stats.qualityLabel}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Rows</span>
              <span className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{formatNumber(currentData.length)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Columns</span>
              <span className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{columns.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Missing Values</span>
              <span className="text-2xl font-display font-bold text-amber-600">{formatNumber(stats.missingCount)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duplicates</span>
              <span className="text-2xl font-display font-bold text-rose-600">{formatNumber(stats.duplicateCount)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Numeric Columns</span>
              <span className="text-2xl font-display font-bold text-emerald-600">{numericColumns.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Text Columns</span>
              <span className="text-2xl font-display font-bold text-blue-600">{stats.textColsCount}</span>
            </div>
          </div>
        </div>

        {/* Quick Insights Cards */}
        <div className="flex flex-col gap-4">
          <div className={`rounded-2xl p-5 border shadow-sm flex items-center gap-4 group transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:border-emerald-900' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Highest Value</p>
              <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{formatNumber(stats.highest)}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 border shadow-sm flex items-center gap-4 group transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:border-rose-900' : 'bg-white border-slate-200 hover:border-rose-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Lowest Value</p>
              <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{formatNumber(stats.lowest)}</p>
            </div>
          </div>
          <div className={`rounded-2xl p-5 border shadow-sm flex items-center gap-4 group transition-all ${isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-900' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Average Value</p>
              <p className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{formatNumber(stats.avg)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
