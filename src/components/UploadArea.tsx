import { useCallback, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useLocation } from 'wouter';
import { useTheme } from '@/context/ThemeContext';
import { useUsage } from '@/context/UsageContext';
import { PDFUploadCard } from './PDFUploadCard';
import { CombineFilesCard } from './CombineFilesCard';
import { FeatureLock } from './auth/FeatureLock';
import { LimitModal } from './auth/LimitModal';

export const UploadArea = () => {
  const { processFile, isLoading, error, normalizationReport } = useData();
  const { theme } = useTheme();
  const { recordAnalysis, canAnalyze, openAuthModal, upgradeShownThisSession, setUpgradeShownThisSession } = useUsage();
  const isDark = theme === 'dark';
  const [_, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    // Check usage limit before processing
    const usageResult = await recordAnalysis();
    if (!usageResult.allowed) {
      setLimitMessage(usageResult.message || 'Limit reached');
      setShowLimitModal(true);
      // Show upgrade modal once per session
      if (!upgradeShownThisSession) {
        setUpgradeShownThisSession(true);
      }
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setSelectedFileSize(`${sizeMB} MB`);
    setProcessingStage('Reading file...');

    const success = await processFile(file);
    if (success) {
      setProcessingStage('Complete!');
      setTimeout(() => setLocation('/dashboard'), 300);
    } else {
      setProcessingStage('');
    }
  }, [processFile, setLocation, recordAnalysis, upgradeShownThisSession, setUpgradeShownThisSession]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const openFilePicker = useCallback(() => {
    if (!isLoading && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [isLoading]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  }, [handleFile]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <LimitModal open={showLimitModal} onClose={() => setShowLimitModal(false)} />

      <div
        data-testid="upload-dropzone"
        className={`relative group rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isDragging
            ? isDark ? "border-blue-500 bg-blue-950/30 scale-[1.02]" : "border-[#1e3a8a] bg-blue-50 scale-[1.02]"
            : isDark ? "border-slate-700 bg-slate-900 hover:border-blue-500 hover:bg-slate-800/80" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50 hover:shadow-xl hover:shadow-blue-900/5"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={openFilePicker}
      >
        <div className="p-12 text-center flex flex-col items-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner ${isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#1e3a8a]'}`}>
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            ) : (
              <Upload className="w-10 h-10" />
            )}
          </div>

          <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {isLoading ? processingStage || "Processing..." : "Drop your data file here"}
          </h3>
          <p className={`mb-6 flex flex-col items-center justify-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Supports .CSV and .XLSX up to 20MB
            </span>
            {selectedFileSize && (
              <span className={`text-sm font-medium px-2 py-0.5 rounded-md mt-1 ${isDark ? 'text-blue-400 bg-blue-900/30' : 'text-[#1e3a8a] bg-blue-50'}`}>
                Selected: {selectedFileSize}
              </span>
            )}
          </p>

          <button
            type="button"
            data-testid="button-browse-files"
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              openFilePicker();
            }}
            className={`px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark ? 'bg-blue-600 text-white shadow-blue-900/30' : 'bg-[#1e3a8a] text-white shadow-blue-900/20'
            }`}
          >
            {isLoading ? 'Processing...' : 'Browse Files'}
          </button>

          <input
            type="file"
            id="fileUpload"
            data-testid="input-file-upload"
            ref={fileInputRef}
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={onFileChange}
          />
        </div>
      </div>

      {error && (
        <div className={`mt-6 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${isDark ? 'bg-red-950/30 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-600'}`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {normalizationReport && normalizationReport.steps.length > 0 && !normalizationReport.steps.includes('No data to normalize.') && !normalizationReport.steps.includes('Dataset is clean — no normalization needed.') && (
        <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${isDark ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm mb-1">Data normalized automatically</p>
            <ul className="text-xs space-y-0.5 opacity-80">
              {normalizationReport.steps.map((step, i) => (
                <li key={i}>• {step}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className={`mt-12 pt-8 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Advanced Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureLock feature="pdf_upload" className="rounded-2xl">
            <PDFUploadCard />
          </FeatureLock>
          <FeatureLock feature="combine_files" className="rounded-2xl">
            <CombineFilesCard />
          </FeatureLock>
        </div>
      </div>
    </div>
  );
};
