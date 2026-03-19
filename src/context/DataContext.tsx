import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { normalizeDataset, NormalizationReport } from '@/lib/dataNormalizer';

export type DataRow = Record<string, any>;

interface DataContextType {
  originalData: DataRow[];
  currentData: DataRow[];
  fileName: string | null;
  isLoading: boolean;
  error: string | null;
  columns: string[];
  numericColumns: string[];
  columnTypes: Record<string, string>;
  normalizationReport: NormalizationReport | null;
  processFile: (file: File) => Promise<boolean>;
  updateData: (newData: DataRow[]) => void;
  setFileName: (name: string) => void;
  setError: (error: string | null) => void;
  resetData: () => void;
  revertToOriginal: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [originalData, setOriginalData] = useState<DataRow[]>([]);
  const [currentData, setCurrentData] = useState<DataRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [normalizationReport, setNormalizationReport] = useState<NormalizationReport | null>(null);

  const extractColumns = (data: DataRow[]) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const getNumericColumns = (data: DataRow[], cols: string[]) => {
    if (!data || data.length === 0) return [];
    const sampleSize = Math.min(data.length, 200);
    const sample = data.slice(0, sampleSize);

    return cols.filter(col => {
      let numericCount = 0;
      let validCount = 0;
      sample.forEach(row => {
        const val = row[col];
        if (val !== null && val !== undefined && val !== '') {
          validCount++;
          if (typeof val === 'number' || !isNaN(Number(String(val).replace(/,/g, '')))) {
            numericCount++;
          }
        }
      });
      return validCount > 0 && (numericCount / validCount) > 0.8;
    });
  };

  const getColumnTypes = (data: DataRow[], cols: string[]) => {
    if (!data || data.length === 0) return {};
    const sampleSize = Math.min(data.length, 200);
    const sample = data.slice(0, sampleSize);

    const types: Record<string, string> = {};

    cols.forEach(col => {
      let isNumeric = true;
      let isBoolean = true;
      let isDate = true;
      let hasValues = false;

      sample.forEach(row => {
        const val = row[col];
        if (val !== null && val !== undefined && val !== '' && val !== '—') {
          hasValues = true;
          if (isNaN(Number(String(val).replace(/,/g, '')))) isNumeric = false;
          const sVal = String(val).toLowerCase();
          if (!['true', 'false', '0', '1', 'yes', 'no'].includes(sVal)) isBoolean = false;
          const d = new Date(val);
          if (isNaN(d.getTime()) || !String(val).match(/\d/)) isDate = false;
        }
      });

      if (!hasValues) types[col] = 'Text';
      else if (isNumeric) types[col] = 'Numeric';
      else if (isBoolean) types[col] = 'Boolean';
      else if (isDate) types[col] = 'Date';
      else types[col] = 'Text';
    });

    return types;
  };

  const applyNormalization = (rawData: DataRow[]) => {
    const { data: normalized, report } = normalizeDataset(rawData);
    setNormalizationReport(report);
    return normalized;
  };

  const processFile = useCallback(async (file: File): Promise<boolean> => {
    if (file.size > 20 * 1024 * 1024) {
      setError("For best performance, please upload files under 20MB.");
      return false;
    }

    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    setNormalizationReport(null);

    return new Promise((resolve) => {
      try {
        if (file.name.toLowerCase().endsWith('.csv')) {
          Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors && results.errors.length > 0 && !results.data.length) {
                setError("Failed to parse CSV file. The file may be corrupted or use an unsupported format.");
                setIsLoading(false);
                resolve(false);
              } else {
                const normalized = applyNormalization(results.data as DataRow[]);
                setOriginalData(normalized);
                setCurrentData(normalized);
                setIsLoading(false);
                resolve(true);
              }
            },
            error: (error) => {
              setError(`CSV parsing error: ${error.message}`);
              setIsLoading(false);
              resolve(false);
            }
          });
        } else if (file.name.toLowerCase().match(/\.xlsx?$/)) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = e.target?.result;
              const workbook = XLSX.read(data, { type: 'array' });

              if (workbook.SheetNames.length > 1) {
                console.log(`Multi-sheet Excel detected: ${workbook.SheetNames.length} sheets (${workbook.SheetNames.join(', ')}). Using first sheet.`);
              }

              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                defval: null,
                raw: false,
                dateNF: 'yyyy-mm-dd'
              });

              if (jsonData.length === 0) {
                setError("The Excel file appears to be empty or has no readable data.");
                setIsLoading(false);
                resolve(false);
                return;
              }

              const normalized = applyNormalization(jsonData as DataRow[]);
              setOriginalData(normalized);
              setCurrentData(normalized);
              setIsLoading(false);
              resolve(true);
            } catch (err: any) {
              setError(`Excel parsing error: ${err.message || 'Failed to read the file structure.'}`);
              setIsLoading(false);
              resolve(false);
            }
          };
          reader.onerror = () => {
            setError("Failed to read file. The file may be corrupted.");
            setIsLoading(false);
            resolve(false);
          };
          reader.readAsArrayBuffer(file);
        } else {
          setError("Unsupported file format. Please upload a .CSV or .XLSX file.");
          setIsLoading(false);
          resolve(false);
        }
      } catch (err) {
        setError("An unexpected error occurred during file processing. Please try again.");
        setIsLoading(false);
        resolve(false);
      }
    });
  }, []);

  const updateData = useCallback((newData: DataRow[]) => {
    setCurrentData([...newData]);
  }, []);

  const resetData = useCallback(() => {
    setOriginalData([]);
    setCurrentData([]);
    setFileName(null);
    setError(null);
    setNormalizationReport(null);
  }, []);

  const revertToOriginal = useCallback(() => {
    setCurrentData([...originalData]);
  }, [originalData]);

  const setErrorManual = useCallback((err: string | null) => {
    setError(err);
  }, []);

  const setFileNameManual = useCallback((name: string) => {
    setFileName(name);
  }, []);

  const columns = extractColumns(currentData);
  const numericColumns = getNumericColumns(currentData, columns);
  const columnTypes = getColumnTypes(currentData, columns);

  return (
    <DataContext.Provider value={{
      originalData,
      currentData,
      fileName,
      isLoading,
      error,
      columns,
      numericColumns,
      columnTypes,
      normalizationReport,
      processFile,
      updateData,
      setFileName: setFileNameManual,
      setError: setErrorManual,
      resetData,
      revertToOriginal
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
