export interface DataRow {
  [key: string]: any;
}

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export interface JoinDiagnostics {
  totalA: number;
  totalB: number;
  matchCount: number;
  unmatchedA: number;
  unmatchedB: number;
  resultRows: number;
  joinType: JoinType;
  columnA: string;
  columnB: string;
  sampleUnmatchedA: string[];
  sampleUnmatchedB: string[];
}

function normalizeKey(val: any): string {
  return String(val ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function detectSimilarColumns(colsA: string[], colsB: string[]): { colA: string; colB: string; score: number }[] {
  const results: { colA: string; colB: string; score: number }[] = [];

  colsA.forEach(a => {
    colsB.forEach(b => {
      const la = a.toLowerCase().replace(/[_\-\s]/g, '');
      const lb = b.toLowerCase().replace(/[_\-\s]/g, '');

      let score = 0;
      if (la === lb) score = 1.0;
      else if (la.includes(lb) || lb.includes(la)) score = 0.8;
      else {
        const maxLen = Math.max(la.length, lb.length);
        if (maxLen > 0) {
          let common = 0;
          const shorter = la.length <= lb.length ? la : lb;
          const longer = la.length > lb.length ? la : lb;
          for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) common++;
          }
          score = common / maxLen;
        }
      }

      if (score >= 0.5) {
        results.push({ colA: a, colB: b, score });
      }
    });
  });

  return results.sort((a, b) => b.score - a.score);
}

export function mergeDatasets(
  datasetA: DataRow[],
  datasetB: DataRow[],
  columnA: string,
  columnB: string,
  joinType: JoinType
): { merged: DataRow[]; matchCount: number; diagnostics: JoinDiagnostics } {
  const diagnostics: JoinDiagnostics = {
    totalA: datasetA.length,
    totalB: datasetB.length,
    matchCount: 0,
    unmatchedA: 0,
    unmatchedB: 0,
    resultRows: 0,
    joinType,
    columnA,
    columnB,
    sampleUnmatchedA: [],
    sampleUnmatchedB: [],
  };

  if (!datasetA.length || !datasetB.length) {
    return { merged: [], matchCount: 0, diagnostics };
  }

  if (!columnA || !columnB) {
    return { merged: [], matchCount: 0, diagnostics };
  }

  const bMap = new Map<string, DataRow[]>();
  datasetB.forEach(row => {
    const key = normalizeKey(row[columnB]);
    if (key) {
      if (!bMap.has(key)) bMap.set(key, []);
      bMap.get(key)!.push(row);
    }
  });

  const bColumnsExcludingJoin = Object.keys(datasetB[0] || {}).filter(k => k !== columnB);
  const emptyBRow: DataRow = {};
  bColumnsExcludingJoin.forEach(k => { emptyBRow[k] = null; });

  const merged: DataRow[] = [];
  const matchedBKeys = new Set<string>();

  datasetA.forEach(rowA => {
    const keyA = normalizeKey(rowA[columnA]);
    const matchingBRows = bMap.get(keyA);

    if (matchingBRows && matchingBRows.length > 0) {
      diagnostics.matchCount++;
      matchedBKeys.add(keyA);
      matchingBRows.forEach(rowB => {
        const mergedRow = { ...rowA };
        bColumnsExcludingJoin.forEach(key => {
          mergedRow[key] = rowB[key];
        });
        merged.push(mergedRow);
      });
    } else {
      diagnostics.unmatchedA++;
      if (diagnostics.sampleUnmatchedA.length < 5) {
        diagnostics.sampleUnmatchedA.push(String(rowA[columnA] ?? 'empty'));
      }

      if (joinType === 'left' || joinType === 'full') {
        merged.push({ ...rowA, ...emptyBRow });
      }
    }
  });

  if (joinType === 'right' || joinType === 'full') {
    const aColumnsExcludingJoin = Object.keys(datasetA[0] || {}).filter(k => k !== columnA);
    const emptyARow: DataRow = {};
    aColumnsExcludingJoin.forEach(k => { emptyARow[k] = null; });

    datasetB.forEach(rowB => {
      const keyB = normalizeKey(rowB[columnB]);
      if (!matchedBKeys.has(keyB)) {
        diagnostics.unmatchedB++;
        if (diagnostics.sampleUnmatchedB.length < 5) {
          diagnostics.sampleUnmatchedB.push(String(rowB[columnB] ?? 'empty'));
        }
        const newRow: DataRow = { ...emptyARow, [columnA]: rowB[columnB] };
        bColumnsExcludingJoin.forEach(key => {
          newRow[key] = rowB[key];
        });
        merged.push(newRow);
      }
    });
  } else {
    datasetB.forEach(rowB => {
      const keyB = normalizeKey(rowB[columnB]);
      if (!matchedBKeys.has(keyB)) {
        diagnostics.unmatchedB++;
        if (diagnostics.sampleUnmatchedB.length < 5) {
          diagnostics.sampleUnmatchedB.push(String(rowB[columnB] ?? 'empty'));
        }
      }
    });
  }

  diagnostics.resultRows = merged.length;
  return { merged, matchCount: diagnostics.matchCount, diagnostics };
}

export interface FileDataset {
  data: DataRow[];
  columns: string[];
  fileName: string;
}

export interface MergeConfig {
  datasets: FileDataset[];
  joinColumns: string[];
  joinType: JoinType;
}

export function mergeMultipleDatasets(config: MergeConfig): { merged: DataRow[]; totalMatches: number; diagnostics: JoinDiagnostics[] } {
  if (config.datasets.length < 2) {
    return { merged: [], totalMatches: 0, diagnostics: [] };
  }

  let result = config.datasets[0].data;
  let currentJoinCol = config.joinColumns[0];
  let totalMatches = 0;
  const allDiagnostics: JoinDiagnostics[] = [];

  for (let i = 1; i < config.datasets.length; i++) {
    const rightJoinCol = config.joinColumns[i];

    const { merged, matchCount, diagnostics } = mergeDatasets(
      result,
      config.datasets[i].data,
      currentJoinCol,
      rightJoinCol,
      config.joinType
    );

    allDiagnostics.push(diagnostics);

    if (merged.length === 0 && config.joinType === 'inner') {
      return { merged: [], totalMatches: 0, diagnostics: allDiagnostics };
    }

    result = merged;
    totalMatches += matchCount;
  }

  return { merged: result, totalMatches, diagnostics: allDiagnostics };
}
