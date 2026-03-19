import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { DatasetSummary } from './DatasetSummary';

export const PreviewTab = () => {
  const { currentData, columns, columnTypes } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [page, setPage] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const rowsPerPage = 50;
  
  const totalPages = Math.ceil(currentData.length / rowsPerPage);
  const displayedData = currentData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const formatCell = (val: any) => {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—';
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        return val.split('T')[0];
      } catch (e) {
        return val;
      }
    }
    if (typeof val === 'number') {
      if (val % 1 !== 0) return Number(val.toFixed(4));
    }
    return String(val);
  };

  return (
    <div className={`animate-in fade-in duration-500 flex flex-col pb-12 ${isFullScreen ? `fixed inset-0 z-[100] ${isDark ? 'bg-slate-950' : 'bg-slate-50'} p-4 md:p-8 h-screen` : 'h-full'}`}>
      {!isFullScreen && <DatasetSummary />}

      <div className={`mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isFullScreen ? 'mt-4' : ''}`}>
        <div>
          <h2 className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Data Preview</h2>
          <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 text-sm`}>Showing rows {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, currentData.length)} of {currentData.length}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-1 p-1 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100/80 border-slate-200'}`}>
            <button 
              onClick={() => setIsFullScreen(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!isFullScreen ? (isDark ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#1e3a8a] shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Normal View
            </button>
            <button 
              onClick={() => setIsFullScreen(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isFullScreen ? (isDark ? 'bg-slate-700 text-blue-400 shadow-sm' : 'bg-white text-[#1e3a8a] shadow-sm') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
            >
              Full Screen
            </button>
          </div>

          <div className={`flex items-center gap-2 rounded-xl p-1 border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
            >
              Previous
            </button>
            <span className={`px-4 text-sm font-bold ${isDark ? 'text-blue-400' : 'text-[#1e3a8a]'}`}>
              {page + 1} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-[2rem] border shadow-xl overflow-hidden flex-1 flex flex-col transition-all duration-300 ${isDark ? 'bg-slate-900 border-slate-800 shadow-black/40' : 'bg-white border-slate-200 shadow-slate-200/40'}`}>
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
              <tr>
                <th className={`px-6 py-5 font-bold border-r uppercase tracking-wider text-[10px] ${isDark ? 'text-slate-500 bg-slate-800/80 border-slate-700' : 'text-slate-400 bg-slate-50/80 border-slate-100'}`}>#</th>
                {columns.map((col, i) => (
                  <th key={i} className={`px-6 py-5 border-b ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/80 border-slate-100'}`}>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{col}</span>
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight opacity-70">
                        {columnTypes[col] || 'Text'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-50'}`}>
              {displayedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <p className={`font-bold text-lg ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No data found</p>
                      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Try uploading a different dataset.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedData.map((row, rIdx) => (
                  <tr key={rIdx} className={`h-[44px] transition-colors ${rIdx % 2 === 0 ? (isDark ? 'bg-slate-900' : 'bg-white') : (isDark ? 'bg-slate-800/20' : 'bg-slate-50/30')} ${isDark ? 'hover:bg-blue-900/20' : 'hover:bg-blue-50/40'}`}>
                    <td className={`px-6 py-3 border-r font-bold text-xs ${isDark ? 'text-slate-600 border-slate-800' : 'text-slate-400 border-slate-50'}`}>
                      {page * rowsPerPage + rIdx + 1}
                    </td>
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className={`px-6 py-3 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isFullScreen && (
          <div className={`p-4 border-t flex justify-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <button 
              onClick={() => setIsFullScreen(false)}
              className="px-6 py-2 bg-[#1e3a8a] text-white border border-transparent rounded-xl text-sm font-bold shadow-md hover:bg-[#162a63] transition-all"
            >
              Close Full Screen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
