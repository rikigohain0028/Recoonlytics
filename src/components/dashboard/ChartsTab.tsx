import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { 
  BarChart as RechartsBar, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = ['#1e3a8a', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export const ChartsTab = () => {
  const { currentData, columns, numericColumns } = useData();
  
  // Try to find a good default categorical column (fewest unique values, max 20)
  const defaultCatCol = useMemo(() => {
    const nonNumeric = columns.filter(c => !numericColumns.includes(c));
    if (!nonNumeric.length) return columns[0];
    
    let bestCol = nonNumeric[0];
    let minUniques = Infinity;
    
    nonNumeric.forEach(col => {
      const uniques = new Set(currentData.map(r => r[col])).size;
      if (uniques < minUniques && uniques > 1 && uniques < 50) {
        minUniques = uniques;
        bestCol = col;
      }
    });
    return bestCol;
  }, [columns, numericColumns, currentData]);

  const [xAxisCol, setXAxisCol] = useState<string>(defaultCatCol || columns[0]);
  const [yAxisCol, setYAxisCol] = useState<string>(numericColumns[0] || columns[0]);

  // Aggregate data for the selected axes
  const chartData = useMemo(() => {
    if (!xAxisCol || !yAxisCol || !currentData.length) return [];
    
    const aggregated = new Map<string, number>();
    currentData.forEach(row => {
      const xVal = String(row[xAxisCol] || 'Unknown');
      const yVal = Number(row[yAxisCol]);
      if (!isNaN(yVal)) {
        aggregated.set(xVal, (aggregated.get(xVal) || 0) + yVal);
      }
    });

    // Convert to array and take top 15 to avoid messy charts
    return Array.from(aggregated.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [currentData, xAxisCol, yAxisCol]);

  if (numericColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <PieIcon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Need Numeric Data</h3>
        <p className="text-slate-500 max-w-md">Charts require at least one numeric column to plot values.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-900">Visualizations</h2>
          <p className="text-slate-500 mt-1">Generate beautiful charts instantly from your data.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Label (X-Axis)</label>
            <select 
              value={xAxisCol}
              onChange={(e) => setXAxisCol(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Value (Y-Axis)</label>
            <select 
              value={yAxisCol}
              onChange={(e) => setYAxisCol(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            Distribution (Bar)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBar data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 20}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#1e3a8a" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </RechartsBar>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            Trend (Line)
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 20}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
            Composition (Pie)
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
