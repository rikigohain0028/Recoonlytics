import { DataRow } from '@/context/DataContext';

export interface AIResponse {
  answer: string;
  explanation: string;
  insight?: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

function findColumn(query: string, columns: string[]): string | undefined {
  const q = query.toLowerCase();
  const sorted = [...columns].sort((a, b) => b.length - a.length);
  return sorted.find(col => q.includes(col.toLowerCase()));
}

function findNumericColumn(query: string, numericColumns: string[]): string | undefined {
  const q = query.toLowerCase();
  const sorted = [...numericColumns].sort((a, b) => b.length - a.length);
  return sorted.find(col => q.includes(col.toLowerCase()));
}

function findCategoricalColumn(query: string, columns: string[], numericColumns: string[]): string | undefined {
  const q = query.toLowerCase();
  const cats = columns.filter(c => !numericColumns.includes(c));
  const sorted = [...cats].sort((a, b) => b.length - a.length);
  return sorted.find(col => q.includes(col.toLowerCase()));
}

function inferNumericColumn(query: string, numericColumns: string[]): string | undefined {
  const q = query.toLowerCase();
  const explicit = findNumericColumn(query, numericColumns);
  if (explicit) return explicit;

  const hints: Record<string, string[]> = {
    sales: ['sales', 'revenue', 'amount', 'total', 'price', 'value', 'income'],
    revenue: ['revenue', 'sales', 'income', 'amount', 'total'],
    profit: ['profit', 'margin', 'net', 'earnings'],
    cost: ['cost', 'expense', 'spending', 'expenditure'],
    quantity: ['quantity', 'qty', 'count', 'units', 'volume'],
    price: ['price', 'rate', 'cost', 'amount', 'value'],
  };

  for (const [keyword, synonyms] of Object.entries(hints)) {
    if (q.includes(keyword)) {
      for (const syn of synonyms) {
        const match = numericColumns.find(c => c.toLowerCase().includes(syn));
        if (match) return match;
      }
    }
  }

  return numericColumns[0] || undefined;
}

function inferCategoricalColumn(query: string, columns: string[], numericColumns: string[]): string | undefined {
  const explicit = findCategoricalColumn(query, columns, numericColumns);
  if (explicit) return explicit;

  const q = query.toLowerCase();
  const cats = columns.filter(c => !numericColumns.includes(c));

  const hints: Record<string, string[]> = {
    city: ['city', 'location', 'region', 'area', 'place', 'town'],
    category: ['category', 'type', 'segment', 'group', 'class', 'department'],
    product: ['product', 'item', 'sku', 'name', 'brand'],
    customer: ['customer', 'client', 'user', 'buyer', 'account'],
    month: ['month', 'date', 'period', 'year', 'quarter'],
    country: ['country', 'nation', 'state', 'province'],
    region: ['region', 'zone', 'territory', 'district'],
  };

  for (const [keyword, synonyms] of Object.entries(hints)) {
    if (q.includes(keyword)) {
      for (const syn of synonyms) {
        const match = cats.find(c => c.toLowerCase().includes(syn));
        if (match) return match;
      }
    }
  }

  return undefined;
}

function getNumericValues(data: DataRow[], col: string): number[] {
  return data.map(row => {
    const val = row[col];
    if (typeof val === 'number') return val;
    const parsed = Number(String(val ?? '').replace(/,/g, ''));
    return isNaN(parsed) ? NaN : parsed;
  }).filter(v => !isNaN(v));
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (Math.abs(num) >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (Math.abs(num) >= 1_000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return num.toFixed(2).replace(/\.00$/, '');
}

function groupByAndAggregate(
  data: DataRow[], catCol: string, numCol: string, agg: 'sum' | 'avg' | 'count' | 'max' | 'min' = 'sum'
): { label: string; value: number }[] {
  const grouped = new Map<string, number[]>();
  data.forEach(row => {
    const key = String(row[catCol] ?? 'Unknown').trim() || 'Unknown';
    const raw = row[numCol];
    const val = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(/,/g, ''));
    if (!isNaN(val)) {
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(val);
    }
  });

  return Array.from(grouped.entries()).map(([label, vals]) => {
    let value: number;
    switch (agg) {
      case 'avg': value = vals.reduce((a, b) => a + b, 0) / vals.length; break;
      case 'count': value = vals.length; break;
      case 'max': value = Math.max(...vals); break;
      case 'min': value = Math.min(...vals); break;
      default: value = vals.reduce((a, b) => a + b, 0);
    }
    return { label, value };
  }).sort((a, b) => b.value - a.value);
}

function computeCorrelation(data: DataRow[], col1: string, col2: string): number | null {
  const pairs: [number, number][] = [];
  data.forEach(row => {
    const a = typeof row[col1] === 'number' ? row[col1] : Number(String(row[col1] ?? '').replace(/,/g, ''));
    const b = typeof row[col2] === 'number' ? row[col2] : Number(String(row[col2] ?? '').replace(/,/g, ''));
    if (!isNaN(a) && !isNaN(b)) pairs.push([a, b]);
  });

  if (pairs.length < 5) return null;

  const n = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p[0], 0);
  const sumY = pairs.reduce((s, p) => s + p[1], 0);
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const sumX2 = pairs.reduce((s, p) => s + p[0] ** 2, 0);
  const sumY2 = pairs.reduce((s, p) => s + p[1] ** 2, 0);

  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function detectOutliers(values: number[]): { outliers: number[]; lowerBound: number; upperBound: number } {
  if (values.length < 4) return { outliers: [], lowerBound: 0, upperBound: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const outliers = values.filter(v => v < lowerBound || v > upperBound);
  return { outliers, lowerBound, upperBound };
}

function computeGrowthRate(data: DataRow[], dateCol: string, numCol: string): { rate: number; firstPeriod: string; lastPeriod: string } | null {
  const periods: { period: string; value: number }[] = [];
  data.forEach(row => {
    const d = row[dateCol];
    const v = typeof row[numCol] === 'number' ? row[numCol] : Number(String(row[numCol] ?? '').replace(/,/g, ''));
    if (d && !isNaN(v)) {
      periods.push({ period: String(d), value: v });
    }
  });

  if (periods.length < 2) return null;

  const grouped = new Map<string, number>();
  periods.forEach(p => {
    grouped.set(p.period, (grouped.get(p.period) || 0) + p.value);
  });

  const sortedPeriods = Array.from(grouped.entries()).sort((a, b) => {
    const da = new Date(a[0]).getTime();
    const db = new Date(b[0]).getTime();
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return a[0].localeCompare(b[0]);
  });
  if (sortedPeriods.length < 2) return null;

  const first = sortedPeriods[0];
  const last = sortedPeriods[sortedPeriods.length - 1];
  if (first[1] === 0) return null;

  const rate = ((last[1] - first[1]) / Math.abs(first[1])) * 100;
  return { rate, firstPeriod: first[0], lastPeriod: last[0] };
}

export function askRecoonlyticsAI(
  query: string,
  data: DataRow[],
  columns: string[],
  numericColumns: string[]
): AIResponse {
  const q = query.toLowerCase().trim();

  if (data.length === 0) {
    return {
      answer: "No data is currently loaded.",
      explanation: "Please upload a dataset first to begin analysis.",
      confidence: 'High'
    };
  }

  const categoricalColumns = columns.filter(c => !numericColumns.includes(c));

  if (q.includes('how many rows') || q.includes('total rows') || q.includes('row count') || q.includes('how many records') || q.includes('dataset size')) {
    return {
      answer: `Your dataset contains ${data.length.toLocaleString()} rows and ${columns.length} columns.`,
      explanation: `The dataset has ${numericColumns.length} numeric column(s) (${numericColumns.join(', ') || 'none'}) and ${categoricalColumns.length} categorical column(s) (${categoricalColumns.slice(0, 5).join(', ') || 'none'}).`,
      insight: `This is a ${data.length > 10000 ? 'large' : data.length > 1000 ? 'medium-sized' : 'small'} dataset suitable for ${data.length > 10000 ? 'statistical' : 'detailed'} analysis.`,
      confidence: 'High'
    };
  }

  if (q.includes('what columns') || q.includes('which columns') || q.includes('list columns') || q.includes('show columns') || q.includes('column names')) {
    return {
      answer: `Your dataset has ${columns.length} columns:\n${columns.map((c, i) => `${i + 1}. ${c} (${numericColumns.includes(c) ? 'Numeric' : 'Categorical'})`).join('\n')}`,
      explanation: `${numericColumns.length} columns contain numeric data and ${categoricalColumns.length} contain text/categorical data.`,
      insight: `You can ask questions about any of these columns — for example "total ${numericColumns[0] || 'values'}" or "distribution of ${categoricalColumns[0] || 'categories'}".`,
      confidence: 'High'
    };
  }

  if (q.includes('duplicate')) {
    const uniqueRows = new Set<string>();
    let duplicateCount = 0;
    data.forEach(row => {
      const key = JSON.stringify(row);
      if (uniqueRows.has(key)) duplicateCount++;
      else uniqueRows.add(key);
    });

    return {
      answer: duplicateCount > 0
        ? `Found ${duplicateCount.toLocaleString()} duplicate row(s) out of ${data.length.toLocaleString()} total rows (${((duplicateCount / data.length) * 100).toFixed(1)}%).`
        : `No duplicate rows found in the dataset. All ${data.length.toLocaleString()} rows are unique.`,
      explanation: `Compared all column values across every row to identify exact duplicates.`,
      insight: duplicateCount > 0
        ? `Duplicate records can skew totals, averages, and charts. Use the Cleaning tab to remove them.`
        : `Clean dataset with no exact duplicates detected.`,
      confidence: 'High'
    };
  }

  if (q.includes('total') || q.includes('sum')) {
    const numCol = inferNumericColumn(query, numericColumns);
    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length === 0) {
        return { answer: `No valid numeric values found in "${numCol}".`, explanation: `The column appears empty or contains non-numeric data.`, confidence: 'Low' };
      }
      const sum = values.reduce((a, b) => a + b, 0);
      const missing = data.length - values.length;
      return {
        answer: `The total ${numCol} is ${formatNumber(sum)}.`,
        explanation: `Summed ${values.length.toLocaleString()} valid entries in the "${numCol}" column.${missing > 0 ? ` ${missing} row(s) had missing or non-numeric values and were excluded.` : ''}`,
        insight: `This aggregate represents the complete scope of ${numCol} across your dataset.`,
        confidence: missing > values.length * 0.1 ? 'Medium' : 'High'
      };
    }
  }

  if (q.includes('average') || q.includes('mean') || q.includes('avg')) {
    const numCol = inferNumericColumn(query, numericColumns);
    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length === 0) {
        return { answer: `No valid numeric values in "${numCol}".`, explanation: `Cannot compute average — column has no numeric data.`, confidence: 'Low' };
      }
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return {
        answer: `The average ${numCol} is ${formatNumber(avg)}.`,
        explanation: `Calculated from ${values.length.toLocaleString()} valid entries. Median is ${formatNumber(median)} — ${Math.abs(avg - median) / avg > 0.2 ? 'the difference suggests skewed data' : 'close to the average, indicating balanced distribution'}.`,
        insight: `This average serves as a baseline for identifying outliers or unusual patterns in ${numCol}.`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('median')) {
    const numCol = inferNumericColumn(query, numericColumns);
    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length === 0) {
        return { answer: `No valid numeric values in "${numCol}".`, explanation: `Cannot compute median.`, confidence: 'Low' };
      }
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      return {
        answer: `The median ${numCol} is ${formatNumber(median)}.`,
        explanation: `The middle value when all ${values.length.toLocaleString()} entries are sorted. Unlike the average, the median is not affected by extreme values.`,
        insight: `The median is a more robust measure when data has outliers.`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('highest') || q.includes('maximum') || q.includes('max') || q.includes('largest') || q.includes('biggest') || q.includes('top') || q.includes('best') || q.includes('most')) {
    const numCol = inferNumericColumn(query, numericColumns);
    const catCol = inferCategoricalColumn(query, columns, numericColumns);

    if (numCol && catCol && numCol !== catCol) {
      const agg = q.includes('average') || q.includes('avg') ? 'avg' : 'sum';
      const grouped = groupByAndAggregate(data, catCol, numCol, agg);
      if (grouped.length > 0) {
        const topN = q.match(/top\s*(\d+)/);
        const limit = topN ? Math.min(parseInt(topN[1]), 20) : 5;
        const top = grouped.slice(0, limit);
        const list = top.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');
        const totalAll = grouped.reduce((s, g) => s + g.value, 0);
        const topTotal = top.reduce((s, g) => s + g.value, 0);
        const pct = totalAll > 0 ? ((topTotal / totalAll) * 100).toFixed(1) : '0';

        return {
          answer: `Top ${top.length} ${catCol} by ${numCol} (${agg}):\n${list}`,
          explanation: `Grouped ${data.length.toLocaleString()} rows by "${catCol}" and calculated ${agg} of "${numCol}" for each. ${grouped.length} unique categories found. Top ${top.length} account for ${pct}% of the total.`,
          insight: `${top[0].label} leads with ${formatNumber(top[0].value)}${grouped.length > 1 ? `, which is ${formatNumber(top[0].value - (top[1]?.value || 0))} more than #2 (${top[1]?.label || 'N/A'})` : ''}.`,
          confidence: 'High'
        };
      }
    }

    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length > 0) {
        const max = Math.max(...values);
        const maxRow = data.find(row => {
          const v = typeof row[numCol] === 'number' ? row[numCol] : Number(String(row[numCol] ?? '').replace(/,/g, ''));
          return v === max;
        });
        const context = maxRow && categoricalColumns.length > 0
          ? ` (found in row where ${categoricalColumns[0]} = "${maxRow[categoricalColumns[0]]}")`
          : '';
        return {
          answer: `The highest ${numCol} is ${formatNumber(max)}${context}.`,
          explanation: `Scanned all ${values.length.toLocaleString()} valid entries to find the peak value.`,
          insight: `This is the maximum performance point in your dataset for ${numCol}.`,
          confidence: 'High'
        };
      }
    }

    if (catCol) {
      const numCol2 = numericColumns[0];
      if (numCol2) {
        const grouped = groupByAndAggregate(data, catCol, numCol2, 'sum');
        if (grouped.length > 0) {
          const top = grouped.slice(0, 5);
          const list = top.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');
          return {
            answer: `Top ${catCol} by ${numCol2}:\n${list}`,
            explanation: `Since no specific metric was mentioned, I used "${numCol2}" as the default. Grouped by "${catCol}" and summed values.`,
            insight: `${top[0].label} is the top performer with ${formatNumber(top[0].value)}.`,
            confidence: 'Medium'
          };
        }
      }
    }
  }

  if (q.includes('lowest') || q.includes('minimum') || q.includes('min') || q.includes('smallest') || q.includes('worst') || q.includes('least') || q.includes('bottom')) {
    const numCol = inferNumericColumn(query, numericColumns);
    const catCol = inferCategoricalColumn(query, columns, numericColumns);

    if (numCol && catCol && numCol !== catCol) {
      const grouped = groupByAndAggregate(data, catCol, numCol, 'sum');
      if (grouped.length > 0) {
        const bottom = grouped.slice(-5).reverse();
        const list = bottom.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');
        return {
          answer: `Bottom ${bottom.length} ${catCol} by ${numCol}:\n${list}`,
          explanation: `Grouped by "${catCol}" and found the lowest-performing entries by "${numCol}".`,
          insight: `${bottom[0].label} is the lowest performer — consider investigating why it underperforms.`,
          confidence: 'High'
        };
      }
    }

    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length > 0) {
        const min = Math.min(...values);
        return {
          answer: `The lowest ${numCol} is ${formatNumber(min)}.`,
          explanation: `Scanned ${values.length.toLocaleString()} valid entries to find the minimum value.`,
          insight: `This is the baseline value for ${numCol} in your dataset.`,
          confidence: 'High'
        };
      }
    }
  }

  if (q.includes('distribution') || q.includes('breakdown') || q.includes('how many') || q.includes('count by') || q.includes('by category') || q.includes('by type') || q.includes('segment')) {
    let col = findCategoricalColumn(query, columns, numericColumns);
    if (!col) col = inferCategoricalColumn(query, columns, numericColumns);
    if (!col && categoricalColumns.length > 0) col = categoricalColumns[0];

    if (col) {
      const counts = new Map<string, number>();
      data.forEach(row => {
        const val = String(row[col!] ?? 'Unknown').trim() || 'Unknown';
        counts.set(val, (counts.get(val) || 0) + 1);
      });
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      const total = data.length;
      const showCount = Math.min(sorted.length, 10);
      const breakdown = sorted.slice(0, showCount).map(([cat, count]) => {
        const pct = ((count / total) * 100).toFixed(1);
        return `${cat}: ${count.toLocaleString()} (${pct}%)`;
      }).join('\n');

      return {
        answer: `Distribution of ${col}${sorted.length > showCount ? ` (top ${showCount} of ${sorted.length})` : ''}:\n${breakdown}`,
        explanation: `Counted occurrences of each unique value in "${col}". ${sorted.length} unique categories found across ${total.toLocaleString()} rows.`,
        insight: `"${sorted[0][0]}" is the most common with ${sorted[0][1].toLocaleString()} entries (${((sorted[0][1] / total) * 100).toFixed(1)}% of total).`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('revenue by') || q.includes('sales by') || q.includes('amount by') || q.includes('profit by') || q.includes('value by') || q.includes('group by') || q.includes('by each')) {
    const numCol = inferNumericColumn(query, numericColumns);
    const catCol = inferCategoricalColumn(query, columns, numericColumns);
    if (numCol && catCol) {
      const grouped = groupByAndAggregate(data, catCol, numCol, 'sum');
      const top = grouped.slice(0, 10);
      const list = top.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');
      const total = grouped.reduce((s, g) => s + g.value, 0);
      return {
        answer: `${numCol} by ${catCol}:\n${list}`,
        explanation: `Aggregated "${numCol}" for each "${catCol}". ${grouped.length} groups found, total across all: ${formatNumber(total)}.`,
        insight: `The top category "${top[0]?.label}" accounts for ${total > 0 ? ((top[0]?.value / total) * 100).toFixed(1) : 0}% of total ${numCol}.`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('trend') || q.includes('growth') || q.includes('over time') || q.includes('increase') || q.includes('decrease') || q.includes('change')) {
    const numCol = inferNumericColumn(query, numericColumns);
    const dateCol = columns.find(c => {
      const lower = c.toLowerCase();
      return lower.includes('date') || lower.includes('month') || lower.includes('year') || lower.includes('period') || lower.includes('quarter') || lower.includes('time');
    });

    if (numCol && dateCol) {
      const growth = computeGrowthRate(data, dateCol, numCol);
      if (growth) {
        const direction = growth.rate > 0 ? 'increased' : 'decreased';
        return {
          answer: `${numCol} ${direction} by ${Math.abs(growth.rate).toFixed(1)}% from "${growth.firstPeriod}" to "${growth.lastPeriod}".`,
          explanation: `Compared aggregated ${numCol} across time periods in "${dateCol}". The earliest period totaled a certain amount and the latest period shows the change.`,
          insight: `${growth.rate > 5 ? 'Strong upward trend — good performance momentum.' : growth.rate < -5 ? 'Declining trend — may need attention and investigation.' : 'Relatively stable — no dramatic changes detected.'}`,
          confidence: 'Medium'
        };
      }
    }

    return {
      answer: `Could not detect a clear time-based trend.`,
      explanation: `I looked for a date/time column to analyze trends but ${dateCol ? `the data in "${dateCol}" doesn't have enough distinct periods` : 'no date/time column was found'}.`,
      insight: `Make sure your dataset includes a column with dates, months, or years to enable trend analysis.`,
      confidence: 'Low'
    };
  }

  if (q.includes('correlat') || q.includes('relationship') || q.includes('relate') || q.includes(' vs ') || q.includes('versus')) {
    const matchedNumCols = numericColumns.filter(c => q.includes(c.toLowerCase()));
    const col1 = matchedNumCols[0] || numericColumns[0];
    const col2 = matchedNumCols[1] || numericColumns[1];

    if (col1 && col2 && col1 !== col2) {
      const corr = computeCorrelation(data, col1, col2);
      if (corr !== null) {
        const strength = Math.abs(corr) > 0.7 ? 'strong' : Math.abs(corr) > 0.4 ? 'moderate' : 'weak';
        const direction = corr > 0 ? 'positive' : 'negative';
        return {
          answer: `There is a ${strength} ${direction} correlation (${corr.toFixed(3)}) between ${col1} and ${col2}.`,
          explanation: `Pearson correlation coefficient calculated from ${data.length} data points. Values range from -1 (perfect negative) to +1 (perfect positive). Zero means no linear relationship.`,
          insight: `${Math.abs(corr) > 0.7 ? `These columns move closely together — changes in ${col1} are likely associated with changes in ${col2}.` : Math.abs(corr) > 0.4 ? `There's a noticeable relationship worth investigating further.` : `These columns appear largely independent of each other.`}`,
          confidence: 'High'
        };
      }
    }

    if (numericColumns.length >= 2) {
      return {
        answer: `Specify two numeric columns to check correlation. Available: ${numericColumns.join(', ')}.`,
        explanation: `Include column names in your question, e.g., "correlation between ${numericColumns[0]} and ${numericColumns[1]}".`,
        confidence: 'Low'
      };
    }
  }

  if (q.includes('outlier') || q.includes('anomal') || q.includes('unusual') || q.includes('extreme')) {
    const numCol = inferNumericColumn(query, numericColumns) || numericColumns[0];
    if (numCol) {
      const values = getNumericValues(data, numCol);
      const { outliers, lowerBound, upperBound } = detectOutliers(values);
      if (outliers.length > 0) {
        const high = outliers.filter(v => v > upperBound);
        const low = outliers.filter(v => v < lowerBound);
        return {
          answer: `Found ${outliers.length} outlier(s) in ${numCol}: ${high.length} above ${formatNumber(upperBound)} and ${low.length} below ${formatNumber(lowerBound)}.`,
          explanation: `Used IQR method: values outside [${formatNumber(lowerBound)}, ${formatNumber(upperBound)}] are outliers. Analyzed ${values.length.toLocaleString()} valid values.`,
          insight: `Outliers can significantly affect averages and totals. Review them to determine if they're data errors or genuine extreme values.`,
          confidence: 'High'
        };
      } else {
        return {
          answer: `No statistical outliers detected in ${numCol}.`,
          explanation: `All ${values.length.toLocaleString()} values fall within the expected range [${formatNumber(lowerBound)}, ${formatNumber(upperBound)}].`,
          insight: `The data distribution appears normal and consistent.`,
          confidence: 'High'
        };
      }
    }
  }

  if (q.includes('missing') || q.includes('empty') || q.includes('null') || q.includes('blank')) {
    const results = columns.map(col => {
      const missing = data.filter(row => {
        const v = row[col];
        return v === null || v === undefined || v === '' || String(v).trim() === '';
      }).length;
      return { col, missing, pct: ((missing / data.length) * 100).toFixed(1) };
    }).filter(r => r.missing > 0).sort((a, b) => b.missing - a.missing);

    if (results.length > 0) {
      const list = results.slice(0, 8).map(r => `${r.col}: ${r.missing.toLocaleString()} missing (${r.pct}%)`).join('\n');
      return {
        answer: `Missing values found in ${results.length} column(s):\n${list}`,
        explanation: `Scanned all ${data.length.toLocaleString()} rows. Cells with null, empty, or blank values are counted as missing.`,
        insight: `${parseFloat(results[0].pct) > 20 ? 'High missing rate — consider dropping or imputing these columns.' : 'Manageable level of missing data — the dataset is mostly complete.'}`,
        confidence: 'High'
      };
    } else {
      return {
        answer: `No missing values found. All ${columns.length} columns are fully populated across ${data.length.toLocaleString()} rows.`,
        explanation: `Every cell has a non-empty value.`,
        insight: `Complete data — excellent for reliable analysis.`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('unique') || q.includes('distinct') || q.includes('cardinality')) {
    const col = findColumn(query, columns) || categoricalColumns[0];
    if (col) {
      const unique = new Set(data.map(row => String(row[col] ?? '')));
      return {
        answer: `There are ${unique.size.toLocaleString()} unique values in "${col}".`,
        explanation: `Out of ${data.length.toLocaleString()} rows, "${col}" has ${unique.size} distinct values.`,
        insight: `${unique.size === data.length ? 'Every value is unique — this could be an ID column.' : unique.size < 10 ? 'Low cardinality — good for grouping and filtering.' : 'Moderate variety — useful for segmentation analysis.'}`,
        confidence: 'High'
      };
    }
  }

  if (q.includes('compare')) {
    const matchedCols = columns.filter(c => q.includes(c.toLowerCase())).slice(0, 2);
    if (matchedCols.length === 2) {
      const bothNumeric = numericColumns.includes(matchedCols[0]) && numericColumns.includes(matchedCols[1]);
      if (bothNumeric) {
        const vals1 = getNumericValues(data, matchedCols[0]);
        const vals2 = getNumericValues(data, matchedCols[1]);
        const avg1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
        const avg2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
        const sum1 = vals1.reduce((a, b) => a + b, 0);
        const sum2 = vals2.reduce((a, b) => a + b, 0);
        const corr = computeCorrelation(data, matchedCols[0], matchedCols[1]);

        return {
          answer: `Comparison of ${matchedCols[0]} vs ${matchedCols[1]}:\n• ${matchedCols[0]}: Total ${formatNumber(sum1)}, Avg ${formatNumber(avg1)}\n• ${matchedCols[1]}: Total ${formatNumber(sum2)}, Avg ${formatNumber(avg2)}${corr !== null ? `\n• Correlation: ${corr.toFixed(3)}` : ''}`,
          explanation: `Direct comparison of both numeric columns across ${data.length.toLocaleString()} rows.`,
          insight: `${sum1 > sum2 ? matchedCols[0] : matchedCols[1]} has a higher total by ${formatNumber(Math.abs(sum1 - sum2))}.`,
          confidence: 'High'
        };
      }
    }
  }

  const hasAnyColumnRef = columns.some(col => q.includes(col.toLowerCase()));
  const hasAnyKeyword = ['total', 'sum', 'average', 'mean', 'high', 'low', 'max', 'min', 'count',
    'duplicate', 'trend', 'growth', 'correlat', 'outlier', 'missing', 'compare', 'distribut',
    'how many', 'which', 'what', 'top', 'bottom', 'best', 'worst', 'rank'].some(kw => q.includes(kw));

  if (!hasAnyColumnRef && !hasAnyKeyword) {
    const catCol = categoricalColumns[0];
    const numCol = numericColumns[0];

    if (catCol && numCol) {
      const grouped = groupByAndAggregate(data, catCol, numCol, 'sum');
      const top3 = grouped.slice(0, 3);
      const list = top3.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');

      return {
        answer: `I wasn't sure what you meant, so here's a quick summary:\n\n• Rows: ${data.length.toLocaleString()}\n• Top ${catCol} by ${numCol}:\n${list}`,
        explanation: `Your question didn't reference specific columns. Your dataset has these columns: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? '...' : ''}. Try asking about specific columns for precise answers.`,
        insight: `Try questions like: "total ${numCol}", "top ${catCol} by ${numCol}", "distribution of ${catCol}", or "any outliers in ${numCol}?"`,
        confidence: 'Low'
      };
    }
  }

  if (hasAnyColumnRef || hasAnyKeyword) {
    const numCol = inferNumericColumn(query, numericColumns);
    const catCol = inferCategoricalColumn(query, columns, numericColumns);

    if (numCol && catCol) {
      const grouped = groupByAndAggregate(data, catCol, numCol, 'sum');
      const top = grouped.slice(0, 5);
      const list = top.map(({ label, value }, i) => `${i + 1}. ${label}: ${formatNumber(value)}`).join('\n');
      return {
        answer: `Here's ${numCol} grouped by ${catCol}:\n${list}`,
        explanation: `I interpreted your question as a group-by query. Summed "${numCol}" for each "${catCol}" value.`,
        insight: `${top[0]?.label} leads with ${formatNumber(top[0]?.value || 0)}.`,
        confidence: 'Medium'
      };
    }

    if (numCol) {
      const values = getNumericValues(data, numCol);
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return {
          answer: `Summary of ${numCol}:\n• Total: ${formatNumber(sum)}\n• Average: ${formatNumber(avg)}\n• Median: ${formatNumber(median)}\n• Min: ${formatNumber(Math.min(...values))}\n• Max: ${formatNumber(Math.max(...values))}`,
          explanation: `Computed from ${values.length.toLocaleString()} valid entries in "${numCol}".`,
          insight: `Range spans ${formatNumber(Math.max(...values) - Math.min(...values))}, indicating ${(Math.max(...values) - Math.min(...values)) / avg > 2 ? 'high variability' : 'consistent values'} in the data.`,
          confidence: 'High'
        };
      }
    }
  }

  return {
    answer: "I couldn't find a precise way to answer this question from your data.",
    explanation: `Your dataset has these columns: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? ', ...' : ''}. I can answer questions about totals, averages, rankings, distributions, trends, correlations, outliers, and comparisons.`,
    insight: `Try specific questions like:\n• "What is the total ${numericColumns[0] || 'amount'}?"\n• "Which ${categoricalColumns[0] || 'category'} has the highest ${numericColumns[0] || 'value'}?"\n• "Show distribution of ${categoricalColumns[0] || 'categories'}"`,
    confidence: 'Low'
  };
}
