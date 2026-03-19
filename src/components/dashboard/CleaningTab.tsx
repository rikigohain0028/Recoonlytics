import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Sparkles, Settings2, Undo2, CheckCircle2, ChevronDown,
  Terminal, TriangleAlert, Loader2, Columns3, ArrowUpDown,
  Hash, Type, Calendar, XCircle, MoveDown, MoveUp,
  Replace, SortAsc, SortDesc
} from 'lucide-react';
import {
  runCleaningPipeline,
  parseAndApplyCommand,
  applyColumnAction,
  detectColumnTypes,
  DEFAULT_CLEANING_OPTIONS,
  CleaningOptions,
  CleaningReport,
  ColumnAction,
  isMissingValue,
} from '@/lib/cleaningEngine';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;

export const CleaningTab = () => {
  const { currentData, updateData, columns, revertToOriginal } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<CleaningOptions>(DEFAULT_CLEANING_OPTIONS);
  const [lastReport, setLastReport] = useState<CleaningReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [commandResult, setCommandResult] = useState<{ message: string; success: boolean } | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [columnMenuOpen, setColumnMenuOpen] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const detectedTypes = useMemo(
    () => detectColumnTypes(currentData, columns),
    [currentData, columns]
  );

  const runAutoCleaning = async () => {
    setIsRunning(true);
    // Yield to browser for UI update
    await new Promise(r => setTimeout(r, 30));
    try {
      const result = runCleaningPipeline(currentData, columns, options);
      updateData(result.data);
      setLastReport(result.report);
      const total =
        result.report.missingFixed +
        result.report.duplicatesRemoved +
        result.report.datesStandardized +
        result.report.numbersFixed +
        result.report.textStandardized +
        result.report.emptyRowsRemoved;
      addToast(`Cleaning complete — ${total} issues fixed.`, 'success');
    } catch (e) {
      addToast('An error occurred during cleaning.', 'error');
    }
    setIsRunning(false);
  };

  const handleCommand = () => {
    if (!commandText.trim()) return;
    const result = parseAndApplyCommand(currentData, columns, commandText);
    if (result.success) {
      updateData(result.data);
    }
    setCommandResult({ message: result.message, success: result.success });
    if (result.success) {
      setCommandText('');
      addToast(result.message, 'success');
    }
  };

  const handleColumnAction = (col: string, action: ColumnAction) => {
    const result = applyColumnAction(currentData, col, action);
    updateData(result.data);
    addToast(result.message, 'success');
    setColumnMenuOpen(null);
  };

  const handleRevert = () => {
    revertToOriginal();
    setLastReport(null);
    addToast('Reverted to original dataset.', 'info');
  };

  const optionKey = (k: keyof CleaningOptions) => ({
    checked: options[k] as boolean,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setOptions(prev => ({ ...prev, [k]: e.target.checked })),
  });

  // Colour helpers
  const card = isDark
    ? 'bg-slate-800 border-slate-700 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const badge = (color: string) =>
    `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${color}`;

  const reportItems = lastReport ? [
    { label: 'Missing values fixed', value: lastReport.missingFixed, color: 'text-blue-400' },
    { label: 'Duplicates removed', value: lastReport.duplicatesRemoved, color: 'text-rose-400' },
    { label: 'Dates standardized', value: lastReport.datesStandardized, color: 'text-violet-400' },
    { label: 'Numbers converted', value: lastReport.numbersFixed, color: 'text-amber-400' },
    { label: 'Text standardized', value: lastReport.textStandardized, color: 'text-emerald-400' },
    { label: 'Empty rows removed', value: lastReport.emptyRowsRemoved, color: 'text-red-400' },
  ].filter(i => i.value > 0) : [];

  const columnActions: { label: string; action: ColumnAction; icon: React.ComponentType<{ className: string }> }[] = [
    { label: 'Convert to number', action: 'toNumber', icon: Hash },
    { label: 'Convert to text', action: 'toText', icon: Type },
    { label: 'Convert to date', action: 'toDate', icon: Calendar },
    { label: 'Replace missing with -', action: 'replaceMissing', icon: Replace },
    { label: 'Standardize text', action: 'standardizeText', icon: Sparkles },
    { label: 'Sort ascending', action: 'sortAsc', icon: SortAsc },
    { label: 'Sort descending', action: 'sortDesc', icon: SortDesc },
  ];

  const EXAMPLE_COMMANDS = [
    'Remove rows where Revenue is empty',
    'Standardize City column',
    'Fill missing Sales',
    'Convert Amount to number',
    'Remove duplicates',
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      {/* Toast notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-top-2 duration-300 pointer-events-auto ${
              t.type === 'success'
                ? 'bg-emerald-600 text-white'
                : t.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Professional Data Cleaning
          </h2>
          <p className={`mt-1 ${subtext}`}>
            {currentData.length.toLocaleString()} rows · {columns.length} columns
            {detectedTypes.date.length > 0 && ` · ${detectedTypes.date.length} date col${detectedTypes.date.length > 1 ? 's' : ''} detected`}
            {detectedTypes.numeric.length > 0 && ` · ${detectedTypes.numeric.length} numeric col${detectedTypes.numeric.length > 1 ? 's' : ''} detected`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRevert}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              isDark
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Undo2 className="w-4 h-4" />
            Restore Original
          </button>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              showAdvanced
                ? isDark
                  ? 'bg-slate-700 border-slate-600 text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-800'
                : isDark
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Advanced Options
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={runAutoCleaning}
            disabled={isRunning}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-60 shadow-lg shadow-blue-600/25"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Cleaning…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto Clean
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Options Panel */}
      {showAdvanced && (
        <div className={`mb-8 rounded-2xl border p-6 animate-in slide-in-from-top-2 duration-300 ${card}`}>
          <h3 className={`font-bold mb-5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Advanced Cleaning Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'removeDuplicates' as const, label: 'Remove duplicates' },
              { key: 'standardizeText' as const, label: 'Standardize text (Title Case)' },
              { key: 'fixDateFormats' as const, label: 'Fix date formats' },
              { key: 'fillMissingValues' as const, label: 'Fill missing values' },
              { key: 'removeEmptyRows' as const, label: 'Remove empty rows' },
              { key: 'convertNumbers' as const, label: 'Convert numbers ($, ₹, commas)' },
              { key: 'trimSpaces' as const, label: 'Trim spaces' },
              { key: 'removeSpecialChars' as const, label: 'Remove special characters' },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${
                options[key]
                  ? isDark
                    ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                  : isDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-700/50'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-blue-600"
                  {...optionKey(key)}
                />
                <span className="text-sm font-medium">{label}</span>
              </label>
            ))}
          </div>

          {/* Missing Value Fill Method */}
          {options.fillMissingValues && (
            <div className={`border-t pt-5 mt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <label className={`text-sm font-semibold block mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Missing value fill method
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'dash' as const, label: 'Replace with "-"' },
                  { value: 'zero' as const, label: 'Replace with 0' },
                  { value: 'average' as const, label: 'Column average' },
                  { value: 'forward' as const, label: 'Forward fill' },
                  { value: 'backward' as const, label: 'Backward fill' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOptions(prev => ({ ...prev, missingFillMethod: opt.value }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      options.missingFillMethod === opt.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isDark
                        ? 'border-slate-700 text-slate-400 hover:bg-slate-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cleaning Report */}
      {lastReport && reportItems.length > 0 && (
        <div className={`mb-8 rounded-2xl border p-6 animate-in fade-in duration-500 ${
          isDark ? 'bg-emerald-900/10 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              Cleaning Results
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {reportItems.map((item, i) => (
              <div key={i} className={`rounded-xl p-3 text-center ${
                isDark ? 'bg-slate-800/60' : 'bg-white'
              }`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</p>
              </div>
            ))}
          </div>
          {lastReport.columnsDetected.date.length > 0 && (
            <p className={`mt-3 text-xs ${subtext}`}>
              Date columns auto-detected: {lastReport.columnsDetected.date.map(c => `"${c}"`).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* No report yet — hint */}
      {!lastReport && (
        <div className={`mb-8 rounded-2xl border-2 border-dashed p-8 text-center ${
          isDark ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <Sparkles className={`w-10 h-10 mx-auto mb-3 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <p className={`font-semibold text-lg mb-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Ready to clean your dataset
          </p>
          <p className={`text-sm max-w-md mx-auto ${subtext}`}>
            Click <strong>Auto Clean</strong> to apply best-practice cleaning automatically, or use <strong>Advanced Options</strong> to customize exactly what gets fixed.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Detects date columns', 'Fixes currency symbols', 'Removes duplicates', 'Title-cases text'].map(h => (
              <span key={h} className={`text-xs px-3 py-1 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}>{h}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Natural Language Command Box */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Terminal className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Custom Cleaning Command
            </h3>
          </div>
          <p className={`text-xs mb-3 ${subtext}`}>Type a cleaning instruction in plain English</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={commandText}
              onChange={e => setCommandText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCommand()}
              placeholder="e.g. Remove rows where City is empty"
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            <button
              onClick={handleCommand}
              className="px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all"
            >
              Run
            </button>
          </div>
          {commandResult && (
            <div className={`text-xs rounded-lg px-3 py-2 flex items-start gap-2 ${
              commandResult.success
                ? isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                : isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-700'
            }`}>
              {commandResult.success
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                : <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              {commandResult.message}
            </div>
          )}
          <div className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <p className={`text-xs font-semibold mb-2 ${subtext}`}>Quick examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_COMMANDS.map(cmd => (
                <button
                  key={cmd}
                  onClick={() => setCommandText(cmd)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    isDark
                      ? 'border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column Action Menu */}
        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center gap-2 mb-4">
            <Columns3 className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Column Actions
            </h3>
          </div>
          <p className={`text-xs mb-4 ${subtext}`}>Apply transformations to individual columns</p>
          
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {columns.map(col => {
              const isDate = detectedTypes.date.includes(col);
              const isNum = detectedTypes.numeric.includes(col);
              const missingCount = currentData.filter(r => isMissingValue(r[col])).length;
              const isOpen = columnMenuOpen === col;

              return (
                <div key={col}>
                  <button
                    onClick={() => setColumnMenuOpen(isOpen ? null : col)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all border ${
                      isOpen
                        ? isDark
                          ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                        : isDark
                        ? 'border-slate-700 text-slate-300 hover:bg-slate-700/50'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate max-w-32">{col}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        {isDate && <span className={badge(isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-100 text-violet-700')}>date</span>}
                        {isNum && <span className={badge(isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700')}>num</span>}
                        {missingCount > 0 && (
                          <span className={badge(isDark ? 'bg-rose-900/40 text-rose-300' : 'bg-rose-100 text-rose-700')}>
                            {missingCount} missing
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className={`mt-1 ml-2 rounded-xl border p-2 grid grid-cols-2 gap-1 animate-in slide-in-from-top-1 duration-200 ${
                      isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {columnActions.map(({ label, action, icon: Icon }) => (
                        <button
                          key={action}
                          onClick={() => handleColumnAction(col, action)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                            isDark
                              ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              : 'text-slate-700 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dataset Preview — quick glance */}
      {currentData.length > 0 && (
        <div className={`mt-8 rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <h3 className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Data Preview <span className={`text-sm font-normal ${subtext}`}>(first 5 rows after cleaning)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? 'bg-slate-900/50' : 'bg-slate-50'}>
                  {columns.map(col => (
                    <th key={col} className={`px-4 py-2.5 text-left text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'} whitespace-nowrap`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.slice(0, 5).map((row, i) => (
                  <tr key={i} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                    {columns.map(col => {
                      const val = row[col];
                      const missing = isMissingValue(val) || val === '-';
                      return (
                        <td key={col} className={`px-4 py-2.5 whitespace-nowrap ${
                          missing
                            ? isDark ? 'text-slate-600 italic' : 'text-slate-400 italic'
                            : isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {missing ? '—' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Professional touches footer */}
      <div className={`mt-8 flex flex-wrap gap-4 items-center justify-center text-xs ${subtext}`}>
        <span>✓ Built for reliability</span>
        <span>✓ Continuously improving</span>
        <span>✓ Secure processing</span>
        <span>✓ Original data preserved</span>
      </div>
    </div>
  );
};
