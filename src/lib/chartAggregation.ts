import { DataRow } from '@/context/DataContext';

export type AggregationType = 'count' | 'sum' | 'average' | 'max' | 'min';

export interface AggregatedData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface StackedAggregatedData {
  name: string;
  [key: string]: string | number;
}

export function isNumericColumn(data: DataRow[], column: string): boolean {
  if (data.length === 0) return false;
  const sample = data.slice(0, 100);
  let numericCount = 0;
  let validCount = 0;

  sample.forEach(row => {
    const val = row[column];
    if (val !== null && val !== undefined && val !== '') {
      validCount++;
      if (typeof val === 'number' || !isNaN(Number(val))) {
        numericCount++;
      }
    }
  });

  return validCount > 0 && (numericCount / validCount) > 0.8;
}

export function suggestAggregation(xIsNumeric: boolean, yIsNumeric: boolean): AggregationType {
  if (yIsNumeric) return 'sum';
  return 'count';
}

export function aggregateData(
  data: DataRow[],
  xAxis: string,
  yAxis: string,
  aggregation: AggregationType,
  numericColumns: string[]
): AggregatedData[] {
  
  if (data.length === 0) return [];

  const yIsNumeric = numericColumns.includes(yAxis);

  const groups = new Map<string, any[]>();
  data.forEach(row => {
    const key = String(row[xAxis] || 'Unknown');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  const result: AggregatedData[] = [];

  groups.forEach((rows, name) => {
    let value = 0;

    switch (aggregation) {
      case 'count':
        value = rows.length;
        break;

      case 'sum': {
        if (yIsNumeric) {
          value = rows.reduce((sum, r) => {
            const v = Number(r[yAxis]);
            return sum + (isNaN(v) ? 0 : v);
          }, 0);
        } else {
          value = rows.length;
        }
        break;
      }

      case 'average': {
        if (yIsNumeric) {
          const values = rows
            .map(r => Number(r[yAxis]))
            .filter(v => !isNaN(v));
          value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        } else {
          value = rows.length;
        }
        break;
      }

      case 'max': {
        if (yIsNumeric) {
          const values = rows
            .map(r => Number(r[yAxis]))
            .filter(v => !isNaN(v));
          value = values.length > 0 ? Math.max(...values) : 0;
        } else {
          value = rows.length;
        }
        break;
      }

      case 'min': {
        if (yIsNumeric) {
          const values = rows
            .map(r => Number(r[yAxis]))
            .filter(v => !isNaN(v));
          value = values.length > 0 ? Math.min(...values) : 0;
        } else {
          value = rows.length;
        }
        break;
      }
    }

    result.push({ name, value });
  });

  return result
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}

export function aggregateStackedData(
  data: DataRow[],
  xAxis: string,
  yAxis: string,
  aggregation: AggregationType,
  numericColumns: string[]
): StackedAggregatedData[] {
  
  if (data.length === 0) return [];

  const yIsNumeric = numericColumns.includes(yAxis);

  // Group by X-axis
  const xGroups = new Map<string, any[]>();
  data.forEach(row => {
    const key = String(row[xAxis] || 'Unknown');
    if (!xGroups.has(key)) {
      xGroups.set(key, []);
    }
    xGroups.get(key)!.push(row);
  });

  // For each X group, collect Y categories
  const categoryMap = new Map<string, Map<string, number>>();
  const allCategories = new Set<string>();

  xGroups.forEach((rows, xName) => {
    const yCategoryMap = new Map<string, number>();
    
    rows.forEach(row => {
      const yVal = String(row[yAxis] || 'Unknown');
      allCategories.add(yVal);

      let count = 1;
      if (yIsNumeric) {
        count = Number(row[yAxis]) || 0;
      }

      switch (aggregation) {
        case 'count':
          yCategoryMap.set(yVal, (yCategoryMap.get(yVal) || 0) + 1);
          break;
        case 'sum':
          yCategoryMap.set(yVal, (yCategoryMap.get(yVal) || 0) + count);
          break;
        case 'average':
          yCategoryMap.set(yVal, (yCategoryMap.get(yVal) || 0) + count);
          break;
        case 'max':
          yCategoryMap.set(yVal, Math.max(yCategoryMap.get(yVal) || 0, count));
          break;
        case 'min':
          yCategoryMap.set(yVal, Math.min(yCategoryMap.get(yVal) || Infinity, count));
          break;
      }
    });

    categoryMap.set(xName, yCategoryMap);
  });

  // Limit to top 10 categories, rest as "Other"
  const topCategories = Array.from(allCategories)
    .sort((a, b) => {
      const aTotal = Array.from(categoryMap.values()).reduce((sum, m) => sum + (m.get(a) || 0), 0);
      const bTotal = Array.from(categoryMap.values()).reduce((sum, m) => sum + (m.get(b) || 0), 0);
      return bTotal - aTotal;
    })
    .slice(0, 10);

  const hasOther = allCategories.size > 10;
  if (hasOther) {
    topCategories.push('Other');
  }

  // Build result array
  const result: StackedAggregatedData[] = [];

  xGroups.forEach((_, xName) => {
    const row: StackedAggregatedData = { name: xName };
    const yCategoryMap = categoryMap.get(xName) || new Map();

    topCategories.forEach(category => {
      if (category === 'Other') {
        let otherCount = 0;
        allCategories.forEach(cat => {
          if (!topCategories.slice(0, -1).includes(cat)) {
            otherCount += yCategoryMap.get(cat) || 0;
          }
        });
        row[category] = otherCount;
      } else {
        row[category] = yCategoryMap.get(category) || 0;
      }
    });

    result.push(row);
  });

  // Sort X-axis by total value
  return result.sort((a, b) => {
    const aTotal = topCategories.reduce((sum, cat) => sum + Number(a[cat] || 0), 0);
    const bTotal = topCategories.reduce((sum, cat) => sum + Number(b[cat] || 0), 0);
    return bTotal - aTotal;
  }).slice(0, 20);
}

export function getChartTypeForColumns(
  xIsNumeric: boolean,
  yIsNumeric: boolean,
  numColumns: number
): 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'stacked' {
  
  if (xIsNumeric && yIsNumeric) return 'scatter';
  if (!xIsNumeric && yIsNumeric) return 'bar';
  if (xIsNumeric && !yIsNumeric) return 'bar';
  if (!xIsNumeric && !yIsNumeric) return 'stacked';
  
  return 'bar';
}
