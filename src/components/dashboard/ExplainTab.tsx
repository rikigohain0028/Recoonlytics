import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/context/ThemeContext';
import {
  Lightbulb, Send, Sparkles, User, Bot, FileText,
  BarChart2, Trophy, AlertTriangle, TrendingUp, GitMerge,
  AlertCircle, Zap, ClipboardList, ChevronDown, ChevronUp,
  Database, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { askRecoonlyticsAI, AIResponse } from '@/lib/aiAssistant';
import { generateReport, DatasetReport } from '@/lib/dataAnalyzer';

interface Message {
  role: 'user' | 'assistant';
  content: string | AIResponse;
  timestamp: Date;
}

type ViewMode = 'report' | 'chat';

// ── Section Component ─────────────────────────────────────────────────────
const ReportSection = ({
  icon, title, color, children, defaultOpen = true, isDark
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isDark: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between p-5 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <h3 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className={`px-5 pb-5 pt-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

// ── Bullet List ───────────────────────────────────────────────────────────
const BulletList = ({ items, isDark, accent = 'blue' }: { items: string[]; isDark: boolean; accent?: string }) => (
  <ul className="space-y-2 mt-3">
    {items.map((item, i) => (
      <li key={i} className={`flex items-start gap-2.5 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent === 'green' ? 'bg-emerald-500' : accent === 'amber' ? 'bg-amber-500' : accent === 'red' ? 'bg-rose-500' : 'bg-blue-500'}`} />
        {item}
      </li>
    ))}
  </ul>
);

// ── TopPerformers Table ───────────────────────────────────────────────────
const PerformerTable = ({ section, items, isDark, showLow = false }: { section: string; items: any[]; isDark: boolean; showLow?: boolean }) => (
  <div className="mt-3">
    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{section}</p>
    <div className="space-y-2">
      {items.slice(0, 5).map((item, i) => (
        <div key={i} className={`flex items-center justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
              showLow ? 'bg-rose-100 text-rose-600' : i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
            }`}>{showLow ? '↓' : i + 1}</span>
            <span className={`text-sm font-semibold truncate max-w-[180px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.label}</span>
          </div>
          <span className={`text-sm font-bold ${showLow ? (isDark ? 'text-rose-400' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────
export const ExplainTab = () => {
  const { currentData, columns, numericColumns, fileName } = useData();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('report');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: {
        answer: "Hello! I'm Recoonlytics AI — your personal data analyst. Ask me anything about your dataset.",
        explanation: "I can calculate totals, averages, find top performers, detect patterns, and answer specific questions about your data."
      },
      timestamp: new Date()
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const report: DatasetReport = useMemo(
    () => generateReport(currentData, columns, numericColumns),
    [currentData, columns, numericColumns]
  );

  const sendQuestion = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() };
    const aiRes = askRecoonlyticsAI(text, currentData, columns, numericColumns);
    const aiMsg: Message = { role: 'assistant', content: aiRes, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg, aiMsg]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    sendQuestion(query);
    setQuery('');
  };

  const catCols = columns.filter(c => !numericColumns.includes(c));
  const quickQuestions = [
    'How many duplicates are there?',
    `What is the total ${numericColumns[0] || 'value'}?`,
    numericColumns[0] && catCols[0] ? `Which ${catCols[0]} has the highest ${numericColumns[0]}?` : `Distribution of ${catCols[0] || 'categories'}`,
    `What is the average ${numericColumns[0] || 'value'}?`,
    numericColumns[0] ? `Any outliers in ${numericColumns[0]}?` : 'How many rows are there?',
    'Any missing values?',
    numericColumns[0] && catCols[0] ? `Top 5 ${catCols[0]} by ${numericColumns[0]}` : 'What columns are available?',
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-16 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDark ? 'bg-blue-900 text-blue-400' : 'bg-blue-600 text-white'}`}>
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-2xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Explain My Data
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              AI-powered professional analysis
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button
            onClick={() => setViewMode('report')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'report' ? (isDark ? 'bg-blue-700 text-white' : 'bg-[#1e3a8a] text-white') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              AI Report
            </span>
          </button>
          <button
            onClick={() => setViewMode('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'chat' ? (isDark ? 'bg-blue-700 text-white' : 'bg-[#1e3a8a] text-white') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
          >
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              AI Assistant
            </span>
          </button>
        </div>
      </div>

      {/* ── AI REPORT VIEW ────────────────────────────────────────────── */}
      {viewMode === 'report' && (
        <div className="space-y-4">
          {/* Quick Answer Bar */}
          <div className={`rounded-2xl border p-4 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>⚡ Quick Answers</p>
            <div className="flex flex-wrap gap-3">
              {report.quickAnswers.map((qa, i) => (
                <div key={i} className={`px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{qa.label}</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{qa.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 1. AI Key Insights */}
          <ReportSection icon={<Sparkles className="w-4 h-4 text-yellow-600" />} title="🔎 AI Key Insights" color="bg-yellow-50" isDark={isDark} defaultOpen={true}>
            <BulletList items={report.keyInsights} isDark={isDark} accent="blue" />
          </ReportSection>

          {/* 2. Data Structure */}
          <ReportSection icon={<Database className="w-4 h-4 text-blue-600" />} title="📊 Data Structure" color="bg-blue-50" isDark={isDark}>
            <div className="mt-3 space-y-3">
              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{report.dataStructure.description}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Rows', value: report.dataStructure.rows.toLocaleString(), color: isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700' },
                  { label: 'Columns', value: report.dataStructure.cols, color: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700' },
                  { label: 'Numeric', value: report.dataStructure.numericCols.length, color: isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-700' },
                  { label: 'Categorical', value: report.dataStructure.categoricalCols.length, color: isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-700' },
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl ${item.color}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.label}</p>
                    <p className="text-xl font-bold">{item.value}</p>
                  </div>
                ))}
              </div>
              {report.dataStructure.numericCols.length > 0 && (
                <div className={`p-3 rounded-xl text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                  <span className="font-bold">Numeric Columns:</span> {report.dataStructure.numericCols.join(', ')}
                </div>
              )}
              {report.dataStructure.categoricalCols.length > 0 && (
                <div className={`p-3 rounded-xl text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                  <span className="font-bold">Categorical Columns:</span> {report.dataStructure.categoricalCols.join(', ')}
                </div>
              )}
              {report.dataStructure.dateCols.length > 0 && (
                <div className={`p-3 rounded-xl text-sm ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                  <span className="font-bold">Date Columns:</span> {report.dataStructure.dateCols.join(', ')}
                </div>
              )}
            </div>
          </ReportSection>

          {/* 3. Top Performers */}
          {report.topPerformers.length > 0 && (
            <ReportSection icon={<Trophy className="w-4 h-4 text-yellow-600" />} title="🏆 Top Performers" color="bg-yellow-50" isDark={isDark}>
              {report.topPerformers.map((perf, i) => (
                <PerformerTable key={i} section={perf.section} items={perf.items} isDark={isDark} />
              ))}
            </ReportSection>
          )}

          {/* 4. Underperforming Areas */}
          {report.underperforming.length > 0 && (
            <ReportSection icon={<AlertTriangle className="w-4 h-4 text-rose-500" />} title="⚠ Underperforming Areas" color="bg-rose-50" isDark={isDark} defaultOpen={false}>
              {report.underperforming.map((perf, i) => (
                <PerformerTable key={i} section={perf.section} items={perf.items} isDark={isDark} showLow />
              ))}
            </ReportSection>
          )}

          {/* 5. Patterns and Distribution */}
          <ReportSection icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} title="📈 Patterns and Distribution" color="bg-emerald-50" isDark={isDark} defaultOpen={false}>
            <BulletList items={report.patterns} isDark={isDark} accent="green" />
            {/* Category distribution mini charts */}
            {report.categoryCounts.slice(0, 2).map(({ col, stats }) => stats.length > 0 && (
              <div key={col} className="mt-4">
                <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{col} Distribution</p>
                {stats.slice(0, 6).map((s) => (
                  <div key={s.name} className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-medium truncate w-32 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.name}</span>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(s.pct, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            ))}
          </ReportSection>

          {/* 6. Relationships */}
          <ReportSection icon={<GitMerge className="w-4 h-4 text-indigo-600" />} title="🔗 Relationships and Correlations" color="bg-indigo-50" isDark={isDark} defaultOpen={false}>
            <BulletList items={report.relationships} isDark={isDark} accent="blue" />
          </ReportSection>

          {/* 7. Anomalies */}
          <ReportSection icon={<AlertCircle className="w-4 h-4 text-orange-600" />} title="🚨 Unusual Patterns or Anomalies" color="bg-orange-50" isDark={isDark} defaultOpen={false}>
            <BulletList items={report.anomalies} isDark={isDark} accent="amber" />
          </ReportSection>

          {/* 8. Recommendations */}
          <ReportSection icon={<Zap className="w-4 h-4 text-blue-600" />} title="💡 Actionable Recommendations" color="bg-blue-50" isDark={isDark} defaultOpen={false}>
            <BulletList items={report.recommendations.length > 0 ? report.recommendations : ['No specific recommendations available — dataset looks clean.']} isDark={isDark} accent="green" />
          </ReportSection>

          {/* 9. Numeric Stats Detail */}
          {report.numericStats.length > 0 && (
            <ReportSection icon={<BarChart2 className="w-4 h-4 text-purple-600" />} title="📉 Numeric Column Statistics" color="bg-purple-50" isDark={isDark} defaultOpen={false}>
              <div className="mt-3 space-y-3">
                {report.numericStats.map(stat => (
                  <div key={stat.col} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`font-bold text-sm mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{stat.col}</p>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { label: 'Min', val: stat.min },
                        { label: 'Max', val: stat.max },
                        { label: 'Average', val: stat.avg },
                        { label: 'Median', val: stat.median },
                        { label: 'Total', val: stat.sum },
                      ].map((s, i) => (
                        <div key={i}>
                          <p className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{s.label}</p>
                          <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {s.val >= 1000 ? s.val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : s.val.toFixed(2).replace(/\.00$/, '')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ReportSection>
          )}

          {/* 10. Executive Summary */}
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gradient-to-br from-blue-900/40 to-slate-900 border-blue-800' : 'bg-gradient-to-br from-blue-50 to-white border-blue-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-900 text-blue-400' : 'bg-blue-600 text-white'}`}>
                <ClipboardList className="w-4 h-4" />
              </div>
              <h3 className={`font-bold text-base ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>🧾 Executive Summary</h3>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {report.executiveSummary}
            </p>
          </div>
        </div>
      )}

      {/* ── AI CHAT VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'chat' && (
        <div className="space-y-4">
          {/* Quick question chips */}
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                data-testid={`button-quick-question-${i}`}
                onClick={() => sendQuestion(q)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500 hover:text-blue-400' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600'}`}
              >
                {q}
              </button>
            ))}
          </div>

          <Card className={`rounded-3xl border overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`} style={{ height: '65vh' }}>
            <CardHeader className={`border-b pb-4 flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
              <CardTitle className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                <Sparkles className="w-4 h-4 text-blue-500" />
                Ask Recoonlytics AI
                <span className={`ml-auto text-xs font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Analyzing: {fileName || 'Your Dataset'}
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                  <div className={`max-w-[88%] flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-blue-400' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {typeof msg.content === 'string' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-xs uppercase tracking-wider opacity-60">Answer</p>
                              {msg.content.confidence && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  msg.content.confidence === 'High' ? (isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') :
                                  msg.content.confidence === 'Medium' ? (isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700') :
                                  (isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')
                                }`}>
                                  {msg.content.confidence} confidence
                                </span>
                              )}
                            </div>
                            <p className="whitespace-pre-wrap font-medium">{msg.content.answer}</p>
                          </div>
                          <div className={`border-t pt-2 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                            <p className="font-bold text-xs uppercase tracking-wider opacity-60 mb-1">Explanation</p>
                            <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">{msg.content.explanation}</p>
                          </div>
                          {msg.content.insight && (
                            <div className={`px-3 py-2 rounded-xl text-xs font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                              <span className="font-bold">Insight: </span>{msg.content.insight}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </CardContent>

            <div className={`p-4 border-t flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  data-testid="input-ai-question"
                  placeholder="Ask: totals, averages, top performers, outliers, trends, correlations..."
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
                <Button type="submit" size="icon" className="rounded-xl w-10 h-10">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
