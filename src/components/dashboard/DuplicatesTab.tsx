import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CopyX } from 'lucide-react';

export const DuplicatesTab = () => {
  const { currentData, columns } = useData();

  const { uniqueCount, duplicates, duplicateRowsList } = useMemo(() => {
    const seen = new Set<string>();
    let dupes = 0;
    const dupRows: any[] = [];
    
    // Store original index for display
    currentData.forEach((row, idx) => {
      const str = JSON.stringify(row);
      if (seen.has(str)) {
        dupes++;
        if (dupRows.length < 50) { // Limit to 50 for performance
          dupRows.push({ ...row, _originalRowIndex: idx + 1 });
        }
      } else {
        seen.add(str);
      }
    });

    return { 
      uniqueCount: seen.size, 
      duplicates: dupes,
      duplicateRowsList: dupRows
    };
  }, [currentData]);

  const chartData = [
    { name: 'Unique Rows', count: uniqueCount, color: '#10b981' }, // Emerald
    { name: 'Duplicate Rows', count: duplicates, color: '#f43f5e' } // Rose
  ];

  if (duplicates === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in fade-in">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-4">
          <CopyX className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Clean Dataset!</h3>
        <p className="text-slate-500 max-w-md">We didn't find any exact duplicate rows in your data.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-display font-bold text-slate-900">Duplicate Analysis</h2>
        <p className="text-slate-500 mt-1">Identified {duplicates} exact matching rows.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center text-center">
          <p className="text-slate-500 font-medium mb-2 uppercase tracking-wide text-sm">Duplicate Count</p>
          <p className="text-5xl font-display font-bold text-rose-600 mb-2">{duplicates}</p>
          <p className="text-sm text-slate-400">out of {currentData.length} total rows</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 h-[300px]">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Data Composition</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 500}} width={120} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-rose-50/30">
          <h3 className="font-bold text-slate-800">Sample of Duplicate Rows (First 50)</h3>
        </div>
        <div className="overflow-auto custom-scrollbar flex-1 max-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-600 w-16">Row #</th>
                {columns.map((col, i) => (
                  <th key={i} className="px-6 py-3 font-semibold text-slate-600">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {duplicateRowsList.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-rose-50/50">
                  <td className="px-6 py-3 text-rose-500 font-medium border-r border-slate-100 bg-rose-50/20">
                    {row._originalRowIndex}
                  </td>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-6 py-3 text-slate-700">
                      {String(row[col] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
