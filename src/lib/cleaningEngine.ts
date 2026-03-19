import { DataRow } from '@/context/DataContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CleaningReport {
  missingFixed: number;
  duplicatesRemoved: number;
  datesStandardized: number;
  numbersFixed: number;
  textStandardized: number;
  spaceTrimmed: number;
  emptyRowsRemoved: number;
  specialCharsRemoved: number;
  columnsDetected: { date: string[]; numeric: string[]; text: string[] };
}

export interface CleaningOptions {
  removeDuplicates: boolean;
  standardizeText: boolean;
  fixDateFormats: boolean;
  fillMissingValues: boolean;
  removeEmptyRows: boolean;
  convertNumbers: boolean;
  trimSpaces: boolean;
  removeSpecialChars: boolean;
  missingFillMethod: 'dash' | 'zero' | 'average' | 'forward' | 'backward';
}

export interface CleaningResult {
  data: DataRow[];
  report: CleaningReport;
}

export const DEFAULT_CLEANING_OPTIONS: CleaningOptions = {
  removeDuplicates: true,
  standardizeText: true,
  fixDateFormats: true,
  fillMissingValues: true,
  removeEmptyRows: true,
  convertNumbers: true,
  trimSpaces: true,
  removeSpecialChars: false,
  missingFillMethod: 'dash',
};

// ─── Missing Value Detection ───────────────────────────────────────────────────

const MISSING_PATTERNS = new Set([
  '', 'null', 'Null', 'NULL',
  'nan', 'NaN', 'NAN',
  'n/a', 'N/A', 'NA', 'n.a.', 'N.A.',
  'none', 'None', 'NONE',
  '#n/a', '#N/A', '#NULL!', '#REF!',
  'undefined', 'UNDEFINED',
  '-', '—', 'na', 'No Data', 'no data',
]);

export function isMissingValue(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'number' && isNaN(val)) return true;
  const s = String(val).trim();
  return MISSING_PATTERNS.has(s) || s === '';
}

// ─── Date Parsing & Formatting ────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  january: 0, february: 1, march: 2, april: 3, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isValidYear(y: number): boolean {
  return y >= 1900 && y <= 2100;
}

function formatDateProfessional(date: Date): string {
  const d = date.getDate();
  const m = MONTH_SHORT[date.getMonth()];
  const y = date.getFullYear();
  return `${d} ${m} ${y}`;
}

export function tryParseDate(val: string): Date | null {
  const s = val.trim();
  if (!s) return null;

  // Already in "D Mon YYYY" format
  const dMonY = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dMonY) {
    const day = parseInt(dMonY[1]);
    const month = MONTH_NAMES[dMonY[2].toLowerCase()];
    const year = parseInt(dMonY[3]);
    if (month !== undefined && isValidYear(year) && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // "Mon D YYYY" or "Mon D, YYYY"
  const monDY = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monDY) {
    const month = MONTH_NAMES[monDY[1].toLowerCase()];
    const day = parseInt(monDY[2]);
    const year = parseInt(monDY[3]);
    if (month !== undefined && isValidYear(year) && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // ISO YYYY-MM-DD or YYYY/MM/DD
  const isoDate = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoDate) {
    const year = parseInt(isoDate[1]);
    const month = parseInt(isoDate[2]) - 1;
    const day = parseInt(isoDate[3]);
    if (isValidYear(year) && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // DD/MM/YYYY or MM/DD/YYYY — try DD/MM/YYYY first
  const slashDate = s.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
  if (slashDate) {
    const a = parseInt(slashDate[1]);
    const b = parseInt(slashDate[2]);
    const year = parseInt(slashDate[3]);
    if (isValidYear(year)) {
      // Prefer DD/MM/YYYY if a > 12 (must be day)
      if (a > 12 && b <= 12) {
        return new Date(year, b - 1, a);
      }
      // Otherwise default to MM/DD/YYYY
      if (a <= 12 && b <= 31) {
        return new Date(year, a - 1, b);
      }
    }
  }

  // ISO with time: YYYY-MM-DDTHH:MM
  const isoFull = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoFull) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: native Date parse only for strings with letters (month names)
  if (/[A-Za-z]/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime()) && isValidYear(d.getFullYear())) return d;
  }

  return null;
}

const DATE_COLUMN_PATTERN = /date|time|created|modified|updated|purchase|order|dob|birth|join|start|end|due|expir|timestamp/i;

export function detectColumnTypes(data: DataRow[], columns: string[]): { date: string[]; numeric: string[]; text: string[] } {
  const sampleSize = Math.min(data.length, 50);
  const sample = data.slice(0, sampleSize);

  const dateColumns: string[] = [];
  const numericColumns: string[] = [];
  const textColumns: string[] = [];

  columns.forEach(col => {
    const nameHint = DATE_COLUMN_PATTERN.test(col);
    let dateMatches = 0;
    let numericMatches = 0;
    let total = 0;

    sample.forEach(row => {
      const val = row[col];
      if (isMissingValue(val)) return;
      total++;
      const s = String(val).trim();

      if (typeof val === 'number') {
        numericMatches++;
      } else {
        const cleaned = s.replace(/[,$₹€£¥%\s]/g, '');
        if (cleaned !== '' && !isNaN(Number(cleaned))) {
          numericMatches++;
        } else if (nameHint || tryParseDate(s) !== null) {
          dateMatches++;
        }
      }
    });

    if (total === 0) { textColumns.push(col); return; }

    const numRatio = numericMatches / total;
    const dateRatio = dateMatches / total;

    if (numRatio >= 0.8) numericColumns.push(col);
    else if (dateRatio >= 0.5 || nameHint) dateColumns.push(col);
    else textColumns.push(col);
  });

  return { date: dateColumns, numeric: numericColumns, text: textColumns };
}

// ─── Individual Cleaning Functions ────────────────────────────────────────────

export function normalizeMissing(data: DataRow[], columns: string[], replacement: string = '-'): { data: DataRow[]; count: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      if (isMissingValue(newRow[col])) {
        newRow[col] = replacement;
        count++;
      }
    });
    return newRow;
  });
  return { data: result, count };
}

export function removeDuplicateRows(data: DataRow[]): { data: DataRow[]; count: number } {
  const seen = new Set<string>();
  const result: DataRow[] = [];
  data.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(row);
    }
  });
  return { data: result, count: data.length - result.length };
}

export function removeEmptyRows(data: DataRow[], columns: string[]): { data: DataRow[]; count: number } {
  const before = data.length;
  const result = data.filter(row =>
    columns.some(col => !isMissingValue(row[col]))
  );
  return { data: result, count: before - result.length };
}

export function standardizeTextColumns(data: DataRow[], textCols: string[]): { data: DataRow[]; count: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    textCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string' && !isMissingValue(val)) {
        const original = val;
        // Title case with proper space normalization
        const titled = val
          .trim()
          .replace(/\s+/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        if (titled !== original) {
          newRow[col] = titled;
          count++;
        }
      }
    });
    return newRow;
  });
  return { data: result, count };
}

export function trimSpacesInData(data: DataRow[], columns: string[]): { data: DataRow[]; count: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string') {
        const trimmed = val.trim().replace(/\s+/g, ' ');
        if (trimmed !== val) {
          newRow[col] = trimmed;
          count++;
        }
      }
    });
    return newRow;
  });
  return { data: result, count };
}

export function fixDateColumns(data: DataRow[], dateCols: string[]): { data: DataRow[]; count: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    dateCols.forEach(col => {
      const val = newRow[col];
      if (val && !isMissingValue(val)) {
        const parsed = tryParseDate(String(val));
        if (parsed) {
          const formatted = formatDateProfessional(parsed);
          if (formatted !== String(val).trim()) {
            newRow[col] = formatted;
            count++;
          }
        }
      }
    });
    return newRow;
  });
  return { data: result, count };
}

const CURRENCY_RE = /[₹$€£¥%,\s]/g;
const NON_NUMERIC_RE = /[^\d.\-]/g;

export function cleanNumericColumns(data: DataRow[], numericCols: string[]): { data: DataRow[]; count: number } {
  let count = 0;
  const result = data.map(row => {
    const newRow = { ...row };
    numericCols.forEach(col => {
      const val = newRow[col];
      if (isMissingValue(val)) return;
      if (typeof val === 'number') return;
      const s = String(val).trim();
      const cleaned = s.replace(CURRENCY_RE, '').replace(NON_NUMERIC_RE, '');
      const n = parseFloat(cleaned);
      if (!isNaN(n)) {
        newRow[col] = n;
        count++;
      } else {
        newRow[col] = '-';
        count++;
      }
    });
    return newRow;
  });
  return { data: result, count };
}

export function removeSpecialCharsFromText(data: DataRow[], textCols: string[]): { data: DataRow[]; count: number } {
  let count = 0;
  const SPECIAL_RE = /[^a-zA-Z0-9\s.,\-_'"/()]/g;
  const result = data.map(row => {
    const newRow = { ...row };
    textCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string' && !isMissingValue(val)) {
        const cleaned = val.replace(SPECIAL_RE, '').trim();
        if (cleaned !== val) {
          newRow[col] = cleaned;
          count++;
        }
      }
    });
    return newRow;
  });
  return { data: result, count };
}

export function applyForwardFill(data: DataRow[], columns: string[]): number {
  let count = 0;
  const lastSeen: Record<string, any> = {};
  data.forEach(row => {
    columns.forEach(col => {
      if (isMissingValue(row[col])) {
        if (lastSeen[col] !== undefined) {
          row[col] = lastSeen[col];
          count++;
        }
      } else {
        lastSeen[col] = row[col];
      }
    });
  });
  return count;
}

export function applyBackwardFill(data: DataRow[], columns: string[]): number {
  let count = 0;
  const nextSeen: Record<string, any> = {};
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    columns.forEach(col => {
      if (isMissingValue(row[col])) {
        if (nextSeen[col] !== undefined) {
          row[col] = nextSeen[col];
          count++;
        }
      } else {
        nextSeen[col] = row[col];
      }
    });
  }
  return count;
}

export function applyColumnAverage(data: DataRow[], columns: string[]): number {
  let count = 0;
  columns.forEach(col => {
    const nums: number[] = [];
    data.forEach(row => {
      const v = row[col];
      if (!isMissingValue(v) && typeof v === 'number') nums.push(v);
    });
    if (nums.length > 0) {
      const avg = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
      data.forEach(row => {
        if (isMissingValue(row[col])) {
          row[col] = avg;
          count++;
        }
      });
    }
  });
  return count;
}

// ─── Column-Level Action ──────────────────────────────────────────────────────

export type ColumnAction = 'toNumber' | 'toText' | 'toDate' | 'replaceMissing' | 'standardizeText' | 'removeDuplicateValues' | 'sortAsc' | 'sortDesc';

export function applyColumnAction(data: DataRow[], col: string, action: ColumnAction): { data: DataRow[]; message: string } {
  let result = data.map(r => ({ ...r }));
  let message = '';

  switch (action) {
    case 'toNumber': {
      let c = 0;
      result.forEach(row => {
        const val = row[col];
        if (isMissingValue(val)) return;
        const s = String(val).replace(CURRENCY_RE, '').replace(NON_NUMERIC_RE, '');
        const n = parseFloat(s);
        if (!isNaN(n)) { row[col] = n; c++; }
        else { row[col] = '-'; }
      });
      message = `Converted ${c} values to numbers.`;
      break;
    }
    case 'toText': {
      result.forEach(row => {
        if (!isMissingValue(row[col])) row[col] = String(row[col]);
      });
      message = 'Converted column to text.';
      break;
    }
    case 'toDate': {
      let c = 0;
      result.forEach(row => {
        const val = row[col];
        if (isMissingValue(val)) return;
        const d = tryParseDate(String(val));
        if (d) { row[col] = formatDateProfessional(d); c++; }
      });
      message = `Standardized ${c} dates.`;
      break;
    }
    case 'replaceMissing': {
      let c = 0;
      result.forEach(row => {
        if (isMissingValue(row[col])) { row[col] = '-'; c++; }
      });
      message = `Replaced ${c} missing values with "-".`;
      break;
    }
    case 'standardizeText': {
      let c = 0;
      result.forEach(row => {
        const val = row[col];
        if (typeof val === 'string' && !isMissingValue(val)) {
          row[col] = val.trim().replace(/\s+/g, ' ').split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
          c++;
        }
      });
      message = `Standardized text in ${c} cells.`;
      break;
    }
    case 'sortAsc':
      result.sort((a, b) => {
        const av = a[col]; const bv = b[col];
        if (typeof av === 'number' && typeof bv === 'number') return av - bv;
        return String(av ?? '').localeCompare(String(bv ?? ''));
      });
      message = `Sorted column ascending.`;
      break;
    case 'sortDesc':
      result.sort((a, b) => {
        const av = a[col]; const bv = b[col];
        if (typeof av === 'number' && typeof bv === 'number') return bv - av;
        return String(bv ?? '').localeCompare(String(av ?? ''));
      });
      message = `Sorted column descending.`;
      break;
    default:
      message = 'Action applied.';
  }

  return { data: result, message };
}

// ─── Custom Command Parser ────────────────────────────────────────────────────

export interface CommandResult {
  data: DataRow[];
  message: string;
  success: boolean;
}

export function parseAndApplyCommand(data: DataRow[], columns: string[], command: string): CommandResult {
  const cmd = command.trim().toLowerCase();
  const colNames = columns.map(c => c.toLowerCase());

  const findColumn = (text: string): string | null => {
    for (const col of columns) {
      if (text.includes(col.toLowerCase())) return col;
    }
    return null;
  };

  // "Remove rows where [column] is empty/missing"
  if (cmd.includes('remove rows where') || cmd.includes('delete rows where')) {
    const col = findColumn(cmd);
    if (!col) return { data, message: 'Column not found in command.', success: false };
    if (cmd.includes('empty') || cmd.includes('missing') || cmd.includes('null')) {
      const before = data.length;
      const result = data.filter(row => !isMissingValue(row[col]));
      return { data: result, message: `Removed ${before - result.length} rows where "${col}" is empty.`, success: true };
    }
  }

  // "Standardize [column] column"
  if (cmd.includes('standardize') || cmd.includes('title case')) {
    const col = findColumn(cmd) || (cmd.includes('all') ? null : null);
    const targetCols = col ? [col] : columns;
    const { data: result, count } = standardizeTextColumns(data, targetCols);
    return { data: result, message: `Standardized text in ${count} cells.`, success: true };
  }

  // "Fill missing [column]" or "Fill missing in [column]"
  if (cmd.includes('fill missing') || cmd.includes('replace missing')) {
    const col = findColumn(cmd);
    const targetCols = col ? [col] : columns;
    const { data: result, count } = normalizeMissing(data, targetCols);
    return { data: result, message: `Filled ${count} missing values.`, success: true };
  }

  // "Convert [column] to number"
  if (cmd.includes('convert') && cmd.includes('number')) {
    const col = findColumn(cmd);
    if (!col) return { data, message: 'Specify a column name.', success: false };
    const { data: result, message } = applyColumnAction(data, col, 'toNumber');
    return { data: result, message, success: true };
  }

  // "Convert [column] to date"
  if (cmd.includes('convert') && cmd.includes('date')) {
    const col = findColumn(cmd);
    if (!col) return { data, message: 'Specify a column name.', success: false };
    const { data: result, message } = applyColumnAction(data, col, 'toDate');
    return { data: result, message, success: true };
  }

  // "Remove duplicates"
  if (cmd.includes('remove duplicates') || cmd.includes('delete duplicates')) {
    const { data: result, count } = removeDuplicateRows(data);
    return { data: result, message: `Removed ${count} duplicate rows.`, success: true };
  }

  // "Trim spaces"
  if (cmd.includes('trim') || cmd.includes('trim spaces')) {
    const { data: result, count } = trimSpacesInData(data, columns);
    return { data: result, message: `Trimmed spaces in ${count} cells.`, success: true };
  }

  // "Fix dates"
  if (cmd.includes('fix date') || cmd.includes('standardize date')) {
    const { date: dateCols } = detectColumnTypes(data, columns);
    const { data: result, count } = fixDateColumns(data, dateCols);
    return { data: result, message: `Standardized ${count} date values.`, success: true };
  }

  return {
    data,
    message: `Unknown command. Try: "Remove rows where [column] is empty", "Standardize [column]", "Fill missing [column]", "Convert [column] to number/date", "Remove duplicates".`,
    success: false,
  };
}

// ─── Main Cleaning Pipeline ───────────────────────────────────────────────────

export function runCleaningPipeline(data: DataRow[], columns: string[], options: CleaningOptions): CleaningResult {
  let working = data.map(r => ({ ...r }));
  const report: CleaningReport = {
    missingFixed: 0,
    duplicatesRemoved: 0,
    datesStandardized: 0,
    numbersFixed: 0,
    textStandardized: 0,
    spaceTrimmed: 0,
    emptyRowsRemoved: 0,
    specialCharsRemoved: 0,
    columnsDetected: { date: [], numeric: [], text: [] },
  };

  // Step 1: Detect column types
  const detected = detectColumnTypes(working, columns);
  report.columnsDetected = detected;

  // Step 2: Remove empty rows first
  if (options.removeEmptyRows) {
    const res = removeEmptyRows(working, columns);
    working = res.data;
    report.emptyRowsRemoved = res.count;
  }

  // Step 3: Trim spaces
  if (options.trimSpaces) {
    const res = trimSpacesInData(working, columns);
    working = res.data;
    report.spaceTrimmed = res.count;
  }

  // Step 4: Convert numbers
  if (options.convertNumbers && detected.numeric.length > 0) {
    const res = cleanNumericColumns(working, detected.numeric);
    working = res.data;
    report.numbersFixed = res.count;
  }

  // Step 5: Fix date columns
  if (options.fixDateFormats && detected.date.length > 0) {
    const res = fixDateColumns(working, detected.date);
    working = res.data;
    report.datesStandardized = res.count;
  }

  // Step 6: Standardize text
  if (options.standardizeText && detected.text.length > 0) {
    const res = standardizeTextColumns(working, detected.text);
    working = res.data;
    report.textStandardized = res.count;
  }

  // Step 7: Remove special chars
  if (options.removeSpecialChars && detected.text.length > 0) {
    const res = removeSpecialCharsFromText(working, detected.text);
    working = res.data;
    report.specialCharsRemoved = res.count;
  }

  // Step 8: Fill missing values
  if (options.fillMissingValues) {
    switch (options.missingFillMethod) {
      case 'dash': {
        const res = normalizeMissing(working, columns, '-');
        working = res.data;
        report.missingFixed = res.count;
        break;
      }
      case 'zero': {
        const res = normalizeMissing(working, columns, '0');
        working = res.data;
        report.missingFixed = res.count;
        break;
      }
      case 'average': {
        report.missingFixed = applyColumnAverage(working, detected.numeric);
        const res = normalizeMissing(working, columns, '-');
        working = res.data;
        report.missingFixed += res.count;
        break;
      }
      case 'forward': {
        report.missingFixed = applyForwardFill(working, columns);
        break;
      }
      case 'backward': {
        report.missingFixed = applyBackwardFill(working, columns);
        break;
      }
    }
  }

  // Step 9: Remove duplicates (last, after cleaning)
  if (options.removeDuplicates) {
    const res = removeDuplicateRows(working);
    working = res.data;
    report.duplicatesRemoved = res.count;
  }

  return { data: working, report };
}
