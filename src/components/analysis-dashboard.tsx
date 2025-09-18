'use client';

import {
  AlertTriangle,
  ArrowRight,
  BarChart,
  BrainCircuit,
  Check,
  FileSearch,
  LineChart as LineChartIcon,
  List,
  LoaderCircle,
  Sparkles,
  Target,
  User,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Eye,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Hash,
  Layers3,
  ChevronRight,
  Maximize2,
  Download,
  Copy,
} from 'lucide-react';
import * as React from 'react';
import {
  Bar,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ReactMarkdown from 'react-markdown';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AnalysisResult } from '@/lib/types';
import { ServiceStatusIndicator, useRetryState } from '@/components/ui/service-status';

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  onNewQuestion: (question: string) => void;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
}

// Helper function to format insights with color coding and better structure
function formatInsight(insight: string) {
  // Split by sentences and paragraphs
  const sentences = insight.split(/[.!?](?=\s|$)/).filter(s => s.trim());
  
  return sentences.map((sentence, idx) => {
    const cleanSentence = sentence.trim();
    if (!cleanSentence) return null;
    
    // Detect positive/negative sentiment keywords
    const positiveWords = ['increase', 'improve', 'better', 'higher', 'gain', 'growth', 'positive', 'strong', 'excellent', 'good', 'up', 'rise', 'boost'];
    const negativeWords = ['decrease', 'decline', 'lower', 'drop', 'negative', 'poor', 'weak', 'bad', 'down', 'fall', 'reduce', 'loss'];
    
    const hasPositive = positiveWords.some(word => cleanSentence.toLowerCase().includes(word));
    const hasNegative = negativeWords.some(word => cleanSentence.toLowerCase().includes(word));
    
    let className = "";
    let icon = null;
    
    if (hasPositive && !hasNegative) {
      className = "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/20 border-l-4 border-emerald-500";
      icon = <TrendingUp className="h-4 w-4 text-emerald-600" />;
    } else if (hasNegative && !hasPositive) {
      className = "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/20 border-l-4 border-red-500";
      icon = <TrendingDown className="h-4 w-4 text-red-600" />;
    } else {
      className = "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/20 border-l-4 border-blue-500";
      icon = <Zap className="h-4 w-4 text-blue-600" />;
    }
    
    return (
      <div key={idx} className={`p-3 rounded-r-lg mb-3 ${className}`}>
        <div className="flex items-start gap-3">
          {icon}
          <span className="text-sm leading-relaxed">
            {cleanSentence}{cleanSentence.match(/[.!?]$/) ? '' : '.'}
          </span>
        </div>
      </div>
    );
  }).filter(Boolean);
}
function getColumnIndex(headers: string[], name: string) {
  return headers.indexOf(name);
}

function tryParseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    // Excel serial dates are handled as numbers sometimes; Date will treat as ms since epoch (which may be incorrect)
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  const str = String(v).trim();
  if (!str || str.length < 6) return null;
  // Common ISO-like formats first
  const iso = Date.parse(str);
  if (!isNaN(iso)) return new Date(iso);
  // Try common day-first and month-first patterns explicitly
  const m = str.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const M = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
    const dt = new Date(y, M, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function formatMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function average(nums: number[]): number | null {
  const valid = nums.filter((n) => typeof n === 'number' && isFinite(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item) ?? 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Color palette for categories
const CATEGORY_COLORS = [
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#a855f7', // violet-500
  '#f97316', // orange-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
];

const NONE = '__NONE__';

export default function AnalysisDashboard({
  result,
  onNewQuestion,
  isLoading = false,
  error,
  onRetry,
}: AnalysisDashboardProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [selectedColumn, setSelectedColumn] = React.useState<string>('');
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);
  const { retryDisabled, handleRetry } = useRetryState();

  // Safely extract data with null checks
  const summary = result?.summary || null;
  const parsedData = result?.parsedData || null;
  const chatHistory = result?.chatHistory || [];
  
  const keyInsights = summary?.keyInsights || [];
  const columnAnalyses = summary?.columnAnalyses || [];
  const rowLevelFindings = summary?.rowLevelFindings || [];
  const dataQualityIssues = summary?.dataQualityIssues || [];

  // Chart data with null safety
  const chartData = parsedData && selectedColumn
    ? parsedData.rows.map((row: any, index: number) => ({
        x: index,
        y: row[getColumnIndex(parsedData.headers, selectedColumn)],
      }))
    : [];

  const isUserInputPending = result && chatHistory.length > 0
    ? chatHistory[chatHistory.length - 1].sender === 'user'
    : false;

  // NEW: Derived columns and filter state
  const headers = result?.parsedData.headers ?? [];
  const numericColumns = result?.parsedData.numericColumns ?? [];
  const categoricalColumns = React.useMemo(() => {
    if (!result) return [] as string[];
    const numericSet = new Set(numericColumns);
    return headers.filter((h) => !numericSet.has(h));
  }, [headers, numericColumns, result]);

  // Detect a date-like column from categorical columns (more permissive)
  const detectedDateColumn = React.useMemo(() => {
    if (!result) return '';
    for (const col of categoricalColumns) {
      const idx = getColumnIndex(headers, col);
      const sample = result.parsedData.rows
        .slice(0, 50)
        .map((r) => tryParseDate(r[idx]))
        .filter(Boolean) as Date[];
      if (sample.length >= 3) return col; // lowered threshold improves detection
    }
    return '';
  }, [categoricalColumns, headers, result]);

  const [categoryCol, setCategoryCol] = React.useState<string>('');
  const [categoryValue, setCategoryValue] = React.useState<string>('All');
  const [dateCol, setDateCol] = React.useState<string>(NONE);
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [kpiNumericCol, setKpiNumericCol] = React.useState<string>('');

  React.useEffect(() => {
    if (!result) return;
    // Default selections when dataset changes
    setCategoryCol((prev) => prev || categoricalColumns[0] || '');
    setDateCol((prev) => (prev && prev !== NONE ? prev : (detectedDateColumn || NONE)));
    setKpiNumericCol((prev) => prev || numericColumns[0] || '');
    if (result.parsedData.numericColumns && result.parsedData.numericColumns.length > 0) {
      setSelectedColumn(result.parsedData.numericColumns[0]);
    } else {
      setSelectedColumn('');
    }
  }, [result, categoricalColumns, detectedDateColumn, numericColumns]);

  const categoryValues = React.useMemo(() => {
    if (!result || !categoryCol) return [] as string[];
    const idx = getColumnIndex(headers, categoryCol);
    const values = new Set<string>();
    result.parsedData.rows.forEach((r) => {
      const v = r[idx];
      if (v !== null && v !== undefined) {
        const s = String(v).trim();
        if (s) values.add(s);
      }
    });
    return Array.from(values).slice(0, 50); // allow more in list; UI chips will contain it
  }, [result, categoryCol, headers]);

  const filteredRows = React.useMemo(() => {
    if (!result) return [] as (string | number)[][];
    let rows = result.parsedData.rows;

    if (categoryCol && categoryValue !== 'All') {
      const idx = getColumnIndex(headers, categoryCol);
      rows = rows.filter((r) => String(r[idx]) === categoryValue);
    }

    if (dateCol !== NONE && (startDate || endDate)) {
      const dIdx = getColumnIndex(headers, dateCol);
      const s = startDate ? new Date(startDate) : null;
      const e = endDate ? new Date(endDate) : null;
      rows = rows.filter((r) => {
        const d = tryParseDate(r[dIdx]);
        if (!d) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      });
    }

    return rows;
  }, [result, headers, categoryCol, categoryValue, dateCol, startDate, endDate]);

  // Donut data for category distribution
  const donutData = React.useMemo(() => {
    if (!categoryCol || !result) return [] as { name: string; value: number }[];
    const idx = getColumnIndex(headers, categoryCol);
    const counts = countBy(filteredRows, (r) => String(r[idx] ?? 'Unknown'));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [result, filteredRows, headers, categoryCol]);

  // Group top-N categories for concise legend, aggregate the rest into "Other"
  const donutDisplayData = React.useMemo(() => {
    const N = 8;
    const sorted = [...donutData].sort((a, b) => b.value - a.value);
    if (sorted.length <= N) return sorted;
    const head = sorted.slice(0, N);
    const tailSum = sorted.slice(N).reduce((s, d) => s + d.value, 0);
    return [...head, { name: 'Other', value: tailSum }];
  }, [donutData]);

  // KPI average for selected numeric column
  const kpiAverage = React.useMemo(() => {
    if (!kpiNumericCol || !result) return null as null | number;
    const idx = getColumnIndex(headers, kpiNumericCol);
    const nums = filteredRows
      .map((r) => r[idx])
      .filter((v): v is number => typeof v === 'number' && isFinite(v));
    return average(nums);
  }, [result, filteredRows, headers, kpiNumericCol]);

  // Monthly stacked data
  const monthlyStacked = React.useMemo(() => {
    if (!result || dateCol === NONE) return [] as any[];
    const dIdx = getColumnIndex(headers, dateCol);
    const cIdx = categoryCol ? getColumnIndex(headers, categoryCol) : -1;
    const groups: Record<string, Record<string, number>> = {};

    filteredRows.forEach((r) => {
      const d = tryParseDate(r[dIdx]);
      if (!d) return;
      const m = formatMonth(d);
      const cat = cIdx >= 0 ? String(r[cIdx] ?? 'Unknown') : 'All';
      groups[m] = groups[m] || {};
      groups[m][cat] = (groups[m][cat] || 0) + 1;
    });

    const months = Object.keys(groups).sort();
    const allCats = new Set<string>();
    months.forEach((m) => Object.keys(groups[m]).forEach((c) => allCats.add(c)));
    return months.map((m) => ({ month: m, ...Array.from(allCats).reduce((acc, c) => ({ ...acc, [c]: groups[m][c] || 0 }), {}) }));
  }, [result, filteredRows, headers, dateCol, categoryCol]);

  // Top categories for stacked bars; default to 'All' if no category column selected
  const barKeys = React.useMemo(() => {
    if (!categoryCol) return ['All'];
    const idx = getColumnIndex(headers, categoryCol);
    const counts = countBy(filteredRows, (r) => String(r[idx] ?? 'Unknown'));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .slice(0, 6);
  }, [categoryCol, headers, filteredRows]);

  // Grouped statistics for Groups tab
  const groupedStats = React.useMemo(() => {
    if (!result) return [] as { category: string; count: number; avg: number | null }[];

    const groups = new Map<string, { count: number; sum: number; n: number }>();

    if (categoryCol) {
      const cIdx = getColumnIndex(headers, categoryCol);
      const nIdx = kpiNumericCol ? getColumnIndex(headers, kpiNumericCol) : -1;
      filteredRows.forEach((r) => {
        const key = String(r[cIdx] ?? 'Unknown');
        const g = groups.get(key) ?? { count: 0, sum: 0, n: 0 };
        g.count += 1;
        const val = r[nIdx];
        if (nIdx >= 0 && typeof val === 'number' && isFinite(val)) {
          g.sum += val;
          g.n += 1;
        }
        groups.set(key, g);
      });
    } else {
      // Single 'All' group
      const nIdx = kpiNumericCol ? getColumnIndex(headers, kpiNumericCol) : -1;
      const g = { count: filteredRows.length, sum: 0, n: 0 };
      filteredRows.forEach((r) => {
        const val = r[nIdx];
        if (nIdx >= 0 && typeof val === 'number' && isFinite(val)) {
          g.sum += val;
          g.n += 1;
        }
      });
      groups.set('All', g);
    }

    return Array.from(groups.entries())
      .map(([category, g]) => ({ category, count: g.count, avg: g.n > 0 ? g.sum / g.n : null }))
      .sort((a, b) => b.count - a.count);
  }, [result, filteredRows, headers, categoryCol, kpiNumericCol]);

  React.useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [result?.chatHistory]);

  if (!result && !isLoading && !error) {
    return (
       <div className="grid h-full grid-cols-3 gap-6 p-6">
        <div className='col-span-2 space-y-6'>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
        <div className='col-span-1'>
            <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  // Show service status and errors
  if (isLoading || error) {
    return (
      <div className="space-y-6 p-6">
        <ServiceStatusIndicator 
          isLoading={isLoading}
          error={error}
          onRetry={onRetry ? () => handleRetry(onRetry) : undefined}
          retryDisabled={retryDisabled}
        />
        
        {/* Show skeleton content while loading */}
        {isLoading && (
          <div className="grid h-full grid-cols-3 gap-6">
            <div className='col-span-2 space-y-6'>
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
            <div className='col-span-1'>
                <Skeleton className="h-full w-full" />
            </div>
          </div>
        )}
        
        {/* Show previous results if available and there's an error */}
        {error && result && (
          <div className="opacity-50">
            <p className="text-sm text-muted-foreground mb-4">
              Showing previous analysis results while service is unavailable
            </p>
            {/* Continue with normal dashboard rendering */}
          </div>
        )}
      </div>
    );
  }

  const hasNumericColumns = (parsedData?.numericColumns?.length ?? 0) > 0;

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNewQuestion(inputValue.trim());
      setInputValue('');
    }
  };

  const isAiResponding =
    result && result.chatHistory.length > 0 && result.chatHistory[result.chatHistory.length - 1].sender === 'user';

  const ChatPanel = (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="p-6 border-b border-white/20 dark:border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Assistant</CardTitle>
            <CardDescription>Ask questions about your data</CardDescription>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-6" ref={chatContainerRef}>
        <div className="space-y-4">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8 border-2 border-violet-200 dark:border-violet-800">
                  <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs">
                    AI
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm transition-all duration-200 hover:scale-[1.02] ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-lg'
                    : 'bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/50'
                }`}
              >
                <ReactMarkdown className={`prose prose-sm max-w-none ${
                  msg.sender === 'user' ? 'prose-invert' : 'dark:prose-invert'
                } prose-p:my-1 prose-headings:text-sm prose-headings:font-semibold`}>
                  {msg.text}
                </ReactMarkdown>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8 border-2 border-blue-200 dark:border-blue-800">
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border-2 border-violet-200 dark:border-violet-800">
                <AvatarFallback className="bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs">
                  AI
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-3 rounded-2xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-white/30 dark:border-gray-600/50 p-4">
                <LoaderCircle className="h-4 w-4 animate-spin text-violet-600" />
                <span className="text-sm text-muted-foreground animate-pulse">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-6 border-t border-white/20 dark:border-gray-700/50">
        <form onSubmit={handleQuestionSubmit} className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your data..."
              className="pr-12 rounded-xl border-0 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm focus:bg-white dark:focus:bg-gray-800 transition-all"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={!inputValue.trim()}
              className="absolute right-1 top-1 h-8 w-8 p-0 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 dark:from-gray-950 dark:via-blue-950/30 dark:to-indigo-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_24%,rgba(59,130,246,.05)_25%,rgba(59,130,246,.05)_26%,transparent_27%,transparent_74%,rgba(59,130,246,.05)_75%,rgba(59,130,246,.05)_76%,transparent_77%,transparent)] bg-[length:60px_60px]" />
      
      <div className="relative">
        {/* Header Stats */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-white/20 dark:border-gray-800/50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{result?.fileName}</h1>
                    <p className="text-sm text-muted-foreground">
                      {parsedData ? `${parsedData.rows.length.toLocaleString()} rows • ${parsedData.headers.length} columns` : 'Loading data...'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="hidden md:flex">
                  <Copy className="h-4 w-4 mr-2" />
                  Share
                </Button>
                {isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMobileChatOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                )}
              </div>
            </div>
            
            {/* Key Metrics Strip */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Insights Found", value: keyInsights.length, icon: Sparkles, color: "text-violet-600" },
                { label: "Quality Issues", value: dataQualityIssues.length, icon: Shield, color: "text-amber-600" },
                { label: "Notable Rows", value: rowLevelFindings.length, icon: Target, color: "text-emerald-600" },
                { label: "Columns Analyzed", value: columnAnalyses.length, icon: List, color: "text-blue-600" }
              ].map((metric, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-white/30 dark:border-gray-700/50">
                  <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto p-6">
          {/* Service Status Indicator */}
          <div className="mb-6">
            <ServiceStatusIndicator />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            
            {/* Main Analysis Column */}
            <div className="lg:col-span-4 space-y-6 min-w-0">
              
              {/* Tabs Navigation */}
              <Tabs defaultValue="insights" className="w-full h-[calc(100vh-18rem)]">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="insights" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="quality" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Quality
                  </TabsTrigger>
                  <TabsTrigger value="explorer" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Explorer
                  </TabsTrigger>
                </TabsList>

                {/* AI Insights Tab */}
                <TabsContent value="insights" className="h-full overflow-hidden">
                  <div className="h-full overflow-y-auto pr-4 pb-6">
                    {/* AI Insights Hero Card */}
                    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white mb-6">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
                      <CardHeader className="relative">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white/20">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl text-white">Key Insights</CardTitle>
                            <CardDescription className="text-violet-100">
                              AI-powered analysis of your data patterns
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative">
                        <div className="space-y-1">
                          {keyInsights.map((insight, index) => (
                            <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <h4 className="text-white font-semibold text-sm">Insight #{index + 1}</h4>
                              </div>
                              <div className="ml-11 space-y-2">
                                {formatInsight(insight)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Column Analysis Tab */}
                <TabsContent value="analysis" className="h-full overflow-hidden">
                  <div className="h-full overflow-y-auto pr-4 pb-6">
                    <Card className="mb-6">
                      <CardHeader className="flex flex-row items-center gap-3">
                        <List className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle>Column-by-Column Analysis</CardTitle>
                          <CardDescription>
                            Detailed analysis of each significant column in your dataset.
                          </CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {columnAnalyses.map((analysis, index) => (
                          <div key={index} className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-900/20 dark:to-purple-900/20">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                                <BarChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-foreground mb-3">{analysis.columnName}</h4>
                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                  <ReactMarkdown className="prose prose-sm max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed prose-strong:text-foreground dark:prose-invert">
                                    {analysis.description}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {rowLevelFindings.length > 0 && (
                      <Card>
                        <CardHeader className="flex flex-row items-center gap-3">
                          <Target className="h-6 w-6 text-primary" />
                          <div>
                            <CardTitle>Noteworthy Rows</CardTitle>
                            <CardDescription>
                              Specific rows with interesting data points or anomalies.
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ShadcnTable>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Identifier</TableHead>
                                <TableHead>Finding</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rowLevelFindings.map((finding, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{finding.rowIdentifier}</TableCell>
                                  <TableCell>{finding.finding}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </ShadcnTable>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Data Quality Tab */}
                <TabsContent value="quality" className="h-full overflow-hidden">
                  <div className="h-full overflow-y-auto pr-4 pb-6">
                    {dataQualityIssues.length > 0 ? (
                      <Card>
                        <CardHeader className="flex flex-row items-center gap-3">
                          <AlertTriangle className="h-6 w-6 text-destructive" />
                          <div>
                            <CardTitle>Data Quality Check</CardTitle>
                            <CardDescription>
                              Potential issues found in your data and how to fix them.
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {dataQualityIssues.map((quality, index) => (
                              <div key={index} className="rounded-lg border bg-gradient-to-r from-amber-50 to-red-50 p-6 dark:from-amber-900/20 dark:to-red-900/20">
                                <div className="space-y-4">
                                  <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-lg font-semibold text-foreground mb-2">Issue #{index + 1}</h4>
                                      <div className="prose prose-sm max-w-none dark:prose-invert">
                                        <ReactMarkdown className="prose prose-sm max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:my-2 prose-p:leading-relaxed prose-strong:text-foreground dark:prose-invert">
                                          {quality.issue}
                                        </ReactMarkdown>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="ml-14 rounded-md bg-background/60 p-4 border-l-4 border-emerald-500">
                                    <h5 className="mb-2 text-base font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                      <Check className="h-4 w-4" />
                                      Recommended Solution:
                                    </h5>
                                    <div className="prose prose-sm max-w-none dark:prose-invert">
                                      <ReactMarkdown className="prose prose-sm max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:my-1 prose-p:leading-relaxed prose-strong:text-foreground dark:prose-invert">
                                        {quality.recommendation}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="h-full flex items-center justify-center">
                        <CardContent className="text-center py-12">
                          <Check className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                          <CardTitle className="text-2xl text-emerald-600 mb-2">Great Data Quality!</CardTitle>
                          <CardDescription className="text-lg">
                            No significant quality issues were detected in your dataset.
                          </CardDescription>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                {/* Data Explorer Tab */}
                <TabsContent value="explorer" className="h-full overflow-hidden">
                  <div className="h-full overflow-y-auto pr-4 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Sidebar Filters with Accordion */}
                      <Card className="lg:col-span-3 h-fit">
                        <CardHeader>
                          <CardTitle>Filters</CardTitle>
                          <CardDescription>Refine the dataset for all visuals.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Accordion type="multiple" defaultValue={['cat','date','kpi']}>
                            <AccordionItem value="cat">
                              <AccordionTrigger>Category</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pt-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Category column</label>
                                    <Select value={categoryCol} onValueChange={(v) => { setCategoryCol(v); setCategoryValue('All'); }}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select column" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categoricalColumns.map((c) => (
                                          <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Category value</label>
                                    <Select value={categoryValue} onValueChange={setCategoryValue} disabled={!categoryCol}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select value" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="All">All</SelectItem>
                                        {categoryValues.filter(v => v.trim() !== '').map((v) => (
                                          <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="date">
                              <AccordionTrigger>Date</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pt-2">
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Date column</label>
                                    <Select value={dateCol} onValueChange={setDateCol}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select date column" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={NONE}>None</SelectItem>
                                        {categoricalColumns.map((c) => (
                                          <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Start date</label>
                                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={dateCol===NONE} />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">End date</label>
                                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={dateCol===NONE} />
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="kpi">
                              <AccordionTrigger>Metric</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pt-2">
                                  <label className="text-sm font-medium">KPI numeric column</label>
                                  <Select value={kpiNumericCol} onValueChange={setKpiNumericCol}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select numeric column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {numericColumns.map((n) => (
                                        <SelectItem key={n} value={n}>{n}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardContent>
                      </Card>

                      {/* Main Visuals */}
                      <div className="lg:col-span-9">
                        <Tabs defaultValue="overview">
                          <TabsList className="flex w-full flex-wrap">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="distribution">Distribution</TabsTrigger>
                            <TabsTrigger value="trends">Trends</TabsTrigger>
                            <TabsTrigger value="groups">Groups</TabsTrigger>
                            <TabsTrigger value="data">Data</TabsTrigger>
                          </TabsList>

                          <TabsContent value="overview" className="mt-4 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Donut Chart */}
                              <Card className="md:col-span-2">
                                <CardHeader className="flex flex-row items-center justify-between">
                                  <div>
                                    <CardTitle>Distribution: {categoryCol || 'Select a category column'}</CardTitle>
                                    <CardDescription>Click a slice to filter.</CardDescription>
                                  </div>
                                </CardHeader>
                                <CardContent className="h-64">
                                  {categoryCol ? (
                                    <>
                                      <div className="h-48">
                                        <ResponsiveContainer>
                                          <PieChart>
                                            <Pie data={donutDisplayData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}
                                                 onClick={(d: any) => setCategoryValue(String(d.name))}>
                                              {donutDisplayData.map((entry, i) => (
                                                <Cell key={`cell-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} cursor="pointer" />
                                              ))}
                                            </Pie>
                                            <Tooltip />
                                          </PieChart>
                                        </ResponsiveContainer>
                                      </div>
                                      <div className="mt-2 max-h-24 overflow-y-auto rounded-md border p-2">
                                        <div className="flex flex-wrap gap-2">
                                          {donutDisplayData.map((d, i) => {
                                            const total = donutDisplayData.reduce((s, x) => s + x.value, 0) || 1;
                                            const pct = ((d.value / total) * 100).toFixed(1);
                                            return (
                                              <span key={d.name+i} className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs bg-background">
                                                <span className="h-2 w-2 rounded-full" style={{backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length]}} />
                                                <span className="truncate max-w-[10rem]" title={`${d.name} • ${d.value} (${pct}%)`}>{d.name}</span>
                                                <span className="text-muted-foreground">{pct}%</span>
                                              </span>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">Select a category column</div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* KPI Card */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>KPI: Average of {kpiNumericCol || '—'}</CardTitle>
                                  <CardDescription>Computed on filtered rows</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-4xl font-bold">
                                    {kpiAverage == null ? '—' : Number(kpiAverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Monthly Stacked Bar Chart */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Monthly counts{dateCol !== NONE ? '' : ' (no date column selected)'}</CardTitle>
                                <CardDescription>Stacked by {categoryCol || 'category'}</CardDescription>
                              </CardHeader>
                              <CardContent className="h-80">
                                {dateCol !== NONE ? (
                                  monthlyStacked.length > 0 ? (
                                    <ResponsiveContainer>
                                      <RechartsBarChart data={monthlyStacked}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        {barKeys.map((cv, i) => (
                                          <Bar key={cv} dataKey={cv} stackId="a" fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} onClick={() => setCategoryValue(cv)} />
                                        ))}
                                      </RechartsBarChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">No monthly data found for the selected date column.</div>
                                  )
                                ) : (
                                  <div className="flex h-full items-center justify-center text-muted-foreground">Select a date column to see monthly trends</div>
                                )}
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="trends" className="mt-4 space-y-6">
                            {/* Numeric Trend Chart */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Numeric Trend</CardTitle>
                                <CardDescription>
                                  {hasNumericColumns ? 'Visualize trends for numeric columns in your data.' : 'No numeric columns were found to visualize.'}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-4 flex items-center gap-4">
                                  <Select value={selectedColumn} onValueChange={setSelectedColumn} disabled={!hasNumericColumns}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {parsedData?.numericColumns?.map((col) => (
                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                      )) || []}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                                    <Button variant={chartType === 'line' ? 'secondary' : 'ghost'} size="sm" onClick={() => setChartType('line')} disabled={!hasNumericColumns}>
                                      <LineChartIcon className="mr-2 h-4 w-4" />
                                      Line
                                    </Button>
                                    <Button variant={chartType === 'bar' ? 'secondary' : 'ghost'} size="sm" onClick={() => setChartType('bar')} disabled={!hasNumericColumns}>
                                      <BarChart className="mr-2 h-4 w-4" />
                                      Bar
                                    </Button>
                                  </div>
                                </div>
                                <div className="h-[350px] w-full">
                                  {hasNumericColumns && selectedColumn ? (
                                    <ResponsiveContainer>
                                      {chartType === 'line' ? (
                                        <LineChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="name" />
                                          <YAxis />
                                          <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                                          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" name={selectedColumn} />
                                        </LineChart>
                                      ) : (
                                        <RechartsBarChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="name" />
                                          <YAxis />
                                          <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }} />
                                          <Bar dataKey="value" fill="hsl(var(--primary))" name={selectedColumn} />
                                        </RechartsBarChart>
                                      )}
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                                      <p className="text-muted-foreground">{hasNumericColumns ? 'Select a column to display a chart.' : 'Your spreadsheet does not contain any numeric columns to visualize.'}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="groups" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Grouped statistics by {categoryCol || '—'}</CardTitle>
                                <CardDescription>Count and average of selected numeric</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="overflow-auto">
                                  <ShadcnTable>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{categoryCol || 'Category'}</TableHead>
                                        <TableHead className="text-right">Count</TableHead>
                                        <TableHead className="text-right">Avg {kpiNumericCol || ''}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {groupedStats.map((row) => (
                                        <TableRow key={row.category} className="hover:bg-muted/50 cursor-pointer" onClick={() => setCategoryValue(row.category)}>
                                          <TableCell>{row.category}</TableCell>
                                          <TableCell className="text-right">{row.count.toLocaleString()}</TableCell>
                                          <TableCell className="text-right">{row.avg == null ? '—' : Number(row.avg).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </ShadcnTable>
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>

                          <TabsContent value="data" className="mt-4">
                            <Card>
                              <CardHeader>
                                <CardTitle>Raw Data</CardTitle>
                                <CardDescription>A preview of the first 100 rows of your spreadsheet.</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="max-h-[500px] overflow-auto rounded-lg border">
                                  <ShadcnTable>
                                    <TableHeader className="sticky top-0 bg-muted">
                                      <TableRow>
                                        {parsedData?.headers?.map((header) => (
                                          <TableHead key={header}>{header}</TableHead>
                                        )) || []}
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {filteredRows.slice(0, 100).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                          {row.map((cell, cellIndex) => (
                                            <TableCell key={cellIndex}>{typeof cell === 'number' ? cell.toLocaleString() : String(cell)}</TableCell>
                                          ))}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </ShadcnTable>
                                </div>
                              </CardContent>
                            </Card>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Chat Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-32 h-[calc(100vh-16rem)]">
                <Card className="h-full border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                  {ChatPanel}
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat button and bottom sheet for mobile */}
      {isMobile && (
        <Sheet open={mobileChatOpen} onOpenChange={setMobileChatOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open chat"
              className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-primary/40 active:scale-95 transition-transform"
            >
              <MessageSquare className="mx-auto h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] p-0">
            <div className="flex h-full flex-col">
              {ChatPanel}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
