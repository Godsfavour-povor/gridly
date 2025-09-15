'use client';

import * as React from 'react';
import { getChatResponseAction, getSummaryAction } from '@/app/actions';
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
} from '@/lib/types';
import { Download, ShieldCheck, UploadCloud, BrainCircuit, MessageSquare, ArrowRight, History, Trash2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const loadingMessages = [
  'Reading your spreadsheet...',
  'Analyzing the data...',
  'Identifying key trends...',
  'Checking for data quality issues...',
  'Generating insights...',
  'Almost done...',
];

export default function Home() {
  const [analysisResult, setAnalysisResult] =
    React.useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState(loadingMessages[0]);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();
  const fileUploaderRef = React.useRef<{ trigger: () => void }>(null);
  const [showWelcome, setShowWelcome] = React.useState(false);
  const [welcomeStep, setWelcomeStep] = React.useState(0);
  const [recentFiles, setRecentFiles] = React.useState<RecentFile[]>([]);

  React.useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      setShowWelcome(true);
      localStorage.setItem('hasVisited', 'true');
    }
    loadRecentFiles();
  }, []);

  const loadRecentFiles = () => {
    const files = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    setRecentFiles(files);
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
  }: {
    parsedData: ParsedData;
    stringData: string;
    metrics: Metrics;
    errors: string[];
    fileName: string;
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
      const summaryResult = await getSummaryAction(stringData);
      if (summaryResult.error) {
        throw new Error(summaryResult.error);
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
            text: `Hello! I've analyzed your spreadsheet and broken it down into key insights, column-specific details, and data quality checks. What specific questions do you have? You can also ask for a forecast (e.g., "project sales for next quarter").`,
          },
        ],
      };
      
      setAnalysisResult(result);
      saveRecentFile(result);

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
    const currentFiles: RecentFile[] = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    const newFile: RecentFile = {
      id: result.id,
      fileName: result.fileName,
      createdAt: result.createdAt,
      summary: result.summary.keyInsights.slice(0, 2).join(' '),
    };
    const updatedFiles = [newFile, ...currentFiles.filter(f => f.id !== result.id)].slice(0, 10); // Keep last 10
    localStorage.setItem('recentFiles', JSON.stringify(updatedFiles));
    localStorage.setItem(`analysis_${result.id}`, JSON.stringify(result));
    loadRecentFiles();
  }

  const loadAnalysis = (id: string) => {
    const data = localStorage.getItem(`analysis_${id}`);
    if (data) {
      setAnalysisResult(JSON.parse(data));
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not find the analysis data for this file.'
      });
    }
  }
  
  const deleteAnalysis = (id: string) => {
    localStorage.removeItem(`analysis_${id}`);
    const updatedFiles = recentFiles.filter(f => f.id !== id);
    localStorage.setItem('recentFiles', JSON.stringify(updatedFiles));
    setRecentFiles(updatedFiles);
    toast({
      title: 'Deleted',
      description: 'The analysis has been removed from your history.'
    });
  }


  const handleNewQuestion = async (question: string) => {
    if (!analysisResult) return;

    const newHistory: ChatMessage[] = [
      ...analysisResult.chatHistory,
      { sender: 'user', text: question },
    ];
    setAnalysisResult({ ...analysisResult, chatHistory: newHistory });

    const response = await getChatResponseAction(
      analysisResult.stringData,
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
    yPos = addText('Key Insights', 10, yPos);
    yPos += 5;
    doc.setFontSize(10);
    summary.keyInsights.forEach(insight => {
        yPos = addText(`- ${insight}`, 15, yPos);
        yPos += 1;
    });
    yPos += 10;

    doc.setFontSize(14);
    yPos = addText('Column-by-Column Analysis', 10, yPos);
    yPos += 5;
    doc.setFontSize(10);
    summary.columnAnalyses.forEach(col => {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFont(undefined, 'bold');
        yPos = addText(col.columnName, 15, yPos);
        doc.setFont(undefined, 'normal');
        yPos = addText(col.description, 15, yPos);
        yPos += 5;
    });
    yPos += 5;

    if (summary.rowLevelFindings.length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14);
        yPos = addText('Noteworthy Rows', 10, yPos);
        yPos += 5;
        doc.setFontSize(10);
        summary.rowLevelFindings.forEach(row => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont(undefined, 'bold');
            yPos = addText(row.rowIdentifier, 15, yPos);
            doc.setFont(undefined, 'normal');
            yPos = addText(row.finding, 15, yPos);
            yPos += 5;
        });
        yPos += 5;
    }
    
    if (summary.dataQualityIssues.length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = margin; }
        doc.setFontSize(14);
        yPos = addText('Data Quality Issues', 10, yPos);
        yPos += 5;
        doc.setFontSize(10);
        summary.dataQualityIssues.forEach(issue => {
            if (yPos > pageHeight - 30) { doc.addPage(); yPos = margin; }
            doc.setFont(undefined, 'bold');
            yPos = addText(issue.issue, 15, yPos);
            doc.setFont(undefined, 'normal');
            yPos = addText(issue.recommendation, 15, yPos);
            yPos += 5;
        });
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
          {renderWelcomeStep()}
        </DialogContent>
      </Dialog>
      <header className="flex h-16 items-center justify-between px-6 border-b bg-background">
        <div className="flex items-center gap-2 font-semibold">
          <Logo className="h-8 w-auto" />
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

      <main className="flex-1">
        {!analysisResult ? (
          <div className="container mx-auto max-w-4xl py-24 text-center">
            <h1 className="text-5xl font-bold tracking-tighter">
              Summarize spreadsheets in seconds.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Upload Excel/CSV → get instant plain-English summary.
            </p>
            <div className='mt-8'>
              <FileUploader ref={fileUploaderRef} onProcess={handleFileProcess} isLoading={isLoading} loadingMessage={loadingMessage}>
                <Button size="lg" onClick={handleTriggerUpload} disabled={isLoading}>
                  {isLoading ? 'Analyzing...' : 'Try it Free'}
                </Button>
              </FileUploader>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                Secure upload, your data isn't stored.
              </p>
            </div>
          </div>
        ) : (
          <AnalysisDashboard
            result={analysisResult}
            onNewQuestion={handleNewQuestion}
          />
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
