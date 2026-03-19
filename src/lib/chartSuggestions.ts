import { DataRow } from '@/context/DataContext';

export interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'histogram' | 'stacked';
  title: string;
  xAxis: string;
  yAxis: string;
  description: string;
}

export function suggestCharts(
  data: DataRow[],
  columns: string[],
  numericColumns: string[]
): ChartSuggestion[] {
  if (data.length === 0 || columns.length === 0) return [];

  const suggestions: ChartSuggestion[] = [];
  const categoricalColumns = columns.filter(c => !numericColumns.includes(c));

  // Get date columns (simple heuristic)
  const dateColumns = columns.filter(c => {
    const sample = String(data[0]?.[c] || '');
    return /^\d{4}-\d{2}-\d{2}|^\d{1,2}\/\d{1,2}\/\d{4}/.test(sample);
  });

  // Suggestion 1: Bar Chart (Category + Numeric)
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    const catCol = categoricalColumns[0];
    const numCol = numericColumns[0];
    const uniqueValues = new Set(data.map(r => r[catCol])).size;
    
    if (uniqueValues > 1 && uniqueValues < 50) {
      suggestions.push({
        type: 'bar',
        title: `${numCol} by ${catCol}`,
        xAxis: catCol,
        yAxis: numCol,
        description: `Distribution of ${numCol} across ${catCol}`
      });
    }
  }

  // Suggestion 2: Line Chart (Date + Numeric)
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    suggestions.push({
      type: 'line',
      title: `${numericColumns[0]} Over Time`,
      xAxis: dateColumns[0],
      yAxis: numericColumns[0],
      description: `Trend of ${numericColumns[0]} over ${dateColumns[0]}`
    });
  }

  // Suggestion 3: Pie Chart (Single Category)
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    const catCol = categoricalColumns[0];
    const uniqueValues = new Set(data.map(r => r[catCol])).size;
    
    if (uniqueValues > 1 && uniqueValues <= 10) {
      suggestions.push({
        type: 'pie',
        title: `${numericColumns[0]} Composition`,
        xAxis: catCol,
        yAxis: numericColumns[0],
        description: `Proportion of ${numericColumns[0]} by ${catCol}`
      });
    }
  }

  // Suggestion 4: Area Chart (Date + Numeric)
  if (dateColumns.length > 0 && numericColumns.length > 1) {
    suggestions.push({
      type: 'area',
      title: `${numericColumns[1] || numericColumns[0]} Area Trend`,
      xAxis: dateColumns[0],
      yAxis: numericColumns[1] || numericColumns[0],
      description: `Area chart showing trends over time`
    });
  }

  // Suggestion 5: Scatter Plot (Two Numeric)
  if (numericColumns.length >= 2) {
    suggestions.push({
      type: 'scatter',
      title: `${numericColumns[0]} vs ${numericColumns[1]}`,
      xAxis: numericColumns[0],
      yAxis: numericColumns[1],
      description: `Relationship between ${numericColumns[0]} and ${numericColumns[1]}`
    });
  }

  // Suggestion 6: Histogram (Numeric Distribution)
  if (numericColumns.length > 0) {
    suggestions.push({
      type: 'histogram',
      title: `${numericColumns[0]} Distribution`,
      xAxis: numericColumns[0],
      yAxis: 'frequency',
      description: `Distribution pattern of ${numericColumns[0]} values`
    });
  }

  // Suggestion 7: Stacked Bar (Multiple Categories)
  if (categoricalColumns.length >= 2 && numericColumns.length > 0) {
    suggestions.push({
      type: 'stacked',
      title: `${numericColumns[0]} Stacked by ${categoricalColumns[1]}`,
      xAxis: categoricalColumns[0],
      yAxis: numericColumns[0],
      description: `Stacked distribution across categories`
    });
  }

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

export const CHART_COLORS = [
  '#1e3a8a', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b',
  '#f43f5e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];
