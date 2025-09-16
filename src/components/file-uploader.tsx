'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Metrics, ParsedData, DocumentData } from '@/lib/types';

interface FileUploaderProps {
  onProcess: (data: {
    // Back-compat single document fields (first doc if multiple)
    parsedData: ParsedData;
    stringData: string;
    metrics: Metrics;
    errors: string[];
    fileName: string;
    // Multi-document payload
    documents: DocumentData[];
    combinedParsedData: ParsedData;
    combinedStringData: string;
    combinedMetrics: Metrics;
    fileNames: string[];
  }) => void;
  onProgress?: (p: { phase: 'preparing'|'reading'|'combining'; current?: number; total?: number; etaMs?: number; note?: string }) => void;
  isLoading: boolean;
  loadingMessage: string;
  children: React.ReactNode;
}

const FileUploader = React.forwardRef<
  { trigger: () => void; },
  FileUploaderProps
>(({ onProcess, onProgress, isLoading, loadingMessage, children }, ref) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => ({
    trigger: () => fileInputRef.current?.click(),
  }));

  const handleFile = (selectedFile: File | null) => {
    if (selectedFile) {
      if (
        selectedFile.type === 'text/csv' ||
        selectedFile.type ===
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'application/vnd.ms-excel'
      ) {
        processFiles([selectedFile]);
      } else {
        alert('Please upload a valid CSV, XLSX, or XLS file.');
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const processFiles = (files: File[]) => {
    onProgress?.({ phase: 'preparing', current: 0, total: files.length, note: 'Preparing documents' });
    const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const valid = files.filter(f => allowed.includes(f.type));
    if (valid.length === 0) {
      alert('Please upload a valid CSV, XLSX, or XLS file.');
      return;
    }

    const docs: DocumentData[] = [];
    const errors: string[] = [];

    let remaining = valid.length;

    valid.forEach((file, index) => {
      const reader = new FileReader();
      const startedAt = performance.now();
      onProgress?.({ phase: 'reading', current: index, total: valid.length, note: `Reading ${file.name}` });
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data as ArrayBuffer, { type: 'array', dense: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          const stringData = XLSX.utils.sheet_to_csv(worksheet);

          const headers = (json[0] as string[]) || [];
          const rows = (json.slice(1) as any[][]) || [];
          const numericColumns: string[] = [];
          const metrics: Metrics = {};

          if (headers.length) {
            headers.forEach((header, colIndex) => {
              const values = rows.map(row => row[colIndex]).filter(v => v !== null && v !== undefined && v !== '');
              const isNumeric = values.length > 0 && values.every(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v))));
              if (isNumeric) {
                numericColumns.push(header);
                const numericValues = values.map(v => typeof v === 'string' ? parseFloat(v) : v as number);
                const total = numericValues.reduce((sum, v) => sum + v, 0);
                const average = total / numericValues.length;
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                let trend: 'increase' | 'decrease' | 'stable' = 'stable';
                if (numericValues.length > 1) {
                  if (numericValues[numericValues.length - 1] > numericValues[0]) trend = 'increase';
                  else if (numericValues[numericValues.length - 1] < numericValues[0]) trend = 'decrease';
                }
                metrics[header] = { total, average, min, max, trend };
              }
            });
          }

          const parsedData: ParsedData = { headers, rows, numericColumns };
          const doc: DocumentData = {
            id: `${Date.now()}_${index}`,
            fileName: file.name,
            parsedData,
            stringData,
            metrics,
          };
          docs.push(doc);
        } catch (err: any) {
          errors.push(`${file.name}: ${err?.message || 'Failed to process file'}`);
        } finally {
          remaining -= 1;
          const done = valid.length - remaining;
          const elapsed = performance.now() - startedAt;
          const avgMs = elapsed; // naive per-file estimate
          const etaMs = Math.max(0, (valid.length - done) * avgMs);
          onProgress?.({ phase: 'reading', current: done, total: valid.length, etaMs, note: `Read ${file.name}` });
          if (remaining === 0) {
            onProgress?.({ phase: 'combining', current: valid.length, total: valid.length, note: 'Combining documents' });
            // Build combined dataset
            const combined = buildCombined(docs);
            const first = docs[0];
            onProcess({
              parsedData: first?.parsedData || { headers: [], rows: [], numericColumns: [] },
              stringData: first?.stringData || '',
              metrics: first?.metrics || {},
              errors,
              fileName: first?.fileName || '',
              documents: docs,
              combinedParsedData: combined.combinedParsedData,
              combinedStringData: combined.combinedStringData,
              combinedMetrics: combined.combinedMetrics,
              fileNames: docs.map(d => d.fileName),
            });
          }
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  function recomputeMetrics(parsed: ParsedData): Metrics {
    const m: Metrics = {};
    parsed.headers.forEach((header, colIndex) => {
      const values = parsed.rows.map(row => row[colIndex]).filter(v => v !== null && v !== undefined && v !== '');
      const numeric = values.length > 0 && values.every(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v as string))));
      if (numeric) {
        const numericValues = values.map(v => typeof v === 'string' ? parseFloat(v as string) : v as number);
        const total = numericValues.reduce((sum, v) => sum + v, 0);
        const average = total / numericValues.length;
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        let trend: 'increase' | 'decrease' | 'stable' = 'stable';
        if (numericValues.length > 1) {
          if (numericValues[numericValues.length - 1] > numericValues[0]) trend = 'increase';
          else if (numericValues[numericValues.length - 1] < numericValues[0]) trend = 'decrease';
        }
        m[header] = { total, average, min, max, trend };
      }
    });
    return m;
  }

  function buildCombined(documents: DocumentData[]): { combinedParsedData: ParsedData; combinedStringData: string; combinedMetrics: Metrics } {
    if (documents.length === 0) {
      return {
        combinedParsedData: { headers: [], rows: [], numericColumns: [] },
        combinedStringData: '',
        combinedMetrics: {},
      };
    }

    // Determine union of headers
    const unionHeaders = Array.from(new Set(documents.flatMap(d => d.parsedData.headers)));
    const docColumn = 'Document';
    const headers = [...unionHeaders, docColumn];

    // Rows normalized to union columns + Document column
    const rows: (string | number)[][] = [];
    for (const d of documents) {
      const indexMap = new Map<string, number>();
      d.parsedData.headers.forEach((h, i) => indexMap.set(h, i));
      for (const r of d.parsedData.rows) {
        const row: (string | number)[] = new Array(headers.length).fill('');
        unionHeaders.forEach((h, ui) => {
          const srcIdx = indexMap.get(h);
          if (srcIdx !== undefined) row[ui] = r[srcIdx] ?? '';
        });
        row[headers.length - 1] = d.fileName; // Document name
        rows.push(row);
      }
    }

    // numericColumns recompute on combined
    const combinedParsedData: ParsedData = {
      headers,
      rows,
      numericColumns: unionHeaders.filter((h) => {
        const colIndex = headers.indexOf(h);
        const values = rows.map(row => row[colIndex]).filter(v => v !== null && v !== undefined && v !== '');
        return values.length > 0 && values.every(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v as string))));
      }),
    };

    // Build combined string with source tags
    let combinedStringData = '';
    for (const d of documents) {
      combinedStringData += `### Document: ${d.fileName}\n` + d.stringData + "\n\n";
    }

    const combinedMetrics = recomputeMetrics(combinedParsedData);
    return { combinedParsedData, combinedStringData, combinedMetrics };
  }
  
  const triggerFileSelect = () => fileInputRef.current?.click();
  
  return (
    <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-background p-12 text-center transition-all cursor-pointer active:scale-[0.99] hover:border-primary/60 ${
        isDragging ? 'border-primary shadow-inner' : 'hover:shadow-sm'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
    >
        <div className='absolute inset-0 bg-background/80 backdrop-blur-sm' style={{opacity: isLoading ? 1 : 0, transition: 'opacity 0.3s ease-in-out', zIndex: 10}} >
             <div className='flex h-full flex-col items-center justify-center gap-4'>
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                <p className='text-lg font-medium text-muted-foreground'>{loadingMessage}</p>
             </div>
        </div>

        <UploadCloud className="h-12 w-12 text-gray-400" />
        <h3 className="text-xl font-semibold">
            Drag & drop your file here
        </h3>
        <p className="text-muted-foreground">
            or click to browse
        </p>
        
        <div onClick={(e) => { e.stopPropagation(); triggerFileSelect(); }}>
          {children}
        </div>

        <Input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              if (list.length > 0) processFiles(list);
            }}
            accept=".csv, .xlsx, .xls"
            disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground mt-2">
            Supports .xlsx, .xls, and .csv files
        </p>
    </div>
  );
});
FileUploader.displayName = 'FileUploader';

export default FileUploader;
