import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { formatNumber } from '@/lib/utils';
import { Calculator } from 'lucide-react';

export const StatsTab = () => {
  const { currentData, numericColumns } = useData();

  const columnStats = useMemo(() => {
    if (!currentData.length || !numericColumns.length) return [];

    return numericColumns.map(col => {
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      let count = 0;
      const values: number[] = [];

      currentData.forEach(row => {
        const val = Number(row[col]);
        if (!isNaN(val) && row[col] !== null && row[col] !== '') {
          values.push(val);
          if (val < min) min = val;
          if (val > max) max = val;
          sum += val;
          count++;
        }
      });

      if (count === 0) return null;

      values.sort((a, b) => a - b);
      const avg = sum / count;
      
      const mid = Math.floor(count / 2);
      const median = count % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

      let varianceSum = 0;
      values.forEach(v => {
        varianceSum += Math.pow(v - avg, 2);
      });
      const variance = count > 1 ? varianceSum / (count - 1) : 0;
      const stdDev = Math.sqrt(variance);

      return {
        column: col,
        min,
        max,
        avg,
        median,
        sum,
        count,
        range: max - min,
        stdDev,
        variance
      };
    }).filter(Boolean);
  }, [currentData, numericColumns]);

  if (numericColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <Calculator className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Numeric Columns Found</h3>
        <p className="text-slate-500 max-w-md">We couldn't detect any columns containing mostly numbers. Statistics are only available for numeric data.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold text-slate-900">Statistical Analysis</h2>
        <p className="text-slate-500 mt-1">Detailed mathematical breakdown of your numeric columns.</p>
      </div>

      <div className="space-y-8">
        {columnStats.map((stat, i) => stat && (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-blue-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">{stat.column}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Count</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.count)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Minimum</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.min)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Maximum</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.max)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Average (Mean)</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.avg)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Median</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.median)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Sum</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.sum)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Range</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.range)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Std Deviation</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.stdDev)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Variance</p>
                  <p className="text-xl font-medium text-slate-900">{formatNumber(stat.variance)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
