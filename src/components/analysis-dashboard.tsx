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
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AnalysisResult } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

interface AnalysisDashboardProps {
  result: AnalysisResult | null;
  onNewQuestion: (question: string) => void;
}

export default function AnalysisDashboard({
  result,
  onNewQuestion,
}: AnalysisDashboardProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [selectedColumn, setSelectedColumn] = React.useState<string>('');
  const [chartType, setChartType] = React.useState<'line' | 'bar'>('line');
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (result?.parsedData.numericColumns && result.parsedData.numericColumns.length > 0) {
      setSelectedColumn(result.parsedData.numericColumns[0]);
    } else {
      setSelectedColumn('');
    }
  }, [result]);

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
    result.chatHistory[result.chatHistory.length - 1].sender === 'user';

  return (
    <div className="grid h-full grid-cols-1 md:grid-cols-3">
        {/* Main content */}
        <div className="col-span-1 md:col-span-2 md:overflow-y-auto">
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
                    <ul className="space-y-3">
                        {keyInsights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="mt-1 h-4 w-4 flex-shrink-0 text-success" />
                            <p className="text-sm font-medium">{insight}</p>
                        </li>
                        ))}
                    </ul>
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
                    {columnAnalyses.map((analysis, index) => (
                        <div key={index} className="rounded-lg border bg-background p-4">
                        <h4 className="font-semibold">{analysis.columnName}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {analysis.description}
                        </p>
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
                
                {dataQualityIssues.length > 0 && (
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
                    </CardContent>
                </Card>
                )}
                </TabsContent>
                <TabsContent value="explorer" className="mt-4 space-y-6">
                    <Card>
                        <CardHeader>
                        <CardTitle>Data Visualization</CardTitle>
                        <CardDescription>
                           {hasNumericColumns ? "Visualize trends for numeric columns in your data." : "No numeric columns were found to visualize."}
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <div className="mb-4 flex items-center gap-4">
                            <Select
                            value={selectedColumn}
                            onValueChange={setSelectedColumn}
                            disabled={!hasNumericColumns}
                            >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select a column" />
                            </SelectTrigger>
                            <SelectContent>
                                {parsedData.numericColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                    {col}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 rounded-md bg-muted p-1">
                            <Button
                                variant={chartType === 'line' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setChartType('line')}
                                disabled={!hasNumericColumns}
                            >
                                <LineChartIcon className="mr-2 h-4 w-4" />
                                Line
                            </Button>
                            <Button
                                variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setChartType('bar')}
                                disabled={!hasNumericColumns}
                            >
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
                                    <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                    />
                                    <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="hsl(var(--primary))"
                                    name={selectedColumn}
                                    />
                                </LineChart>
                                ) : (
                                <RechartsBarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "var(--radius)",
                                    }}
                                    />
                                    <Bar dataKey="value" fill="hsl(var(--primary))" name={selectedColumn} />
                                </RechartsBarChart>
                                )}
                            </ResponsiveContainer>
                            ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                                <p className="text-muted-foreground">
                                    {hasNumericColumns ? "Select a column to display a chart." : "Your spreadsheet does not contain any numeric columns to visualize."}
                                </p>
                            </div>
                            )}
                        </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                        <CardTitle>Raw Data</CardTitle>
                        <CardDescription>
                            A preview of the first 100 rows of your spreadsheet.
                        </CardDescription>
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
                                {parsedData.rows.slice(0, 100).map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                    <TableCell key={cellIndex}>
                                        {typeof cell === 'number'
                                        ? cell.toLocaleString()
                                        : cell}
                                    </TableCell>
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

        {/* Chat sidebar */}
        <div className="col-span-1 flex flex-col bg-background border-l">
            <div className="flex-1 p-6 flex flex-col">
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
                disabled={isAiResponding}
                />
                <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim() || isAiResponding}
                >
                <ArrowRight className="h-4 w-4" />
                </Button>
            </form>
            </div>
        </div>
    </div>
  );
}
