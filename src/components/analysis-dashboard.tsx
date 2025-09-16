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
import { useIsMobile } from '@/hooks/use-mobile';
import type { AnalysisResult } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  onNewQuestion: (question: string) => void;
}

// Helpers
function getColumnIndex(headers: string[], name: string) {
  return headers.indexOf(name);
}

function tryParseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  const str = String(v).trim();
  if (!str || str.length < 6) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
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
}: AnalysisDashboardProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [selectedColumn, setSelectedColumn] = React.useState<string>('');
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mobileChatOpen, setMobileChatOpen] = React.useState(false);

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

  if (!result) {
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

  const { summary, parsedData, chatHistory } = result;
  const { keyInsights, columnAnalyses, rowLevelFindings, dataQualityIssues } = summary;
  const hasNumericColumns = parsedData.numericColumns.length > 0;

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onNewQuestion(inputValue.trim());
      setInputValue('');
    }
  };

  const chartData = selectedColumn
    ? parsedData.rows.map((row, index) => ({
        name: `Row ${index + 1}`,
        value: row[parsedData.headers.indexOf(selectedColumn)],
      }))
    : [];

  const isAiResponding =
    result.chatHistory.length > 0 &&
    result.chatHistory[result.chatHistory.length - 1].sender === 'user';

  const ChatPanel = (
    <div className="flex-1 p-6 flex flex-col min-h-0">
      <CardTitle>Ask AI</CardTitle>
      <CardDescription className='mb-4'>Ask follow-up questions about your data.</CardDescription>

      <ScrollArea className="flex-1 -mx-6 px-6" ref={chatContainerRef}>
        <div className="space-y-4 pr-4">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : ''
              }`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback>
                    <BrainCircuit className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-0">
                  {msg.text}
                </ReactMarkdown>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback>
                    <User className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isAiResponding && (
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback>
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center space-x-2 rounded-lg bg-muted p-3">
                <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm italic text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleQuestionSubmit}
        className="mt-4 flex items-center gap-2 border-t pt-4"
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="e.g., What is the total profit?"
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!inputValue.trim()}>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-12">
      {/* Main content */}
      <div className="col-span-1 md:col-span-9 overflow-y-auto">
        <div className="p-6">
          <Tabs defaultValue="dashboard">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dashboard">
                <BrainCircuit className="mr-2 h-4 w-4" />
                AI Analysis
              </TabsTrigger>
              <TabsTrigger value="explorer">
                <FileSearch className="mr-2 h-4 w-4" />
                Data Explorer
              </TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-6 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Key Insights</CardTitle>
                    <CardDescription>
                      The most important takeaways from your data.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {keyInsights.length === 0 ? (
                    <div className="space-y-3 py-2">
                      <Skeleton className="h-5 w-4/5" />
                      <Skeleton className="h-5 w-full" />
                      <Skeleton className="h-5 w-5/6" />
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {keyInsights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="mt-1 h-4 w-4 flex-shrink-0 text-green-500" />
                          <p className="text-sm font-medium">{insight}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center gap-3">
                  <List className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Column-by-Column Analysis</CardTitle>
                    <CardDescription>
                      A detailed look at each significant column.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {columnAnalyses.length === 0 ? (
                    <div className="space-y-4 py-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : (
                    columnAnalyses.map((analysis, index) => (
                      <div key={index} className="rounded-lg border bg-background p-4">
                        <h4 className="font-semibold">{analysis.columnName}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {analysis.description}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

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
                  {rowLevelFindings.length === 0 ? (
                    <div className="space-y-2 py-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
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
                  )}
                </CardContent>
              </Card>

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
                  {dataQualityIssues.length === 0 ? (
                     <div className="space-y-2 py-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <ShadcnTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Issue</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataQualityIssues.map((quality, index) => (
                          <TableRow key={index}>
                            <TableCell>{quality.issue}</TableCell>
                            <TableCell>{quality.recommendation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </ShadcnTable>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Explorer with Filters and New Visuals */}
            <TabsContent value="explorer" className="mt-6">
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

                {/* Main Visuals in nested tabs */}
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
                        {/* Donut */}
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

                        {/* KPI */}
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

                      {/* Monthly stacked bar */}
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

                    <TabsContent value="distribution" className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Category Distribution</CardTitle>
                          <CardDescription>Breakdown of {categoryCol || 'category'} across filtered rows</CardDescription>
                        </CardHeader>
                        <CardContent className="h-96">
                          {categoryCol ? (
                            <>
                              <div className="h-72">
                                <ResponsiveContainer>
                                  <PieChart>
                                    <Pie data={donutDisplayData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}
                                         onClick={(d: any) => setCategoryValue(String(d.name))}>
                                      {donutDisplayData.map((entry, i) => (
                                        <Cell key={`cell2-${i}`} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} cursor="pointer" />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="mt-2 max-h-28 overflow-y-auto rounded-md border p-2">
                                <div className="flex flex-wrap gap-2">
                                  {donutDisplayData.map((d, i) => {
                                    const total = donutDisplayData.reduce((s, x) => s + x.value, 0) || 1;
                                    const pct = ((d.value / total) * 100).toFixed(1);
                                    return (
                                      <span key={d.name+'-2-'+i} className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs bg-background">
                                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length]}} />
                                        <span className="truncate max-w-[12rem]" title={`${d.name} • ${d.value} (${pct}%)`}>{d.name}</span>
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
                    </TabsContent>

                    <TabsContent value="trends" className="mt-4 space-y-6">
                      {/* Monthly stacked bar */}
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

                      {/* Existing simple chart */}
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
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select a column" />
                              </SelectTrigger>
                              <SelectContent>
                                {parsedData.numericColumns.map((col) => (
                                  <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
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
                                  {parsedData.headers.map((header) => (
                                    <TableHead key={header}>{header}</TableHead>
                                  ))}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Chat sidebar - hidden on mobile */}
      <div className="hidden md:flex col-span-1 md:col-span-3 flex-col bg-background border-l h-screen">
        {ChatPanel}
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
