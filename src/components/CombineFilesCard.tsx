import { useRef, useState, useMemo } from 'react';
import { GitMerge, AlertCircle, Loader2, HelpCircle, X, CheckCircle2, Info } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { mergeMultipleDatasets, FileDataset, DataRow, JoinType, detectSimilarColumns, JoinDiagnostics } from '@/lib/mergeDatasets';
import { processPDFToData } from '@/lib/pdfProcessor';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const CombineFilesCard = () => {
  const { updateData, setFileName } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const [datasets, setDatasets] = useState<(FileDataset | null)[]>([null, null, null, null]);
  const [joinColumns, setJoinColumns] = useState<string[]>(['', '', '', '']);
  const [joinType, setJoinType] = useState<JoinType>('left');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [mergeResult, setMergeResult] = useState<{ rows: number; diagnostics: JoinDiagnostics[] } | null>(null);
  const [previewData, setPreviewData] = useState<DataRow[] | null>(null);

  const similarColumns = useMemo(() => {
    const d0 = datasets[0];
    const d1 = datasets[1];
    if (!d0 || !d1) return [];
    return detectSimilarColumns(d0.columns, d1.columns);
  }, [datasets[0], datasets[1]]);

  const parseFile = async (file: File): Promise<FileDataset> => {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('File must be under 20MB');
    }

    return new Promise((resolve, reject) => {
      if (file.name.toLowerCase().endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as DataRow[];
            if (data.length === 0) reject(new Error('CSV file is empty'));
            else {
              const cols = Object.keys(data[0] || {});
              resolve({ data, columns: cols, fileName: file.name });
            }
          },
          error: () => reject(new Error('Failed to parse CSV')),
        });
      } else if (file.name.toLowerCase().match(/\.xlsx?$/)) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const arrayData = e.target?.result;
            const workbook = XLSX.read(arrayData, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
            const data = jsonData as DataRow[];
            if (data.length === 0) throw new Error('Excel file is empty');
            const cols = Object.keys(data[0] || {});
            resolve({ data, columns: cols, fileName: file.name });
          } catch (err: any) {
            reject(new Error(err.message || 'Failed to parse Excel file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } else if (file.name.toLowerCase().endsWith('.pdf')) {
        processPDFToData(file)
          .then((data) => {
            const cols = Object.keys(data[0] || {});
            resolve({ data, columns: cols, fileName: file.name });
          })
          .catch((err) => reject(err));
      } else {
        reject(new Error('Only CSV, XLSX, and PDF files are supported'));
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    try {
      setLocalError(null);
      setMergeResult(null);
      setPreviewData(null);
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        e.target.value = '';
        setIsProcessing(true);
        const dataset = await parseFile(file);
        const newDatasets = [...datasets];
        newDatasets[slotIndex] = dataset;
        setDatasets(newDatasets);

        if (slotIndex <= 1 && newDatasets[0] && newDatasets[1]) {
          const similar = detectSimilarColumns(newDatasets[0].columns, newDatasets[1].columns);
          if (similar.length > 0) {
            const newCols = [...joinColumns];
            if (!newCols[0]) newCols[0] = similar[0].colA;
            if (!newCols[1]) newCols[1] = similar[0].colB;
            setJoinColumns(newCols);
          }
        }

        setIsProcessing(false);
      }
    } catch (err: any) {
      setIsProcessing(false);
      setLocalError(err.message || 'Failed to upload file');
    }
  };

  const removeFile = (slotIndex: number) => {
    const newDatasets = [...datasets];
    newDatasets[slotIndex] = null;
    setDatasets(newDatasets);
    const newJoinColumns = [...joinColumns];
    newJoinColumns[slotIndex] = '';
    setJoinColumns(newJoinColumns);
    setMergeResult(null);
    setPreviewData(null);
  };

  const handleCombine = () => {
    setLocalError(null);
    setMergeResult(null);
    setPreviewData(null);

    const uploadedCount = datasets.filter(d => d !== null).length;
    if (uploadedCount < 2) {
      setLocalError('Please upload at least two datasets to combine.');
      return;
    }

    const filledDatasets = datasets.filter(d => d !== null) as FileDataset[];
    const requiredJoinColumns = filledDatasets.length;
    const selectedColumns = joinColumns.slice(0, requiredJoinColumns);

    if (selectedColumns.some(col => !col)) {
      setLocalError('Please select a join column for each dataset.');
      return;
    }

    try {
      const { merged, totalMatches, diagnostics } = mergeMultipleDatasets({
        datasets: filledDatasets,
        joinColumns: selectedColumns,
        joinType,
      });

      if (merged.length === 0) {
        const diag = diagnostics[0];
        let reason = 'No matching values found between the selected join columns.';
        if (diag) {
          reason += `\n\nDiagnostics:\n• File 1 has ${diag.totalA} rows, File 2 has ${diag.totalB} rows.\n• ${diag.unmatchedA} keys from File 1 had no match.`;
          if (diag.sampleUnmatchedA.length > 0) {
            reason += `\n• Sample unmatched keys: ${diag.sampleUnmatchedA.join(', ')}`;
          }
          reason += `\n\nSuggestions: Check that both columns contain matching values, or try a "Left Join" to keep all rows from File 1.`;
        }
        setLocalError(reason);
        return;
      }

      setPreviewData(merged.slice(0, 5));
      setMergeResult({ rows: merged.length, diagnostics });

      updateData(merged);
      const fileNames = filledDatasets.map(d => d.fileName.split('.')[0]).join(' + ');
      setFileName(`${fileNames} (merged)`);

    } catch (err: any) {
      setLocalError(err.message || 'Merge failed. Check that your join columns contain compatible data types.');
    }
  };

  const uploadedCount = datasets.filter(d => d !== null).length;
  const canMerge = uploadedCount >= 2;

  const joinTypes: { type: JoinType; label: string; desc: string }[] = [
    { type: 'inner', label: 'Inner', desc: 'Only matching rows' },
    { type: 'left', label: 'Left', desc: 'All from File 1' },
    { type: 'right', label: 'Right', desc: 'All from File 2' },
    { type: 'full', label: 'Full', desc: 'All rows combined' },
  ];

  return (
    <div className={`rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Combine Files</h3>
            <button
              data-testid="button-combine-help"
              onClick={() => setShowHelp(!showHelp)}
              className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            >
              <HelpCircle className={`w-5 h-5 ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`} />
            </button>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Merge up to 4 datasets using a shared column.</p>
        </div>
        <GitMerge className={`w-6 h-6 flex-shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
      </div>

      {showHelp && (
        <div className={`mb-6 p-4 border rounded-lg text-sm ${isDark ? 'bg-blue-950/30 border-blue-800 text-slate-300' : 'bg-blue-50 border-blue-200 text-slate-700'}`}>
          <h4 className="font-bold mb-2">How to use Combine Files</h4>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Upload at least 2 files (CSV, XLSX, or PDF)</li>
            <li>Select the column that exists in both files (auto-suggested)</li>
            <li>Choose the join type</li>
            <li>Click Combine Datasets</li>
          </ol>
          <div className={`mt-3 pt-3 border-t text-xs ${isDark ? 'border-blue-800' : 'border-blue-200'}`}>
            <p className="font-bold mb-1">Join Types:</p>
            <ul className="space-y-0.5">
              <li><strong>Inner:</strong> Only rows that match in both files</li>
              <li><strong>Left:</strong> All rows from File 1 + matches from File 2</li>
              <li><strong>Right:</strong> All rows from File 2 + matches from File 1</li>
              <li><strong>Full:</strong> All rows from both files combined</li>
            </ul>
          </div>
        </div>
      )}

      {similarColumns.length > 0 && !joinColumns[0] && !joinColumns[1] && (
        <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 text-xs ${isDark ? 'bg-blue-950/20 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Suggested join: <strong>{similarColumns[0].colA}</strong> ↔ <strong>{similarColumns[0].colB}</strong> ({(similarColumns[0].score * 100).toFixed(0)}% match)</span>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {[0, 1, 2, 3].map((idx) => {
          const isRequired = idx < 2;
          const dataset = datasets[idx];

          return (
            <div key={idx} className={`border rounded-lg p-4 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  File {idx + 1} {isRequired ? '(Required)' : '(Optional)'}
                </label>
                {dataset && (
                  <button
                    data-testid={`button-remove-file-${idx}`}
                    onClick={() => removeFile(idx)}
                    className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-900/30 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {dataset ? (
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg border ${isDark ? 'bg-emerald-950/20 border-emerald-800' : 'bg-green-50 border-green-200'}`}>
                    <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-green-700'}`}>{dataset.fileName}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-emerald-500' : 'text-green-600'}`}>{dataset.data.length} rows, {dataset.columns.length} columns</p>
                  </div>

                  <div>
                    <label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>
                      Select Join Column
                    </label>
                    <select
                      data-testid={`select-join-column-${idx}`}
                      value={joinColumns[idx]}
                      onChange={(e) => {
                        const newCols = [...joinColumns];
                        newCols[idx] = e.target.value;
                        setJoinColumns(newCols);
                      }}
                      className={`w-full px-3 py-2 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isDark ? 'bg-slate-800 border-slate-600 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-300 text-slate-700 focus:border-blue-500'
                      }`}
                    >
                      <option value="">Choose column...</option>
                      {dataset.columns.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid={`button-upload-file-${idx}`}
                  disabled={isProcessing}
                  onClick={() => fileInputRefs[idx].current?.click()}
                  className={`w-full px-4 py-2.5 rounded-lg font-semibold border transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <GitMerge className="w-4 h-4" />
                      Upload CSV / XLSX / PDF
                    </>
                  )}
                </button>
              )}

              <input
                type="file"
                ref={fileInputRefs[idx]}
                accept=".csv, .xlsx, .xls, .pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => handleFileSelect(e, idx)}
                className="hidden"
              />
            </div>
          );
        })}
      </div>

      {canMerge && (
        <div className="mb-6">
          <label className={`text-sm font-bold mb-3 block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Join Type</label>
          <div className="grid grid-cols-4 gap-1.5">
            {joinTypes.map(({ type, label, desc }) => (
              <button
                key={type}
                type="button"
                data-testid={`button-join-${type}`}
                onClick={() => setJoinType(type)}
                className={`px-2 py-2 rounded-lg font-semibold text-xs transition-all border-2 flex flex-col items-center ${
                  joinType === type
                    ? isDark ? 'border-blue-500 bg-blue-950/40 text-blue-400' : 'border-blue-600 bg-blue-50 text-blue-600'
                    : isDark ? 'border-slate-700 bg-slate-800 text-slate-400 hover:border-blue-600' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[9px] font-normal mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {canMerge && (
        <button
          type="button"
          data-testid="button-combine-datasets"
          onClick={handleCombine}
          disabled={!canMerge}
          className={`w-full px-4 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-[#1e3a8a] hover:bg-[#162a63] text-white'
          }`}
        >
          Combine Datasets
        </button>
      )}

      {mergeResult && (
        <div className={`mt-4 p-4 rounded-lg border ${isDark ? 'bg-emerald-950/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Merged successfully! {mergeResult.rows.toLocaleString()} rows
            </span>
          </div>
          {mergeResult.diagnostics.map((diag, i) => (
            <div key={i} className={`text-xs space-y-0.5 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
              <p>• {diag.matchCount} matched, {diag.unmatchedA} unmatched from File 1, {diag.unmatchedB} unmatched from File 2</p>
            </div>
          ))}
        </div>
      )}

      {previewData && previewData.length > 0 && (
        <div className={`mt-3 rounded-lg border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <p className={`text-xs font-bold px-3 py-2 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            Preview (first 5 rows)
          </p>
          <div className="overflow-x-auto max-h-40">
            <table className="w-full text-xs">
              <thead>
                <tr className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                  {Object.keys(previewData[0]).slice(0, 6).map(col => (
                    <th key={col} className={`px-2 py-1.5 text-left font-bold whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className={isDark ? 'border-t border-slate-700' : 'border-t border-slate-100'}>
                    {Object.keys(previewData[0]).slice(0, 6).map(col => (
                      <td key={col} className={`px-2 py-1 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {row[col] === null ? <span className="opacity-40">null</span> : String(row[col]).slice(0, 30)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {localError && (
        <div className={`mt-4 p-3 rounded-lg border flex items-start gap-2 text-sm ${isDark ? 'bg-red-950/30 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p className="whitespace-pre-wrap text-xs">{localError}</p>
        </div>
      )}

      {uploadedCount > 0 && uploadedCount < 2 && (
        <div className={`mt-4 p-3 rounded-lg border text-sm ${isDark ? 'bg-amber-950/20 border-amber-800 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          Please upload at least {2 - uploadedCount} more file(s) to combine.
        </div>
      )}
    </div>
  );
};
