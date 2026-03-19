import { DataRow } from '@/context/DataContext';

export interface NormalizationReport {
  totalRows: number;
  trimmedValues: number;
  hiddenCharsRemoved: number;
  typesCorrected: number;
  corruptedRowsRemoved: number;
  emptyRowsRemoved: number;
  duplicateHeadersFixed: number;
  steps: string[];
}

function removeHiddenChars(val: string): string {
  return val
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t+/g, ' ')
    .replace(/\u00A0/g, ' ');
}

function smartParseNumber(val: string): number | null {
  const cleaned = val.replace(/,/g, '').replace(/\s/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === 'N/A' || cleaned === 'n/a' || cleaned === 'null' || cleaned === 'undefined') return null;
  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

function detectAndFixHeaders(data: DataRow[]): { data: DataRow[]; headersFixed: boolean } {
  if (data.length < 2) return { data, headersFixed: false };

  const firstRowKeys = Object.keys(data[0]);
  const hasGenericHeaders = firstRowKeys.every(k =>
    /^(__EMPTY|Column\d+|Field\d+|_\d+|undefined)$/i.test(k)
  );

  if (hasGenericHeaders) {
    const potentialHeaders = Object.values(data[0]);
    const allStrings = potentialHeaders.every(v => typeof v === 'string' && v.trim().length > 0);
    if (allStrings) {
      const newHeaders = potentialHeaders.map(v => String(v).trim());
      const newData = data.slice(1).map(row => {
        const newRow: DataRow = {};
        firstRowKeys.forEach((oldKey, i) => {
          newRow[newHeaders[i] || oldKey] = row[oldKey];
        });
        return newRow;
      });
      return { data: newData, headersFixed: true };
    }
  }

  return { data, headersFixed: false };
}

function fixDuplicateHeaders(data: DataRow[]): { data: DataRow[]; count: number } {
  if (data.length === 0) return { data, count: 0 };
  const keys = Object.keys(data[0]);
  const seen = new Map<string, number>();
  let count = 0;
  const renames = new Map<string, string>();

  keys.forEach(k => {
    const lower = k.toLowerCase().trim();
    const prev = seen.get(lower) || 0;
    if (prev > 0) {
      renames.set(k, `${k}_${prev + 1}`);
      count++;
    }
    seen.set(lower, prev + 1);
  });

  if (count === 0) return { data, count: 0 };

  const fixed = data.map(row => {
    const newRow: DataRow = {};
    Object.entries(row).forEach(([key, val]) => {
      newRow[renames.get(key) || key] = val;
    });
    return newRow;
  });

  return { data: fixed, count };
}

export function normalizeDataset(rawData: DataRow[]): { data: DataRow[]; report: NormalizationReport } {
  const report: NormalizationReport = {
    totalRows: rawData.length,
    trimmedValues: 0,
    hiddenCharsRemoved: 0,
    typesCorrected: 0,
    corruptedRowsRemoved: 0,
    emptyRowsRemoved: 0,
    duplicateHeadersFixed: 0,
    steps: [],
  };

  if (rawData.length === 0) {
    report.steps.push('No data to normalize.');
    return { data: rawData, report };
  }

  let data = [...rawData];

  const headerResult = detectAndFixHeaders(data);
  if (headerResult.headersFixed) {
    data = headerResult.data;
    report.steps.push('Detected and fixed missing/generic headers from first data row.');
  }

  const dupResult = fixDuplicateHeaders(data);
  if (dupResult.count > 0) {
    data = dupResult.data;
    report.duplicateHeadersFixed = dupResult.count;
    report.steps.push(`Renamed ${dupResult.count} duplicate column header(s).`);
  }

  const beforeEmpty = data.length;
  data = data.filter(row => {
    const vals = Object.values(row);
    return vals.some(v => v !== null && v !== undefined && v !== '' && String(v).trim() !== '');
  });
  report.emptyRowsRemoved = beforeEmpty - data.length;
  if (report.emptyRowsRemoved > 0) {
    report.steps.push(`Removed ${report.emptyRowsRemoved} completely empty row(s).`);
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const sampleSize = Math.min(data.length, 200);
  const sample = data.slice(0, sampleSize);

  const columnNumericRatio = new Map<string, number>();
  columns.forEach(col => {
    let numCount = 0;
    let validCount = 0;
    sample.forEach(row => {
      const v = row[col];
      if (v !== null && v !== undefined && v !== '') {
        validCount++;
        const parsed = smartParseNumber(String(v));
        if (parsed !== null) numCount++;
      }
    });
    columnNumericRatio.set(col, validCount > 0 ? numCount / validCount : 0);
  });

  data = data.map(row => {
    const cleaned: DataRow = {};
    columns.forEach(col => {
      let val = row[col];

      if (typeof val === 'string') {
        const before = val;
        val = val.trim();
        if (val !== before) report.trimmedValues++;

        const beforeHidden = val;
        val = removeHiddenChars(val);
        if (val !== beforeHidden) report.hiddenCharsRemoved++;

        const ratio = columnNumericRatio.get(col) || 0;
        if (ratio > 0.8) {
          const parsed = smartParseNumber(val);
          if (parsed !== null) {
            val = parsed as any;
            report.typesCorrected++;
          }
        }
      }

      cleaned[col] = val;
    });
    return cleaned;
  });

  if (report.trimmedValues > 0) report.steps.push(`Trimmed whitespace from ${report.trimmedValues} value(s).`);
  if (report.hiddenCharsRemoved > 0) report.steps.push(`Removed hidden characters from ${report.hiddenCharsRemoved} value(s).`);
  if (report.typesCorrected > 0) report.steps.push(`Auto-converted ${report.typesCorrected} string value(s) to numbers.`);

  const beforeCorrupt = data.length;
  data = data.filter(row => {
    const vals = Object.values(row);
    const filledCount = vals.filter(v => v !== null && v !== undefined && v !== '').length;
    return filledCount >= Math.max(1, columns.length * 0.2);
  });
  report.corruptedRowsRemoved = beforeCorrupt - data.length;
  if (report.corruptedRowsRemoved > 0) {
    report.steps.push(`Removed ${report.corruptedRowsRemoved} corrupted row(s) with >80% missing values.`);
  }

  if (report.steps.length === 0) {
    report.steps.push('Dataset is clean — no normalization needed.');
  }

  return { data, report };
}

export function fuzzyGroupValues(data: DataRow[], column: string): Map<string, string> {
  const valueCounts = new Map<string, number>();
  data.forEach(row => {
    const v = String(row[column] || '').trim();
    if (v) valueCounts.set(v, (valueCounts.get(v) || 0) + 1);
  });

  const canonical = new Map<string, string>();
  const sorted = Array.from(valueCounts.entries()).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([val]) => {
    const lower = val.toLowerCase().trim();
    let matched = false;
    for (const [existing] of sorted) {
      if (existing === val) break;
      if (existing.toLowerCase().trim() === lower) {
        canonical.set(val, existing);
        matched = true;
        break;
      }
    }
    if (!matched) canonical.set(val, val);
  });

  return canonical;
}

export function applyCaseNormalization(data: DataRow[], column: string): DataRow[] {
  const mapping = fuzzyGroupValues(data, column);
  return data.map(row => {
    const v = String(row[column] || '').trim();
    const mapped = mapping.get(v);
    if (mapped && mapped !== v) {
      return { ...row, [column]: mapped };
    }
    return row;
  });
}
