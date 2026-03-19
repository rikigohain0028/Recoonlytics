export interface DataRow {
  [key: string]: any;
}

type StatusCallback = (status: string) => void;

// ── Text extraction via pdfjs-dist ────────────────────────────────────────
async function extractTextFromPDF(
  file: File,
  onStatus: StatusCallback
): Promise<{ text: string; pageCount: number }> {
  onStatus('Loading PDF engine...');

  const pdfjsLib = await import('pdfjs-dist');

  // Use the local worker bundled with pdfjs-dist (Vite handles this)
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).href;

  onStatus('Reading PDF structure...');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  onStatus(`Analyzing ${pageCount} page${pageCount > 1 ? 's' : ''}...`);

  let fullText = '';

  for (let i = 1; i <= pageCount; i++) {
    onStatus(`Extracting page ${i} of ${pageCount}...`);
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // Extract items preserving spatial positions for better line reconstruction
      const items = textContent.items as Array<{ str: string; transform: number[] }>;

      // Sort items by Y position (descending) then X position (ascending)
      const sorted = [...items].sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 3) return yDiff;
        return a.transform[4] - b.transform[4];
      });

      // Group items into lines based on Y coordinate proximity
      const lines: string[] = [];
      let currentLine: string[] = [];
      let lastY: number | null = null;

      sorted.forEach(item => {
        const y = item.transform[5];
        if (lastY === null || Math.abs(y - lastY) < 5) {
          currentLine.push(item.str);
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine.join(' ').trim());
          }
          currentLine = [item.str];
        }
        lastY = y;
      });

      if (currentLine.length > 0) {
        lines.push(currentLine.join(' ').trim());
      }

      fullText += lines.filter(l => l.length > 0).join('\n') + '\n---PAGE---\n';
    } catch (e) {
      console.warn(`Could not extract page ${i}:`, e);
    }
  }

  return { text: fullText.trim(), pageCount };
}

// ── Text cleaning ─────────────────────────────────────────────────────────
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]{3,}/g, '  ')          // Collapse 3+ spaces to 2
    .replace(/\n{3,}/g, '\n\n')           // Collapse 3+ newlines
    .trim();
}

// ── Currency / number detection ───────────────────────────────────────────
function detectCurrency(val: string): number | null {
  const cleaned = val.replace(/[,$£€₹\s]/g, '').replace(/\((.+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ── Date detection ────────────────────────────────────────────────────────
function detectDate(val: string): boolean {
  return /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(val) ||
    /\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(val) ||
    /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4}/i.test(val);
}

// ── Smart bank statement parser ───────────────────────────────────────────
function parseBankStatement(lines: string[]): DataRow[] {
  const rows: DataRow[] = [];

  for (const line of lines) {
    if (!line.trim() || line === '---PAGE---') continue;

    // Look for lines that contain a date followed by values
    const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
    if (!dateMatch) continue;

    const date = dateMatch[1];
    const rest = line.replace(date, '').trim();

    // Extract all numeric values from the rest of the line
    const numbers = rest.match(/[-]?[\d,]+\.?\d*/g) || [];
    const numericVals = numbers.map(n => parseFloat(n.replace(/,/g, ''))).filter(n => !isNaN(n));

    // Non-numeric parts are the description
    const description = rest.replace(/[-]?[\d,]+\.?\d*/g, '').replace(/\s+/g, ' ').trim();

    if (description.length < 2 && numericVals.length === 0) continue;

    const row: DataRow = { Date: date, Description: description };

    if (numericVals.length === 1) {
      row['Amount'] = numericVals[0];
    } else if (numericVals.length === 2) {
      row['Amount'] = numericVals[0];
      row['Balance'] = numericVals[1];
    } else if (numericVals.length >= 3) {
      row['Debit'] = numericVals[0] || '';
      row['Credit'] = numericVals[1] || '';
      row['Balance'] = numericVals[2];
    }

    rows.push(row);
  }

  return rows;
}

// ── Generic table detection ───────────────────────────────────────────────
function detectGenericTable(lines: string[]): DataRow[] {
  // Find the most common separator pattern
  const usableLines = lines.filter(l => l.trim() && l !== '---PAGE---');
  if (usableLines.length < 2) return [];

  // Try to find a consistent column structure by looking at spacing patterns
  // Score each line by how many double-space separators it has
  const separatorCounts = usableLines.map(l => (l.match(/\s{2,}/g) || []).length);
  const medianSeps = separatorCounts.sort((a, b) => a - b)[Math.floor(separatorCounts.length / 2)];

  if (medianSeps < 1) {
    // Fall back to comma or pipe delimited
    return parseDelimited(usableLines);
  }

  // Try header row detection — first content row (skip short lines)
  const headerIdx = usableLines.findIndex(l => l.trim().length > 10 && (l.match(/\s{2,}/g) || []).length >= Math.max(1, medianSeps - 1));
  if (headerIdx === -1) return parseDelimited(usableLines);

  const headerParts = usableLines[headerIdx].split(/\s{2,}/).map(h => h.trim()).filter(Boolean);
  if (headerParts.length < 2) return parseDelimited(usableLines);

  const headers = headerParts.map((h, i) =>
    h.replace(/[^\w\s]/g, '').trim() || `Column_${i + 1}`
  );

  const rows: DataRow[] = [];
  for (let i = headerIdx + 1; i < usableLines.length; i++) {
    const line = usableLines[i];
    if (!line.trim()) continue;

    const vals = line.split(/\s{2,}/).map(v => v.trim());
    if (vals.length === 0 || (vals.length === 1 && vals[0].length < 2)) continue;

    const row: DataRow = {};
    headers.forEach((h, idx) => {
      let val: any = vals[idx] || '';
      const num = detectCurrency(val);
      if (num !== null && val.match(/[\d,\.]/)) val = num;
      row[h] = val;
    });
    rows.push(row);
  }

  return rows.filter(r => Object.values(r).some(v => v !== ''));
}

// ── CSV/pipe/comma delimiter fallback ────────────────────────────────────
function parseDelimited(lines: string[]): DataRow[] {
  if (lines.length < 2) return [];

  const sep = lines[0].includes(',') ? ',' : lines[0].includes('|') ? '|' : '\t';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/['"]/g, ''));
  if (headers.length < 2) return [];

  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/['"]/g, ''));
    const row: DataRow = {};
    headers.forEach((h, i) => {
      const val = vals[i] || '';
      const num = detectCurrency(val);
      row[h] = (num !== null && /^[-\d,\.\s$£€₹()]+$/.test(val)) ? num : val;
    });
    return row;
  }).filter(r => Object.values(r).some(v => v !== ''));
}

// ── Main exported processor ───────────────────────────────────────────────
export async function processPDFToData(
  file: File,
  onStatus?: StatusCallback
): Promise<DataRow[]> {
  const status = onStatus || (() => {});

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('PDF file is too large. Maximum size is 10MB.');
  }

  let text = '';
  let pageCount = 1;

  try {
    status('Analyzing PDF structure...');
    const result = await extractTextFromPDF(file, status);
    text = result.text;
    pageCount = result.pageCount;
  } catch (e: any) {
    throw new Error('Failed to read PDF. The file may be corrupted or password-protected.');
  }

  if (!text || text.replace(/---PAGE---/g, '').trim().length < 20) {
    throw new Error('No readable text found in this PDF. Scanned image-only PDFs are not supported in the browser.');
  }

  status('Cleaning and structuring data...');
  const cleaned = cleanText(text);
  const lines = cleaned.split('\n');

  // Check if it looks like a bank statement
  const hasBankKeywords = /balance|debit|credit|transaction|statement|account/i.test(cleaned.slice(0, 500));
  const hasDateLines = lines.filter(l => detectDate(l)).length > lines.length * 0.2;

  let rows: DataRow[] = [];

  if (hasBankKeywords || hasDateLines) {
    status('Detecting financial statement format...');
    rows = parseBankStatement(lines);
  }

  if (rows.length < 3) {
    status('Trying generic table extraction...');
    rows = detectGenericTable(lines);
  }

  if (rows.length < 2) {
    status('Trying delimiter-based extraction...');
    rows = parseDelimited(lines.filter(l => l !== '---PAGE---'));
  }

  if (rows.length === 0) {
    // Last resort: create a simple text dump as data
    status('Building text-based structure...');
    const textLines = lines.filter(l => l.trim() && l !== '---PAGE---' && l.length > 5);
    rows = textLines.slice(0, 500).map((line, i) => ({
      Row: i + 1,
      Content: line.trim()
    }));

    if (rows.length === 0) {
      throw new Error('Unable to extract structured data from this PDF. The document may not contain a table or structured content.');
    }
  }

  status(`Extracted ${rows.length} rows from ${pageCount} page${pageCount > 1 ? 's' : ''}.`);
  return rows;
}
