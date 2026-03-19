import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import { OverviewTab } from '@/components/dashboard/OverviewTab';
import { PreviewTab } from '@/components/dashboard/PreviewTab';
import { CleaningTab } from '@/components/dashboard/CleaningTab';
import { StatsTab } from '@/components/dashboard/StatsTab';
import { DuplicatesTab } from '@/components/dashboard/DuplicatesTab';
import { EnhancedChartsTab } from '@/components/dashboard/EnhancedChartsTab';
import { DownloadTab } from '@/components/dashboard/DownloadTab';
import { ExplainTab } from '@/components/dashboard/ExplainTab';
import { AccountPanel } from '@/components/auth/AccountPanel';
import { UsageBar } from '@/components/auth/UsageBar';
import { FeatureLock, LockBadge } from '@/components/auth/FeatureLock';
import { useUsage } from '@/context/UsageContext';
import {
  LayoutDashboard, TableProperties, Sparkles,
  Calculator, Copy, BarChart2, Download, ArrowLeft,
  FileSpreadsheet, Lightbulb, Sun, Moon,
  ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const TABS = [
  { id: 'overview',    label: 'Overview',     icon: LayoutDashboard, feature: null },
  { id: 'preview',    label: 'Data Preview',  icon: TableProperties, feature: null },
  { id: 'cleaning',   label: 'Cleaning',      icon: Sparkles,        feature: null },
  { id: 'explain',    label: 'AI Report',     icon: Lightbulb,       feature: 'ai_report' as const },
  { id: 'stats',      label: 'Statistics',    icon: Calculator,      feature: null },
  { id: 'duplicates', label: 'Duplicates',    icon: Copy,            feature: null },
  { id: 'charts',     label: 'Charts',        icon: BarChart2,       feature: null },
  { id: 'download',   label: 'Download',      icon: Download,        feature: null },
];

const ZOOM_MIN  = 0.7;
const ZOOM_MAX  = 1.5;
const ZOOM_STEP = 0.1;
const ZOOM_DEFAULT = 1.0;

function clampZoom(v: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(v.toFixed(2))));
}

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const { currentData, fileName, resetData } = useData();
  const { theme, toggleTheme } = useTheme();
  const { canUseFeature } = useUsage();
  const [activeTab, setActiveTab]   = useState('overview');
  const [zoom, setZoom]             = useState(ZOOM_DEFAULT);
  const isDark = theme === 'dark';

  const mainRef    = useRef<HTMLDivElement>(null);
  const pinchRef   = useRef<number>(0);

  // ── Zoom helpers ─────────────────────────────────────────────────────
  const zoomIn    = useCallback(() => setZoom(z => clampZoom(z + ZOOM_STEP)), []);
  const zoomOut   = useCallback(() => setZoom(z => clampZoom(z - ZOOM_STEP)), []);
  const resetZoom = useCallback(() => setZoom(ZOOM_DEFAULT), []);

  // ── Ctrl + mouse-wheel ───────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(z => clampZoom(z + delta));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── Touchpad / touch pinch ───────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const delta = (dist - pinchRef.current) / 400;
      pinchRef.current = dist;
      setZoom(z => clampZoom(z + delta));
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
    };
  }, []);

  // ── Keyboard shortcuts: Ctrl +/-, Ctrl 0 ────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
      if (e.key === '-')                  { e.preventDefault(); zoomOut(); }
      if (e.key === '0')                  { e.preventDefault(); resetZoom(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut, resetZoom]);

  // ── Redirect if no data ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentData || currentData.length === 0) setLocation('/');
  }, [currentData, setLocation]);

  if (!currentData || currentData.length === 0) return null;

  const handleBack = () => { resetData(); setLocation('/'); };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab />;
      case 'preview':     return <PreviewTab />;
      case 'cleaning':    return <CleaningTab />;
      case 'stats':       return <StatsTab />;
      case 'duplicates':  return <DuplicatesTab />;
      case 'charts':      return <EnhancedChartsTab />;
      case 'explain':     return (
        <FeatureLock feature="ai_report" className="min-h-[400px]">
          <ExplainTab />
        </FeatureLock>
      );
      case 'download':    return <DownloadTab />;
      default:            return <OverviewTab />;
    }
  };

  const pct = Math.round(zoom * 100);

  // ── Zoom button style helper ─────────────────────────────────────────
  const zBtn = `p-1.5 rounded-md transition-colors ${
    isDark
      ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 disabled:opacity-30'
      : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30'
  }`;

  return (
    <div className={`min-h-screen flex flex-col h-screen overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* ── Header (never zoomed) ──────────────────────────────────────── */}
      <header className={`border-b px-4 md:px-6 py-3 flex-shrink-0 z-20 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Left: back + file info */}
          <div className="flex items-center gap-3 md:gap-6 min-w-0">
            <Button
              variant="ghost" size="icon" onClick={handleBack}
              className={`flex-shrink-0 ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className={`flex items-center gap-3 border-l pl-4 md:pl-6 min-w-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-[#1e3a8a]'}`}>
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className={`font-bold text-base leading-tight truncate max-w-[140px] sm:max-w-xs md:max-w-md ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {fileName || 'Untitled Dataset'}
                </h1>
                <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {currentData.length.toLocaleString()} rows
                </p>
              </div>
            </div>
          </div>

          {/* Right: usage + zoom controls + theme + account */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Usage bar */}
            <div className="hidden lg:block w-44">
              <UsageBar />
            </div>

            {/* ── Zoom Controls ───────────────────────────────────────── */}
            <div
              data-testid="zoom-controls"
              className={`hidden sm:flex items-center gap-0.5 rounded-xl border px-1.5 py-1 ${
                isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={zoomOut}
                disabled={zoom <= ZOOM_MIN}
                title="Zoom Out (Ctrl –)"
                data-testid="button-zoom-out"
                className={zBtn}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={resetZoom}
                title="Reset Zoom (Ctrl 0)"
                data-testid="button-zoom-reset"
                className={`px-2 py-1 rounded-md text-xs font-mono font-semibold transition-colors min-w-[3rem] text-center ${
                  zoom === ZOOM_DEFAULT
                    ? isDark ? 'text-slate-500' : 'text-slate-400'
                    : isDark ? 'text-blue-400 hover:bg-slate-700' : 'text-[#1e3a8a] hover:bg-slate-200'
                }`}
              >
                {pct}%
              </button>

              <button
                onClick={zoomIn}
                disabled={zoom >= ZOOM_MAX}
                title="Zoom In (Ctrl +)"
                data-testid="button-zoom-in"
                className={zBtn}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              {zoom !== ZOOM_DEFAULT && (
                <button
                  onClick={resetZoom}
                  title="Reset Zoom"
                  data-testid="button-zoom-reset-icon"
                  className={zBtn}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <AccountPanel />
          </div>
        </div>
      </header>

      {/* ── Tabs Navigation (never zoomed) ──────────────────────────────── */}
      <div className={`border-b flex-shrink-0 px-4 md:px-0 z-10 overflow-x-auto custom-scrollbar ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex space-x-1 p-2 min-w-max">
          {TABS.map(tab => {
            const isLocked = tab.feature && !canUseFeature(tab.feature);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 select-none ${
                  activeTab === tab.id
                    ? isDark ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30' : 'bg-[#1e3a8a] text-white shadow-md shadow-blue-900/10'
                    : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`} />
                {tab.label}
                {isLocked && <LockBadge feature={tab.feature!} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content (scrollable viewport, zoom applied inside) ──────── */}
      <main
        ref={mainRef}
        className={`flex-1 overflow-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      >
        {/* Zoom wrapper — only this div scales */}
        <div
          data-testid="zoom-content"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            /* After scaling the content shrinks/grows — compensate width so it
               still spans the full viewport before scaling */
            width:     `${100 / zoom}%`,
            minHeight: `${100 / zoom}%`,
            transition: 'transform 0.15s ease-out, width 0.15s ease-out',
            padding: '2rem',
          }}
        >
          <div className="max-w-7xl mx-auto">
            {renderTabContent()}
          </div>
        </div>
      </main>
    </div>
  );
}
