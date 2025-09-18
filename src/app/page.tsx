'use client';

import * as React from 'react';
import { getChatResponseAction, getSummaryActionOptimized, getSummaryActionSmart, getSummaryActionStreaming, getSummaryActionMulti, getQuickSummaryAction, getAnomalyDetectionAction } from '@/app/actions';
import AnalysisDashboard from '@/components/analysis-dashboard';
import FileUploader from '@/components/file-uploader';
import { Logo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type {
  AnalysisResult,
  ChatMessage,
  Metrics,
  ParsedData,
  RecentFile,
  PartialAISummary,
} from '@/lib/types';
import { Download, ShieldCheck, UploadCloud, BrainCircuit, MessageSquare, ArrowRight, History, Trash2, FileText, LoaderCircle, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';

const loadingMessages = [
  'Reading your spreadsheet...',
  'Extracting insights in parallel...',
  'Analyzing columns and patterns...',
  'Checking for outliers and anomalies...',
  'Performing quality checks...',
  'Finalizing analysis...',
];

export default function Home() {
  const [analysisResult, setAnalysisResult] =
    React.useState<AnalysisResult | null>(null);
  const [partialResult, setPartialResult] = 
    React.useState<PartialAISummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState(loadingMessages[0]);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const fileUploaderRef = React.useRef<{ trigger: () => void }>(null);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [welcomeStep, setWelcomeStep] = React.useState(0);
  const [recentFiles, setRecentFiles] = React.useState<RecentFile[]>([]);
  // Dynamic progress and ETA
  const [progressPhase, setProgressPhase] = React.useState<'idle'|'preparing'|'reading'|'combining'|'analyzing'|'finalizing'>('idle');
  const [progressCurrent, setProgressCurrent] = React.useState<number>(0);
  const [progressTotal, setProgressTotal] = React.useState<number>(0);
  const [etaMs, setEtaMs] = React.useState<number>(0);
  const analysisEtaTimer = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    try {
      const hasVisited = localStorage.getItem('hasVisited');
      if (!hasVisited) {
        setShowWelcome(true);
        localStorage.setItem('hasVisited', 'true');
      }
    } catch {}
    loadRecentFiles();
  }, []);

  const loadRecentFiles = () => {
    try {
      const raw = localStorage.getItem('recentFiles');
      if (!raw) {
        setRecentFiles([]);
        return;
      }
      const files = JSON.parse(raw);
      if (Array.isArray(files)) setRecentFiles(files);
      else setRecentFiles([]);
    } catch {
      setRecentFiles([]);
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      let i = 0;
      setLoadingMessage(loadingMessages[i]);
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 2000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading]);

  const handleFileProcess = async ({
    parsedData,
    stringData,
    metrics,
    errors,
    fileName,
    documents,
    combinedParsedData,
    combinedStringData,
    combinedMetrics,
    fileNames,
  }: {
    parsedData: ParsedData;
    stringData: string;
    metrics: Metrics;
    errors: string[];
    fileName: string;
    documents: any[];
    combinedParsedData: ParsedData;
    combinedStringData: string;
    combinedMetrics: Metrics;
    fileNames: string[];
  }) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    if (errors.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Error processing file',
        description: errors.join(' '),
      });
    }

    try {
        const multi = documents && documents.length > 1;

        if (multi) {
          // Start ETA based on combined rows and doc count
          const rowsForEta = (combinedParsedData?.rows?.length ?? parsedData.rows.length) as number;
          const docsForEta = documents?.length ?? 1;
          startAnalysisETA(rowsForEta, docsForEta);
          const { combinedSummary, perDoc, error: multiErr } = await getSummaryActionMulti(
            documents.map((d: any) => ({ fileName: d.fileName, stringData: d.stringData })),
            combinedStringData
          );
          clearAnalysisETA();
          if (multiErr) throw new Error(multiErr);

          const id = new Date().toISOString();
          const createdAt = new Date().toISOString();
          const filesLabel = `${fileNames.length} documents: ${fileNames.slice(0, 2).join(', ')}${fileNames.length > 2 ? '…' : ''}`;

          const result: AnalysisResult = {
            id,
            fileName: filesLabel,
            createdAt,
            parsedData,
            stringData,
            metrics,
            documents,
            combinedParsedData,
            combinedStringData,
            combinedMetrics,
            documentSummaries: perDoc,
            combinedSummary,
            summary: combinedSummary,
            chatHistory: [
              {
                sender: 'ai',
                text: `Analyzed ${fileNames.length} documents. Ask a question and I will cite sources in the answer.`,
              },
            ],
          };

          setAnalysisResult(result);
          saveRecentFile({ ...result, summary: combinedSummary });
        } else {
          // Single document - use smart analysis that auto-detects data type
          const rowsForEta = parsedData.rows.length;
          startAnalysisETA(rowsForEta, 1);
          
          // Use the smart action that detects data type and applies specialized analysis
          const summaryResult = await getSummaryActionSmart(
            stringData, 
            parsedData.headers
          );
          clearAnalysisETA();
          
          if (summaryResult.error) {
            throw new Error(summaryResult.error);
          }
          
          // Show cache hit notification
          if (summaryResult.fromCache) {
            toast({
              title: 'Analysis Retrieved',
              description: 'Found cached analysis for this file - instant results!',
            });
          }
          
          // Show specialized analysis mode notification
          if (summaryResult.analysisMode && summaryResult.analysisMode !== 'general') {
            toast({
              title: 'Smart Analysis Applied',
              description: `Detected ${summaryResult.analysisMode.replace('_', ' ')} data - using specialized insights!`,
            });
          }
          
          const result: AnalysisResult = {
            id: new Date().toISOString(),
            fileName,
            createdAt: new Date().toISOString(),
            parsedData,
            stringData,
            metrics,
            summary: summaryResult.summary,
            chatHistory: [
              {
                sender: 'ai',
                text: summaryResult.analysisMode && summaryResult.analysisMode !== 'general' 
                  ? `Hello! I've analyzed your ${summaryResult.analysisMode.replace('_', ' ')} data using specialized insights. I found key patterns, trends, and actionable recommendations. What specific questions do you have?`
                  : `Hello! I've analyzed your spreadsheet and broken it down into key insights, column-specific details, and data quality checks. What specific questions do you have? You can also ask for a forecast (e.g., "project sales for next quarter").`,
              },
            ],
          };
          setAnalysisResult(result);
          saveRecentFile(result);
        }

    } catch (e: any) {
      const errorMessage =
        e.message || 'An unexpected error occurred during analysis.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecentFile = (result: AnalysisResult) => {
    try {
      const currentRaw = localStorage.getItem('recentFiles');
      const currentFiles: RecentFile[] = currentRaw ? JSON.parse(currentRaw) : [];
      const newFile: RecentFile = {
        id: result.id,
        fileName: result.fileName,
        createdAt: result.createdAt,
        summary: result.summary.keyInsights.slice(0, 2).join(' '),
      };
      const updatedFiles = [newFile, ...currentFiles.filter(f => f.id !== result.id)].slice(0, 10);
      // Store a slim index + the full analysis separately
      localStorage.setItem('recentFiles', JSON.stringify(updatedFiles));
      // Guard against quota errors
      try {
        localStorage.setItem(`analysis_${result.id}`, JSON.stringify(result));
      } catch {
        // If quota exceeded, drop oldest and retry once
        const trimmed = updatedFiles.slice(0, Math.max(0, updatedFiles.length - 1));
        localStorage.setItem('recentFiles', JSON.stringify(trimmed));
        try { localStorage.setItem(`analysis_${result.id}`, JSON.stringify(result)); } catch {}
      }
    } catch {}
    loadRecentFiles();
  }

  const loadAnalysis = (id: string) => {
    try {
      const data = localStorage.getItem(`analysis_${id}`);
      if (data) {
        setAnalysisResult(JSON.parse(data));
        return;
      }
    } catch {}
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Could not find the analysis data for this file.'
    });
  }
  
  const deleteAnalysis = (id: string) => {
    try { localStorage.removeItem(`analysis_${id}`); } catch {}
    const updatedFiles = recentFiles.filter(f => f.id !== id);
    try { localStorage.setItem('recentFiles', JSON.stringify(updatedFiles)); } catch {}
    setRecentFiles(updatedFiles);
    toast({
      title: 'Deleted',
      description: 'The analysis has been removed from your history.'
    });
  }


  const handleProgress = (p: { phase: 'preparing'|'reading'|'combining'; current?: number; total?: number; etaMs?: number; note?: string }) => {
    setIsLoading(true);
    setProgressPhase(p.phase);
    if (typeof p.current === 'number') setProgressCurrent(p.current);
    if (typeof p.total === 'number') setProgressTotal(p.total!);
    if (typeof p.etaMs === 'number') setEtaMs(p.etaMs!);

    const phaseLabel = p.phase === 'preparing'
      ? 'Preparing documents'
      : p.phase === 'reading'
      ? 'Reading documents'
      : 'Combining documents';

    const countStr = p.total ? ` (${Math.min((p.current||0), p.total)}/${p.total})` : '';
    const etaStr = p.etaMs ? ` • ~${Math.ceil(p.etaMs/1000)}s remaining` : '';
    setLoadingMessage(`${phaseLabel}${countStr}${etaStr}${p.note ? ` • ${p.note}` : ''}`);
  };

  const startAnalysisETA = (rows: number, docs: number) => {
    setProgressPhase('analyzing');
    // Heuristic ETA based on rows and document count
    const predicted = Math.max(2000, Math.min(30000, 500 + rows * 5 + docs * 800));
    const start = Date.now();
    setEtaMs(predicted);
    setLoadingMessage(`Analyzing with AI • ~${Math.ceil(predicted/1000)}s remaining`);
    if (analysisEtaTimer.current) clearInterval(analysisEtaTimer.current);
    analysisEtaTimer.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, predicted - elapsed);
      setEtaMs(remaining);
      setLoadingMessage(`Analyzing with AI • ~${Math.ceil(remaining/1000)}s remaining`);
      if (remaining <= 0 && analysisEtaTimer.current) {
        clearInterval(analysisEtaTimer.current);
        analysisEtaTimer.current = null;
      }
    }, 500);
  };

  const clearAnalysisETA = () => {
    if (analysisEtaTimer.current) {
      clearInterval(analysisEtaTimer.current);
      analysisEtaTimer.current = null;
    }
    setProgressPhase('finalizing');
    setLoadingMessage('Almost done… finalizing');
    setEtaMs(0);
  };

  const handleNewQuestion = async (question: string) => {
    if (!analysisResult) return;

    const newHistory: ChatMessage[] = [
      ...analysisResult.chatHistory,
      { sender: 'user', text: question },
    ];
    setAnalysisResult({ ...analysisResult, chatHistory: newHistory });

    const response = await getChatResponseAction(
      analysisResult.combinedStringData
        ? `You are answering questions about multiple documents. Use the document sections and cite sources in parentheses.\n\n${analysisResult.combinedStringData}`
        : analysisResult.stringData,
      question
    );

    if (response.error) {
      toast({
        variant: 'destructive',
        title: 'Error getting answer',
        description: response.error,
      });
      const errorHistory: ChatMessage[] = [
        ...newHistory,
        {
          sender: 'ai',
          text: 'Sorry, I encountered an error and could not provide a response.',
        },
      ];
      setAnalysisResult({ ...analysisResult, chatHistory: errorHistory });
    } else {
      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { sender: 'ai', text: response.answer as string },
      ];
      setAnalysisResult({ ...analysisResult, chatHistory: updatedHistory });
    }
  };
  
  const exportToPdf = () => {
    if (!analysisResult) return;

    const doc = new jsPDF();
    const { summary, fileName } = analysisResult;
    const combined = (analysisResult as any).combinedSummary || summary;
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    const addText = (text: string, x: number, y: number, options: any = {}) => {
        doc.setFontSize(options.fontSize || 10);
        const splitText = doc.splitTextToSize(text, 180);
        const textHeight = (doc.getTextDimensions(splitText).h)
        
        if (y + textHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            y = margin;
        }

        doc.text(splitText, x, y, options);
        return y + textHeight + 2; 
    };

    doc.setFontSize(18);
    yPos = addText(`AI Analysis Report: ${fileName}`, 10, yPos);
    yPos += 10;

    doc.setFontSize(14);
    yPos = addText('Cross-Document Key Insights', 10, yPos);
    yPos += 5;
    doc.setFontSize(10);
    (combined.keyInsights || summary.keyInsights).forEach((insight: string) => {
        yPos = addText(`- ${insight}`, 15, yPos);
        yPos += 1;
    });
    yPos += 10;

    doc.setFontSize(14);
    yPos = addText('Cross-Document Column-by-Column Analysis', 10, yPos);
    yPos += 5;
    doc.setFontSize(10);
    (combined.columnAnalyses || summary.columnAnalyses).forEach((col: any) => {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFont('helvetica', 'bold');
        yPos = addText(col.columnName, 15, yPos);
        doc.setFont('helvetica', 'normal');
        yPos = addText(col.description, 15, yPos);
        yPos += 5;
    });
    yPos += 5;

    if ((combined.rowLevelFindings || summary.rowLevelFindings).length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14);
        yPos = addText('Cross-Document Noteworthy Rows', 10, yPos);
        yPos += 5;
        doc.setFontSize(10);
        (combined.rowLevelFindings || summary.rowLevelFindings).forEach((row: any) => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont('helvetica', 'bold');
            yPos = addText(row.rowIdentifier, 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos = addText(row.finding, 15, yPos);
            yPos += 5;
        });
        yPos += 5;
    }
    
    if ((combined.dataQualityIssues || summary.dataQualityIssues).length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14);
        yPos = addText('Cross-Document Data Quality Issues', 10, yPos);
        yPos += 5;
        doc.setFontSize(10);
        (combined.dataQualityIssues || summary.dataQualityIssues).forEach((issue: any) => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont('helvetica', 'bold');
            yPos = addText(issue.issue, 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos = addText(issue.recommendation, 15, yPos);
            yPos += 5;
        });
    }

    // Per-document sections
    const docs = (analysisResult as any).documents || [];
    const perDoc = (analysisResult as any).documentSummaries || {};
    if (docs.length > 0 && Object.keys(perDoc).length > 0) {
      doc.addPage();
      yPos = margin;
      doc.setFontSize(16);
      yPos = addText('Per-Document Analysis', 10, yPos);
      yPos += 5;

      for (const d of docs) {
        const sum = perDoc[d.fileName];
        if (!sum) continue;
        doc.setFontSize(14);
        yPos = addText(`Document: ${d.fileName}`, 10, yPos);
        yPos += 3;

        doc.setFontSize(12);
        yPos = addText('Key Insights', 10, yPos);
        doc.setFontSize(10);
        (sum.keyInsights || []).forEach((insight: string) => {
          yPos = addText(`- ${insight}`, 15, yPos);
          yPos += 1;
        });
        yPos += 5;

        doc.setFontSize(12);
        yPos = addText('Column-by-Column Analysis', 10, yPos);
        doc.setFontSize(10);
        (sum.columnAnalyses || []).forEach((col: any) => {
          if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
          doc.setFont('helvetica', 'bold');
          yPos = addText(col.columnName, 15, yPos);
          doc.setFont('helvetica', 'normal');
          yPos = addText(col.description, 15, yPos);
          yPos += 5;
        });
        yPos += 5;

        if ((sum.rowLevelFindings || []).length > 0) {
          if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
          doc.setFontSize(12);
          yPos = addText('Noteworthy Rows', 10, yPos);
          yPos += 5;
          doc.setFontSize(10);
          (sum.rowLevelFindings || []).forEach((row: any) => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont('helvetica', 'bold');
            yPos = addText(row.rowIdentifier, 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos = addText(row.finding, 15, yPos);
            yPos += 5;
          });
          yPos += 5;
        }

        if ((sum.dataQualityIssues || []).length > 0) {
          if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
          doc.setFontSize(12);
          yPos = addText('Data Quality Issues', 10, yPos);
          yPos += 5;
          doc.setFontSize(10);
          (sum.dataQualityIssues || []).forEach((issue: any) => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont('helvetica', 'bold');
            yPos = addText(issue.issue, 15, yPos);
            doc.setFont('helvetica', 'normal');
            yPos = addText(issue.recommendation, 15, yPos);
            yPos += 5;
          });
        }

        yPos += 8;
      }
    }

    doc.save('ai-analysis-report.pdf');
  };

  const resetState = () => {
    setAnalysisResult(null);
    setIsLoading(false);
    setError(null);
  }

  const handleTriggerUpload = () => {
    if (fileUploaderRef.current) {
      fileUploaderRef.current.trigger();
    }
  }

  const renderWelcomeStep = () => {
    switch(welcomeStep) {
      case 0:
        return (
          <>
            <DialogTitle>Welcome to Gridly!</DialogTitle>
            <DialogDescription className='py-4'>Let's walk you through how to get started in a few simple steps.</DialogDescription>
            <div className='flex justify-end'>
              <Button onClick={() => setWelcomeStep(1)}>Next <ArrowRight className='ml-2 h-4 w-4'/></Button>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <DialogTitle>Step 1: Upload Your Spreadsheet</DialogTitle>
            <div className='text-center py-8'>
              <UploadCloud className='h-16 w-16 mx-auto text-primary'/>
              <p className='mt-4 text-muted-foreground'>Click the 'Try it Free' button to upload an Excel or CSV file. Your data is processed securely and is never stored.</p>
            </div>
            <div className='flex justify-between'>
              <Button variant="outline" onClick={() => setWelcomeStep(0)}>Back</Button>
              <Button onClick={() => setWelcomeStep(2)}>Next <ArrowRight className='ml-2 h-4 w-4'/></Button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <DialogTitle>Step 2: Get Instant AI Analysis</DialogTitle>
             <div className='text-center py-8'>
              <BrainCircuit className='h-16 w-16 mx-auto text-primary'/>
              <p className='mt-4 text-muted-foreground'>Our AI will instantly analyze your data, providing key insights, column breakdowns, and data quality checks.</p>
            </div>
            <div className='flex justify-between'>
              <Button variant="outline" onClick={() => setWelcomeStep(1)}>Back</Button>
              <Button onClick={() => setWelcomeStep(3)}>Next <ArrowRight className='ml-2 h-4 w-4'/></Button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <DialogTitle>Step 3: Ask Follow-Up Questions</DialogTitle>
             <div className='text-center py-8'>
              <MessageSquare className='h-16 w-16 mx-auto text-primary'/>
              <p className='mt-4 text-muted-foreground'>Use the chat interface to ask specific questions, request forecasts, or dive deeper into your data.</p>
            </div>
            <div className='flex justify-between'>
              <Button variant="outline" onClick={() => setWelcomeStep(2)}>Back</Button>
              <Button onClick={() => setShowWelcome(false)}>Get Started!</Button>
            </div>
          </>
        );
    }
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary">
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome Guide</DialogTitle>
          </DialogHeader>
          {renderWelcomeStep()}
        </DialogContent>
      </Dialog>
      <header className="flex h-16 items-center justify-between px-6 border-b bg-background">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-12 w-auto" />
        </div>
        <div className="flex items-center gap-2">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                        <History className="mr-2 h-4 w-4" />
                        Recents
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Recent Analyses</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-4">
                        {recentFiles.length > 0 ? recentFiles.map(file => (
                            <div key={file.id} className="p-3 rounded-lg border bg-card hover:bg-muted transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <button className='text-left' onClick={() => loadAnalysis(file.id)}>
                                            <p className="font-semibold">{file.fileName}</p>
                                            <p className="text-sm text-muted-foreground">{new Date(file.createdAt).toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground mt-1 truncate">{file.summary}</p>
                                        </button>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAnalysis(file.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground py-10">
                                <FileText className='mx-auto h-12 w-12 mb-4'/>
                                <p>No recent files yet.</p>
                                <p>Your analyzed files will appear here.</p>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
            {analysisResult && (
                <>
                    <Button variant="outline" size="sm" onClick={exportToPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                    </Button>
                    <Button variant="default" size="sm" onClick={resetState}>Upload New File</Button>
                </>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {!analysisResult ? (
          <div className="relative min-h-screen">
            {/* Hero Section with Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-blue-600/20 to-emerald-600/20 dark:from-violet-600/10 dark:via-blue-600/10 dark:to-emerald-600/10" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_24%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_26%,transparent_27%,transparent_74%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05)_76%,transparent_77%,transparent)] bg-[length:30px_30px]" />
            
            <div className="relative container mx-auto max-w-6xl py-16 px-6">
              {/* Main Hero Content */}
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-blue-100 dark:from-violet-900/30 dark:to-blue-900/30 text-sm font-medium text-violet-700 dark:text-violet-300">
                    <Sparkles className="h-4 w-4" />
                    AI-Powered Analysis
                  </div>
                  <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    Gridly
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Transform your spreadsheets into <span className="text-violet-600 font-semibold">actionable insights</span> in seconds with AI-powered analysis
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-3 mt-8">
                  {[
                    { icon: UploadCloud, text: "Instant Upload", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                    { icon: BrainCircuit, text: "AI Analysis", color: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
                    { icon: MessageSquare, text: "Chat Interface", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
                    { icon: ShieldCheck, text: "Secure & Private", color: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" }
                  ].map((feature, index) => (
                    <div key={index} className={`flex items-center gap-2 px-4 py-2 rounded-full ${feature.color} transition-transform hover:scale-105`}>
                      <feature.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Upload Section */}
                <div className="mt-12">
                  <FileUploader ref={fileUploaderRef} onProcess={handleFileProcess} onProgress={handleProgress} isLoading={isLoading} loadingMessage={loadingMessage}>
                    <div className="space-y-6">
                      <Button 
                        size="lg" 
                        onClick={handleTriggerUpload} 
                        disabled={isLoading}
                        className="h-14 px-8 text-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40"
                      >
                        {isLoading ? (
                          <>
                            <LoaderCircle className="mr-3 h-5 w-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="mr-3 h-5 w-5" />
                            Upload & Analyze
                          </>
                        )}
                      </Button>
                      
                      {/* Loading Progress */}
                      {isLoading && (
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{loadingMessage}</span>
                            {etaMs > 0 && (
                              <span className="text-violet-600 font-medium">
                                ~{Math.ceil(etaMs/1000)}s
                              </span>
                            )}
                          </div>
                          <Progress 
                            value={progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : undefined} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Secure processing • No data stored • GDPR compliant
                      </p>
                    </div>
                  </FileUploader>
                </div>
              </div>

              {/* Feature Grid */}
              <div className="mt-24 grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: BrainCircuit,
                    title: "Smart AI Analysis",
                    description: "Advanced AI extracts key insights, trends, and anomalies from your data automatically",
                    color: "violet"
                  },
                  {
                    icon: MessageSquare,
                    title: "Interactive Chat",
                    description: "Ask questions in natural language and get instant, contextual answers about your data",
                    color: "blue"
                  },
                  {
                    icon: Download,
                    title: "Export Reports",
                    description: "Generate professional PDF reports with charts, insights, and recommendations",
                    color: "emerald"
                  }
                ].map((feature, index) => (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-2xl blur-xl transition-all duration-500 group-hover:blur-2xl" />
                    <div className="relative p-8 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/10">
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${feature.color === 'violet' ? 'from-violet-500 to-purple-500' : feature.color === 'blue' ? 'from-blue-500 to-cyan-500' : 'from-emerald-500 to-teal-500'} mb-4`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full">
            <AnalysisDashboard
              result={analysisResult}
              onNewQuestion={handleNewQuestion}
            />
          </div>
        )}
      </main>
      
      <footer className="mt-auto border-t bg-background py-6">
        <div className="container mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground">About</a>
          <a href="#" className="hover:text-foreground">Pricing</a>
          <a href="#" className="hover:text-foreground">Contact</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
