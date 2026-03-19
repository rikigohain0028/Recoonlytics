import React, { useRef, useState } from 'react';
import { FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useLocation } from 'wouter';
import { processPDFToData } from '@/lib/pdfProcessor';
import { useTheme } from '@/context/ThemeContext';

const STAGES = [
  'Analyzing PDF structure...',
  'Reading PDF structure...',
  'Extracting text layers...',
  'Detecting financial statement format...',
  'Cleaning and structuring data...',
  'Trying generic table extraction...',
  'Building text-based structure...',
  'Finalizing data extraction...'
];

export const PDFUploadCard = () => {
  const { updateData, setFileName, setError } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [_, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePDFFile = async (file: File) => {
    setErrorMsg(null);
    setSuccess(false);

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('PDF file must be under 10MB.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Analyzing PDF structure...');

    try {
      const rows = await processPDFToData(file, (msg) => {
        setStatusMessage(msg);
      });

      if (!rows || rows.length === 0) {
        throw new Error('No data could be extracted from this PDF.');
      }

      setSuccess(true);
      setStatusMessage(`✓ Extracted ${rows.length} rows successfully`);

      updateData(rows);
      setFileName(file.name.replace(/\.pdf$/i, '') + ' (from PDF)');

      setTimeout(() => {
        setLocation('/dashboard');
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process PDF. Please try a different file.');
      setStatusMessage('');
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = '';
      handlePDFFile(file);
    }
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm hover:shadow-md transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>PDF to Data</h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Convert bank statements, invoices, or reports into structured data.
          </p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className={`mb-4 p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className={`text-xs font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              {statusMessage || 'Processing...'}
            </span>
          </div>
          {/* Progress bar animation */}
          <div className={`mt-2 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-blue-100'}`}>
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
        </div>
      )}

      {/* Success */}
      {success && !isProcessing && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-emerald-700">{statusMessage}</span>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-rose-700 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        disabled={isProcessing}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full px-4 py-2.5 rounded-xl font-semibold border transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm ${
          isDark
            ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 border-blue-800'
            : 'bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border-blue-200'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing PDF...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            Upload PDF
          </>
        )}
      </button>

      <div className={`mt-3 flex flex-wrap gap-1.5`}>
        {['Bank Statement', 'Invoice', 'Report', 'Multi-Page'].map(tag => (
          <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
            {tag}
          </span>
        ))}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
