'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Metrics, ParsedData } from '@/lib/types';

interface FileUploaderProps {
  onProcess: (data: {
    parsedData: ParsedData;
    stringData: string;
    metrics: Metrics;
    errors: string[];
    fileName: string;
  }) => void;
  isLoading: boolean;
  loadingMessage: string;
  children: React.ReactNode;
}

const FileUploader = React.forwardRef<
  { trigger: () => void; },
  FileUploaderProps
>(({ onProcess, isLoading, loadingMessage, children }, ref) => {
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
        processFile(selectedFile);
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

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const stringData = XLSX.utils.sheet_to_csv(worksheet);

      const headers = json[0] as string[];
      const rows = json.slice(1);
      const errors: string[] = [];
      const numericColumns: string[] = [];
      const metrics: Metrics = {};

      if (headers) {
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
              if (numericValues[numericValues.length - 1] > numericValues[0]) {
                trend = 'increase';
              } else if (numericValues[numericValues.length - 1] < numericValues[0]) {
                trend = 'decrease';
              }
            }

            metrics[header] = { total, average, min, max, trend };
          }
        });
      }

      if (rows.some(row => row.length !== headers.length)) {
        errors.push('Inconsistent number of columns detected in some rows.');
      }

      const parsedData: ParsedData = {
        headers,
        rows,
        numericColumns,
      };

      onProcess({ parsedData, stringData, metrics, errors, fileName: file.name });
    };
    reader.readAsBinaryString(file);
  };
  
  const triggerFileSelect = () => fileInputRef.current?.click();
  
  return (
    <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-background p-12 text-center transition-all ${
        isDragging ? 'border-primary' : ''
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
        
        <div onClick={(e) => e.stopPropagation()}>
          {children}
        </div>

        <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] as File)}
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
