import React, { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import * as Papa from "papaparse";

export const DownloadTab = () => {
  const { currentData, fileName, columns, numericColumns, originalData } =
    useData();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [exportSection, setExportSection] = useState<
    "preview" | "cleaned" | "stats" | "charts"
  >("cleaned");

  // Stats calculation for export
  const statsData = useMemo(() => {
    if (!currentData.length || !numericColumns.length) return [];
    return numericColumns
      .map((col) => {
        const values = currentData
          .map((row) => Number(row[col]))
          .filter((v) => !isNaN(v));
        if (!values.length) return null;
        values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = values[0];
        const max = values[values.length - 1];
        const median =
          values.length % 2 !== 0
            ? values[Math.floor(values.length / 2)]
            : (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
        return {
          Column: col,
          Count: values.length,
          Min: min,
          Max: max,
          Average: avg,
          Median: median,
          Sum: sum,
          Range: max - min,
        };
      })
      .filter(Boolean);
  }, [currentData, numericColumns]);

  // Charts aggregation for export
  const chartsExportData = useMemo(() => {
    if (!currentData.length || !columns.length || !numericColumns.length)
      return [];
    const xAxis =
      columns.find((c) => !numericColumns.includes(c)) || columns[0];
    const yAxis = numericColumns[0] || columns[1] || columns[0];
    const aggregated = new Map<string, number>();
    currentData.forEach((row) => {
      const x = String(row[xAxis] || "Unknown");
      const y = Number(row[yAxis]);
      if (!isNaN(y)) aggregated.set(x, (aggregated.get(x) || 0) + y);
    });
    return Array.from(aggregated.entries()).map(([Label, Value]) => ({
      Label,
      Value,
    }));
  }, [currentData, columns, numericColumns]);

  const triggerDownload = (blob: Blob, defaultName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.style.display = "none";
    link.href = url;
    const originalName = fileName ? fileName.split(".")[0] : "data";
    link.setAttribute("download", `${originalName}_${defaultName}`);
    document.body.appendChild(link);

    setTimeout(() => {
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1000);
    }, 100);
  };

  const handleDownload = async (type: "csv" | "json") => {
    try {
      setDownloading(type);
      setProgress(0);

      let dataToExport: any[] = [];
      let suffix = "";

      switch (exportSection) {
        case "preview":
          dataToExport = originalData;
          suffix = "original";
          break;
        case "cleaned":
          dataToExport = currentData;
          suffix = "cleaned";
          break;
        case "stats":
          dataToExport = statsData;
          suffix = "statistics";
          break;
        case "charts":
          dataToExport = chartsExportData;
          suffix = "charts_data";
          break;
      }

      const totalSteps = 10;
      for (let i = 1; i <= totalSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        setProgress((i / totalSteps) * 100);
      }

      const dataString =
        type === "csv"
          ? Papa.unparse(dataToExport)
          : JSON.stringify(dataToExport, null, 2);

      const mimeType =
        type === "csv" ? "text/csv;charset=utf-8;" : "application/json";
      const blob = new Blob([dataString], { type: mimeType });

      triggerDownload(blob, `${suffix}.${type}`);

      toast({
        title: "Download Complete",
        description: `${suffix.replace("_", " ").toUpperCase()} exported successfully.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "An error occurred while preparing your file.",
      });
    } finally {
      setTimeout(() => {
        setDownloading(null);
        setProgress(0);
      }, 500);
    }
  };

  const sections = [
    {
      id: "preview",
      label: "Original Data",
      desc: "Export the complete original dataset as uploaded",
    },
    {
      id: "cleaned",
      label: "Cleaned Data",
      desc: "Export the full processed dataset with all changes",
    },
    {
      id: "stats",
      label: "Statistics Summary",
      desc: "Export numeric analysis (Mean, Median, Min, Max)",
    },
    {
      id: "charts",
      label: "Charts Data",
      icon: "Trend",
      desc: "Export aggregated data used for visualizations",
    },
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-blue-50 text-[#1e3a8a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Download className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-2">
          Export Data Options
        </h2>
        <p className="text-slate-500">
          Select which part of your analysis you want to save.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-8 md:p-10 mb-8">
        <div className="mb-10">
          <Label className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 block">
            Select Export Content
          </Label>
          <RadioGroup
            value={exportSection}
            onValueChange={(val) => setExportSection(val as any)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {sections.map((s) => (
              <div
                key={s.id}
                className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  exportSection === s.id
                    ? "border-[#1e3a8a] bg-blue-50/50 ring-4 ring-blue-500/5"
                    : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setExportSection(s.id as any)}
              >
                <RadioGroupItem value={s.id} id={s.id} className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor={s.id}
                    className="text-base font-bold text-slate-800 cursor-pointer block mb-1"
                  >
                    {s.label}
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
                {exportSection === s.id && (
                  <Check className="w-5 h-5 text-[#1e3a8a] absolute top-5 right-5" />
                )}
              </div>
            ))}
          </RadioGroup>

          <div className="mt-6 flex items-center gap-2 text-slate-400 justify-center">
            <Info className="w-4 h-4" />
            <p className="text-xs font-medium">
              You can download one section at a time for faster processing.
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-100 mb-10" />

        <div className="space-y-8">
          {downloading && (
            <div className="animate-in slide-in-from-top-4">
              <div className="flex justify-between mb-3 text-sm font-bold text-[#1e3a8a]">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating {exportSection.toUpperCase()}{" "}
                  {downloading.toUpperCase()}...
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress
                value={progress}
                className="h-3 bg-slate-100 rounded-full"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              size="lg"
              className="h-16 rounded-2xl bg-[#1e3a8a] hover:bg-[#162a63] text-white shadow-lg shadow-blue-900/20 text-lg font-bold gap-3 transition-all active:scale-[0.98]"
              onClick={() => handleDownload("csv")}
              disabled={!!downloading}
            >
              <FileSpreadsheet className="w-6 h-6" />
              Download CSV
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-16 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-lg font-bold gap-3 transition-all active:scale-[0.98]"
              onClick={() => handleDownload("json")}
              disabled={!!downloading}
            >
              <FileText className="w-6 h-6" />
              Download JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
