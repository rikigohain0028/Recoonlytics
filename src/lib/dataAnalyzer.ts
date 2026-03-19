import { DataRow } from '@/context/DataContext';

export interface ColumnStat {
  col: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  count: number;
}

export interface CategoryStat {
  name: string;
  count: number;
  pct: number;
}

export interface TopPerformer {
  label: string;
  value: number;
  category: string;
  column: string;
}

export interface DatasetReport {
  keyInsights: string[];
  dataStructure: {
    rows: number;
    cols: number;
    numericCols: string[];
    categoricalCols: string[];
    dateCols: string[];
    datasetType: string;
    description: string;
  };
  topPerformers: { section: string; items: TopPerformer[] }[];
  underperforming: { section: string; items: TopPerformer[] }[];
  patterns: string[];
  relationships: string[];
  anomalies: string[];
  recommendations: string[];
  quickAnswers: { label: string; value: string }[];
  executiveSummary: string;
  numericStats: ColumnStat[];
  categoryCounts: { col: string; stats: CategoryStat[] }[];
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return n.toLocaleString();
  return n.toFixed(2).replace(/\.00$/, '');
}

function isDateColumn(values: string[]): boolean {
  const sample = values.slice(0, 20).filter(Boolean);
  const datePatterns = [
    /\d{4}-\d{2}-\d{2}/,
    /\d{2}\/\d{2}\/\d{4}/,
    /\d{2}-\d{2}-\d{4}/,
    /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i
  ];
  const matchCount = sample.filter(v => datePatterns.some(p => p.test(v))).length;
  return matchCount > sample.length * 0.5;
}

export function generateReport(
  data: DataRow[],
  columns: string[],
  numericColumns: string[]
): DatasetReport {
  if (!data.length || !columns.length) {
    return {
      keyInsights: ['No data loaded.'],
      dataStructure: { rows: 0, cols: 0, numericCols: [], categoricalCols: [], dateCols: [], datasetType: 'Unknown', description: 'No data loaded.' },
      topPerformers: [],
      underperforming: [],
      patterns: [],
      relationships: [],
      anomalies: [],
      recommendations: [],
      quickAnswers: [],
      executiveSummary: 'No data is currently loaded.',
      numericStats: [],
      categoryCounts: []
    };
  }

  const categoricalCols = columns.filter(c => !numericColumns.includes(c));
  const dateCols = categoricalCols.filter(col => {
    const vals = data.slice(0, 30).map(r => String(r[col] || ''));
    return isDateColumn(vals);
  });
  const pureCatCols = categoricalCols.filter(c => !dateCols.includes(c));

  // ── Numeric Stats ─────────────────────────────────────
  const numericStats: ColumnStat[] = numericColumns.map(col => {
    const vals = data.map(r => {
      const v = r[col];
      return typeof v === 'number' ? v : Number(String(v).replace(/[,$]/g, ''));
    }).filter(v => !isNaN(v));

    if (!vals.length) return null;
    const sorted = [...vals].sort((a, b) => a - b);
    const sum = vals.reduce((a, b) => a + b, 0);
    return {
      col,
      sum,
      avg: sum / vals.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      count: vals.length
    };
  }).filter(Boolean) as ColumnStat[];

  // ── Category Counts ───────────────────────────────────
  const categoryCounts = pureCatCols.map(col => {
    const counts = new Map<string, number>();
    data.forEach(r => {
      const v = String(r[col] || 'Unknown');
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: parseFloat(((count / data.length) * 100).toFixed(1)) }));
    return { col, stats: sorted };
  });

  // ── Dataset Type Detection ────────────────────────────
  const allCols = columns.join(' ').toLowerCase();
  let datasetType = 'General Dataset';
  let datasetDesc = 'A structured tabular dataset.';

  if (/sale|revenue|order|invoice|product|quantity|price|discount/.test(allCols)) {
    datasetType = 'Sales / E-commerce Data';
    datasetDesc = 'This appears to be sales or e-commerce transaction data, containing order information, products, and financial metrics.';
  } else if (/bank|balance|debit|credit|transaction|account/.test(allCols)) {
    datasetType = 'Financial / Bank Statement';
    datasetDesc = 'This appears to be financial transaction data, likely from a bank statement or accounting system.';
  } else if (/student|grade|score|subject|exam|marks|attendance/.test(allCols)) {
    datasetType = 'Education / Academic Data';
    datasetDesc = 'This appears to be academic data, tracking student performance, grades, or attendance.';
  } else if (/customer|name|email|phone|address|city|country/.test(allCols)) {
    datasetType = 'Customer / CRM Data';
    datasetDesc = 'This appears to be customer relationship or contact management data.';
  } else if (/employee|salary|department|position|hire|payroll/.test(allCols)) {
    datasetType = 'HR / Employee Data';
    datasetDesc = 'This appears to be human resources or employee management data.';
  } else if (/inventory|stock|sku|warehouse|supplier|purchase/.test(allCols)) {
    datasetType = 'Inventory / Supply Chain Data';
    datasetDesc = 'This appears to be inventory or supply chain management data.';
  }

  // ── Top Performers ────────────────────────────────────
  const topPerformers: { section: string; items: TopPerformer[] }[] = [];
  const underperforming: { section: string; items: TopPerformer[] }[] = [];

  numericStats.forEach(stat => {
    pureCatCols.slice(0, 2).forEach(catCol => {
      const grouped = new Map<string, number>();
      data.forEach(r => {
        const key = String(r[catCol] || 'Unknown');
        const val = typeof r[stat.col] === 'number' ? r[stat.col] : Number(String(r[stat.col]).replace(/[,$]/g, ''));
        if (!isNaN(val)) grouped.set(key, (grouped.get(key) || 0) + val);
      });

      const sorted = Array.from(grouped.entries()).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 1) {
        topPerformers.push({
          section: `Top ${catCol} by ${stat.col}`,
          items: sorted.slice(0, 5).map(([label, value]) => ({ label, value, category: catCol, column: stat.col }))
        });
        underperforming.push({
          section: `Lowest ${catCol} by ${stat.col}`,
          items: sorted.slice(-5).reverse().map(([label, value]) => ({ label, value, category: catCol, column: stat.col }))
        });
      }
    });
  });

  // Also add top categorical frequency
  categoryCounts.slice(0, 1).forEach(({ col, stats }) => {
    if (stats.length > 1) {
      topPerformers.push({
        section: `Most Frequent ${col}`,
        items: stats.slice(0, 5).map(s => ({ label: s.name, value: s.count, category: col, column: 'Count' }))
      });
    }
  });

  // ── Duplicate & Missing Detection ────────────────────
  const uniqueRows = new Set(data.map(r => JSON.stringify(r)));
  const duplicates = data.length - uniqueRows.size;
  let missing = 0;
  data.forEach(r => columns.forEach(c => {
    const v = r[c];
    if (v === null || v === undefined || v === '' || v === '—') missing++;
  }));
  const missingPct = ((missing / (data.length * columns.length)) * 100).toFixed(1);

  // ── Key Insights ──────────────────────────────────────
  const keyInsights: string[] = [];

  if (numericStats.length > 0) {
    const primary = numericStats[0];
    keyInsights.push(`📊 The primary numeric metric "${primary.col}" has a total of ${fmt(primary.sum)}, with an average of ${fmt(primary.avg)} per record.`);

    // Coefficient of variation to detect spread
    const cv = (Math.sqrt((primary.max - primary.min)) / primary.avg) * 100;
    if (primary.max > primary.avg * 3) {
      keyInsights.push(`⚡ High variance detected in "${primary.col}" — the maximum value (${fmt(primary.max)}) is significantly higher than the average (${fmt(primary.avg)}), suggesting a few high-value outliers.`);
    }
  }

  if (topPerformers.length > 0 && topPerformers[0].items.length > 0) {
    const top = topPerformers[0];
    keyInsights.push(`🏆 "${top.items[0].label}" is the top performer in ${top.section} with ${fmt(top.items[0].value)}.`);
  }

  categoryCounts.slice(0, 2).forEach(({ col, stats }) => {
    if (stats.length > 0) {
      const top = stats[0];
      if (top.pct > 30) {
        keyInsights.push(`🎯 "${top.name}" dominates the "${col}" column, accounting for ${top.pct}% of all records — a clear market or category leader.`);
      }
    }
  });

  if (duplicates > 0) {
    keyInsights.push(`⚠️ Data Quality Alert: ${duplicates} duplicate rows detected. This represents ${((duplicates / data.length) * 100).toFixed(1)}% of total records and may skew analysis results.`);
  }

  if (dateCols.length > 0) {
    keyInsights.push(`📅 Temporal data detected in "${dateCols[0]}" column — time-based trend analysis is possible.`);
  }

  if (keyInsights.length === 0) {
    keyInsights.push(`This dataset contains ${data.length.toLocaleString()} records across ${columns.length} columns, ready for analysis.`);
  }

  // ── Patterns ──────────────────────────────────────────
  const patterns: string[] = [];

  categoryCounts.forEach(({ col, stats }) => {
    if (!stats.length) return;
    const top3Pct = stats.slice(0, 3).reduce((a, s) => a + s.pct, 0);
    if (stats.length > 5 && top3Pct > 60) {
      patterns.push(`Concentration in "${col}": The top 3 values (${stats.slice(0, 3).map(s => s.name).join(', ')}) account for ${top3Pct.toFixed(0)}% of all records — the data is highly concentrated.`);
    } else if (stats.length > 3) {
      patterns.push(`"${col}" has ${stats.length} unique values. The most common is "${stats[0].name}" (${stats[0].pct}%), suggesting a ${stats[0].pct > 50 ? 'dominant' : 'leading'} segment.`);
    }
  });

  if (numericStats.length >= 2) {
    patterns.push(`Multiple numeric metrics exist (${numericStats.map(s => s.col).join(', ')}), enabling multi-dimensional analysis across the dataset.`);
  }

  if (!patterns.length) {
    patterns.push('Data distribution appears relatively uniform across available columns.');
  }

  // ── Relationships ─────────────────────────────────────
  const relationships: string[] = [];
  if (numericStats.length > 0 && pureCatCols.length > 0) {
    relationships.push(`"${pureCatCols[0]}" and "${numericStats[0].col}": Grouping records by ${pureCatCols[0]} reveals performance differences. Use the Charts tab to visualize this as a Bar Chart.`);
  }
  if (numericStats.length >= 2) {
    relationships.push(`"${numericStats[0].col}" vs "${numericStats[1].col}": These two numeric columns can be correlated. Use a Scatter Plot in the Charts tab to explore whether higher ${numericStats[0].col} corresponds to higher ${numericStats[1].col}.`);
  }
  if (pureCatCols.length >= 2) {
    relationships.push(`"${pureCatCols[0]}" vs "${pureCatCols[1]}": Two categorical columns can be cross-analyzed using a Stacked Bar Chart to show how one category distributes across the other.`);
  }
  if (!relationships.length) {
    relationships.push('Limited relationship analysis possible with single-column datasets.');
  }

  // ── Anomalies ─────────────────────────────────────────
  const anomalies: string[] = [];
  numericStats.forEach(stat => {
    const iqr = stat.max - stat.min;
    const upperFence = stat.avg + (iqr * 1.5);
    if (stat.max > upperFence) {
      anomalies.push(`Potential outlier in "${stat.col}": Maximum value of ${fmt(stat.max)} is significantly above the average of ${fmt(stat.avg)}, suggesting an extreme data point that may need review.`);
    }
  });
  if (duplicates > data.length * 0.05) {
    anomalies.push(`Elevated duplicate rate: ${((duplicates / data.length) * 100).toFixed(1)}% of rows are duplicates. This level of duplication is unusual and may indicate a data import issue.`);
  }
  if (parseFloat(missingPct) > 10) {
    anomalies.push(`High missing value rate: ${missingPct}% of all data cells are empty. This level of incompleteness may affect analytical accuracy.`);
  }
  if (!anomalies.length) {
    anomalies.push('No significant anomalies detected. The data appears to be within expected ranges.');
  }

  // ── Recommendations ───────────────────────────────────
  const recommendations: string[] = [];
  if (duplicates > 0) {
    recommendations.push(`Remove ${duplicates} duplicate rows using the Cleaning tab to ensure analytical accuracy.`);
  }
  if (missing > 0) {
    recommendations.push(`Address ${missing} missing values — use "Fill Missing Values" in the Cleaning tab to maintain data completeness.`);
  }
  if (topPerformers.length > 0 && topPerformers[0].items.length > 0) {
    const top = topPerformers[0];
    recommendations.push(`Prioritize "${top.items[0].label}" — as the top performer in ${top.section}, focusing resources here can maximize returns.`);
    if (top.items.length > 1) {
      recommendations.push(`Investigate why "${top.items[top.items.length - 1].label}" underperforms in the same category — there may be opportunities to improve its contribution.`);
    }
  }
  if (numericStats.length > 0 && pureCatCols.length > 0) {
    recommendations.push(`Segment analysis: Break down "${numericStats[0].col}" by "${pureCatCols[0]}" to identify which segments are most profitable or active.`);
  }
  if (dateCols.length > 0) {
    recommendations.push(`Trend analysis: Use the date column "${dateCols[0]}" to track performance over time and identify seasonal patterns.`);
  }

  // ── Quick Answers ─────────────────────────────────────
  const quickAnswers: { label: string; value: string }[] = [
    { label: 'Total Records', value: data.length.toLocaleString() },
    { label: 'Total Columns', value: columns.length.toString() },
    { label: 'Data Quality', value: `${(100 - parseFloat(missingPct)).toFixed(0)}%` },
    { label: 'Duplicate Rows', value: duplicates.toString() },
  ];

  if (numericStats.length > 0) {
    quickAnswers.push({ label: `Total ${numericStats[0].col}`, value: fmt(numericStats[0].sum) });
    quickAnswers.push({ label: `Avg ${numericStats[0].col}`, value: fmt(numericStats[0].avg) });
  }

  if (categoryCounts.length > 0 && categoryCounts[0].stats.length > 0) {
    const top = categoryCounts[0].stats[0];
    quickAnswers.push({ label: `Top ${categoryCounts[0].col}`, value: `${top.name} (${top.count} records)` });
  }

  if (topPerformers.length > 0 && topPerformers[0].items.length > 0) {
    const top = topPerformers[0].items[0];
    quickAnswers.push({ label: topPerformers[0].section, value: `${top.label}: ${fmt(top.value)}` });
  }

  // ── Executive Summary ─────────────────────────────────
  const primaryStat = numericStats[0];
  const topCat = categoryCounts[0];
  let summary = `This dataset contains ${data.length.toLocaleString()} records across ${columns.length} columns, classified as ${datasetType}.`;

  if (primaryStat) {
    summary += ` The key financial metric, "${primaryStat.col}", totals ${fmt(primaryStat.sum)} with an average of ${fmt(primaryStat.avg)} per entry.`;
  }

  if (topCat && topCat.stats.length > 0) {
    summary += ` The most dominant category in "${topCat.col}" is "${topCat.stats[0].name}" at ${topCat.stats[0].pct}% of records.`;
  }

  if (topPerformers.length > 0 && topPerformers[0].items.length > 0) {
    const t = topPerformers[0];
    summary += ` The top performer is "${t.items[0].label}" in the ${t.section} ranking.`;
  }

  if (duplicates > 0 || parseFloat(missingPct) > 5) {
    summary += ` Some data quality issues exist (${duplicates} duplicates, ${missingPct}% missing values) that should be addressed before major decisions.`;
  } else {
    summary += ` The data quality is good with minimal issues detected.`;
  }

  summary += ` Overall, this data provides a solid foundation for business decision-making and further analysis.`;

  return {
    keyInsights,
    dataStructure: {
      rows: data.length,
      cols: columns.length,
      numericCols: numericColumns,
      categoricalCols: pureCatCols,
      dateCols,
      datasetType,
      description: datasetDesc
    },
    topPerformers: topPerformers.slice(0, 3),
    underperforming: underperforming.slice(0, 2),
    patterns,
    relationships,
    anomalies,
    recommendations,
    quickAnswers,
    executiveSummary: summary,
    numericStats,
    categoryCounts
  };
}
