import React, { useState, useMemo, useRef } from 'react';
import { useData } from '@/context/DataContext';
import {
  BarChart as RechartsBar, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { Download, Sparkles, X } from 'lucide-react';
import { suggestCharts, CHART_COLORS } from '@/lib/chartSuggestions';
import { aggregateData, aggregateStackedData, isNumericColumn, suggestAggregation, getChartTypeForColumns, AggregationType } from '@/lib/chartAggregation';
import { useTheme } from '@/context/ThemeContext';
import html2canvas from 'html2canvas';

type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'histogram' | 'stacked';

interface ChartState {
  type: ChartType;
  xAxis: string;
  yAxis: string;
  aggregation: AggregationType;
}

export const EnhancedChartsTab = () => {
  const { currentData, columns, numericColumns } = useData();
  const { theme } = useTheme();
  const [chartState, setChartState] = useState<ChartState>({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    aggregation: 'count'
  });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark';

  // Initialize defaults
  const defaults = useMemo(() => {
    if (columns.length === 0) return { xAxis: '', yAxis: '' };
    const nonNumeric = columns.filter(c => !numericColumns.includes(c));
    const xAxis = nonNumeric.length > 0 ? nonNumeric[0] : columns[0];
    const yAxis = columns.length > 1 ? columns[1] : columns[0];
    return { xAxis, yAxis };
  }, [columns, numericColumns]);

  if (!chartState.xAxis && defaults.xAxis) {
    const xIsNum = isNumericColumn(currentData, defaults.xAxis);
    const yIsNum = isNumericColumn(currentData, defaults.yAxis);
    const suggestedAgg = suggestAggregation(xIsNum, yIsNum);
    const suggestedType = getChartTypeForColumns(xIsNum, yIsNum, numericColumns.length) as ChartType;
    
    setChartState(prev => ({
      ...prev,
      xAxis: defaults.xAxis,
      yAxis: defaults.yAxis,
      aggregation: suggestedAgg,
      type: suggestedType
    }));
  }

  // Determine if columns are numeric
  const xIsNumeric = useMemo(() => isNumericColumn(currentData, chartState.xAxis), [currentData, chartState.xAxis]);
  const yIsNumeric = useMemo(() => isNumericColumn(currentData, chartState.yAxis), [currentData, chartState.yAxis]);

  // Generate chart data with smart aggregation
  const chartData = useMemo(() => {
    if (!chartState.xAxis || !chartState.yAxis || !currentData.length) return [];

    if (chartState.type === 'histogram') {
      const values = currentData
        .map(r => Number(r[chartState.xAxis]))
        .filter(v => !isNaN(v));
      if (values.length === 0) return [];

      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
      const binSize = (max - min) / binCount || 1;

      const bins = Array(binCount).fill(0);
      values.forEach(v => {
        const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
        bins[binIndex]++;
      });

      return bins.map((count, i) => ({
        range: `${(min + i * binSize).toFixed(0)}-${(min + (i + 1) * binSize).toFixed(0)}`,
        frequency: count
      }));
    }

    if (chartState.type === 'scatter' && xIsNumeric && yIsNumeric) {
      return currentData
        .map(r => ({
          x: Number(r[chartState.xAxis]),
          y: Number(r[chartState.yAxis])
        }))
        .filter(d => !isNaN(d.x) && !isNaN(d.y))
        .slice(0, 500);
    }

    // Use stacked aggregation for category x category
    if (chartState.type === 'stacked' && !xIsNumeric && !yIsNumeric) {
      return aggregateStackedData(
        currentData,
        chartState.xAxis,
        chartState.yAxis,
        chartState.aggregation,
        numericColumns
      );
    }

    // Use regular aggregation for other cases
    return aggregateData(
      currentData,
      chartState.xAxis,
      chartState.yAxis,
      chartState.aggregation,
      numericColumns
    );
  }, [currentData, chartState, numericColumns, xIsNumeric, yIsNumeric]);

  const suggestions = useMemo(() => suggestCharts(currentData, columns, numericColumns), [currentData, columns, numericColumns]);

  // Get categories for stacked chart
  const stackedCategories = useMemo(() => {
    if (chartState.type !== 'stacked' || chartData.length === 0) return [];
    const keys = Object.keys(chartData[0] || {});
    return keys.filter(k => k !== 'name');
  }, [chartState.type, chartData]);

  const handleAxisChange = (axis: 'x' | 'y', value: string) => {
    const newXAxis = axis === 'x' ? value : chartState.xAxis;
    const newYAxis = axis === 'y' ? value : chartState.yAxis;
    
    const newXIsNum = isNumericColumn(currentData, newXAxis);
    const newYIsNum = isNumericColumn(currentData, newYAxis);
    
    const newAggregation = suggestAggregation(newXIsNum, newYIsNum);
    const newChartType = getChartTypeForColumns(newXIsNum, newYIsNum, numericColumns.length) as ChartType;

    setChartState({
      ...chartState,
      [axis === 'x' ? 'xAxis' : 'yAxis']: value,
      aggregation: newAggregation,
      type: newChartType
    });
  };

  const handleExport = async (format: 'png' | 'svg') => {
    if (!chartRef.current) return;
    setIsExporting(true);

    try {
      if (format === 'png') {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          scale: 2
        });
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `chart-${chartState.type}-${Date.now()}.png`;
        link.click();
      } else {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const link = document.createElement('a');
          link.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
          link.download = `chart-${chartState.type}-${Date.now()}.svg`;
          link.click();
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (numericColumns.length === 0 && columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-slate-700 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
          <Sparkles className="w-10 h-10" />
        </div>
        <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>No Data Available</h3>
        <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>Upload a dataset to generate visualizations.</p>
      </div>
    );
  }

  const renderChart = () => {
    const textColor = isDark ? '#cbd5e1' : '#64748b';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 0, bottom: 60 }
    };

    switch (chartState.type) {
      case 'bar':
        return (
          <RechartsBar {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Legend />
            <Bar dataKey="value" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
          </RechartsBar>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Legend />
            <Area type="monotone" dataKey="value" fill="#10b981" stroke="#059669" />
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="x" tick={{ fill: textColor, fontSize: 12 }} />
            <YAxis dataKey="y" tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Scatter name={chartState.yAxis} dataKey="y" data={chartData} fill="#f59e0b" />
          </ScatterChart>
        );

      case 'histogram':
        return (
          <RechartsBar {...commonProps} data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="range" tick={{ fill: textColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Bar dataKey="frequency" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
          </RechartsBar>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={chartState.type === 'donut' ? 60 : 0}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
              label={{ fill: textColor }}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Legend />
          </PieChart>
        );

      case 'stacked':
        return (
          <RechartsBar {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: textColor, fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgb(0 0 0 / 0.1)', backgroundColor: isDark ? '#1e293b' : '#ffffff', color: isDark ? '#e2e8f0' : '#000' }} />
            <Legend />
            {stackedCategories.map((category, idx) => (
              <Bar key={category} dataKey={category} stackId="a" fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={idx === 0 ? [8, 8, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </RechartsBar>
        );

      default:
        return (
          <RechartsBar data={[]} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <XAxis />
            <YAxis />
          </RechartsBar>
        );
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-12 space-y-8">
      {/* Suggested Charts */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Suggested Charts</h3>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className={`text-sm ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Hide
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const xNum = isNumericColumn(currentData, suggestion.xAxis);
                  const yNum = isNumericColumn(currentData, suggestion.yAxis);
                  setChartState({
                    type: suggestion.type,
                    xAxis: suggestion.xAxis,
                    yAxis: suggestion.yAxis,
                    aggregation: suggestAggregation(xNum, yNum)
                  });
                }}
                className={`p-4 rounded-lg border transition-all text-left group ${isDark ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-700' : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50'}`}
              >
                <p className={`font-semibold text-sm ${isDark ? 'text-slate-100 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{suggestion.title}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{suggestion.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart Control Panel */}
      <div className={`rounded-2xl border p-6 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Chart Type</label>
            <select
              value={chartState.type}
              onChange={(e) => setChartState({ ...chartState, type: e.target.value as ChartType })}
              className={`w-full px-3 py-2 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="donut">Donut Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="histogram">Histogram</option>
              <option value="stacked">Stacked Bar</option>
            </select>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>X-Axis</label>
            <select
              value={chartState.xAxis}
              onChange={(e) => handleAxisChange('x', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Y-Axis</label>
            <select
              value={chartState.yAxis}
              onChange={(e) => handleAxisChange('y', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Aggregation</label>
            <select
              value={chartState.aggregation}
              onChange={(e) => setChartState({ ...chartState, aggregation: e.target.value as AggregationType })}
              className={`w-full px-3 py-2 rounded-lg border font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-700'}`}
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="average">Average</option>
              <option value="max">Max</option>
              <option value="min">Min</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${isDark ? 'bg-blue-900 hover:bg-blue-800 text-blue-100' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}
              title="Download as PNG"
            >
              PNG
            </button>
            <button
              onClick={() => handleExport('svg')}
              disabled={isExporting}
              className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
              title="Download as SVG"
            >
              SVG
            </button>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      {chartData.length > 0 && (
        <div className={`rounded-2xl border p-8 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} ref={chartRef}>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {chartData.length === 0 && (
        <div className={`rounded-2xl border p-12 text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className={isDark ? 'text-slate-400' : 'text-slate-500'}>No data available for this chart configuration. Try selecting different columns.</p>
        </div>
      )}
    </div>
  );
};
