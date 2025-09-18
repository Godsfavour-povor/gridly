'use server';

import { aiForecasting } from '@/ai/flows/ai-forecasting';
import { aiQuestionAnswering } from '@/ai/flows/ai-question-answering';
import { summarizeSpreadsheet } from '@/ai/flows/ai-spreadsheet-summary';
import { parallelSpreadsheetAnalysis } from '@/ai/flows/ai-parallel-summary';
import { streamingSpreadsheetAnalysis, chunkedSpreadsheetAnalysis } from '@/ai/flows/ai-streaming-summary';
import { detectDataType } from '@/ai/flows/ai-data-detection';
import { generateQuickSummary, generateSalesAnalysis, generateSurveyAnalysis } from '@/ai/flows/ai-specialized-analysis';
import { generateOperationsAnalysis, generateInventoryAnalysis, generateAnomalyDetection, generateReport } from '@/ai/flows/ai-advanced-analysis';
import type { AISummary, PartialAISummary } from '@/lib/types';
import { withRetry, getServiceStatus } from '@/ai/flows/ai-retry-utils';
import { createHash } from 'crypto';

// Enhanced error handling utility
function getEnhancedErrorMessage(error: any): string {
  const errorMessage = error.message?.toLowerCase() || '';
  const serviceStatus = getServiceStatus();
  
  if (error.message?.includes('API key') || error.message?.includes('authentication')) {
    return 'Google AI API key is missing or invalid. Please add GOOGLE_GENAI_API_KEY to your .env.local file.';
  }
  
  if (errorMessage.includes('overloaded') || errorMessage.includes('service unavailable')) {
    if (serviceStatus.circuitBreakerOpen) {
      return 'The AI service is temporarily offline due to persistent overload. We\'re working to restore normal operations. Please try again in a few minutes.';
    }
    return `The AI service is currently experiencing high demand and is temporarily overloaded. ` +
           `This is common during peak hours. Please wait a moment and try again. ` +
           `(Attempt ${serviceStatus.consecutiveFailures}/5)`;
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return 'API usage limit reached. This resets automatically. Please try again in an hour or check your Google AI usage quotas.';
  }
  
  if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
    return 'Too many requests sent to the AI service. Please wait a moment before trying again.';
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('502') || errorMessage.includes('504')) {
    return 'The AI service is taking longer than expected to respond. This usually resolves quickly. Please try again.';
  }
  
  // Generic fallback with helpful context
  if (error.message) {
    return `Unable to process your request: ${error.message}. If this problem persists, please refresh the page and try again.`;
  }
  
  return 'An unexpected error occurred while processing your data. Please try again or refresh the page.';
}

// Simple in-memory cache for identical uploads
const analysisCache = new Map<string, AISummary>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const cacheTimestamps = new Map<string, number>();

function getCacheKey(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(data).digest('hex');
}

function getCachedAnalysis(data: string): AISummary | null {
  const key = getCacheKey(data);
  const timestamp = cacheTimestamps.get(key);
  
  if (timestamp && Date.now() - timestamp < CACHE_TTL) {
    return analysisCache.get(key) || null;
  }
  
  // Clean expired cache
  if (timestamp) {
    analysisCache.delete(key);
    cacheTimestamps.delete(key);
  }
  
  return null;
}

function setCachedAnalysis(data: string, result: AISummary): void {
  const key = getCacheKey(data);
  analysisCache.set(key, result);
  cacheTimestamps.set(key, Date.now());
  
  // Limit cache size
  if (analysisCache.size > 100) {
    const oldestKey = analysisCache.keys().next().value;
    if (oldestKey) {
      analysisCache.delete(oldestKey);
      cacheTimestamps.delete(oldestKey);
    }
  }
}

// New optimized action with caching and parallel processing
export async function getSummaryActionOptimized(spreadsheetData: string): Promise<{ summary: AISummary; error?: string; fromCache?: boolean }> {
  try {
    if (!spreadsheetData) {
      throw new Error('Spreadsheet data is empty.');
    }

    // Check cache first
    const cached = getCachedAnalysis(spreadsheetData);
    if (cached) {
      console.log('Returning cached analysis result');
      return { summary: cached, fromCache: true };
    }

    let result: AISummary;
    
    try {
      // Try parallel processing first
      result = await parallelSpreadsheetAnalysis(spreadsheetData);
      console.log('Used parallel analysis successfully');
    } catch (parallelError) {
      console.warn('Parallel analysis failed, falling back to original:', parallelError);
      // Fallback to original single analysis
      result = await summarizeSpreadsheet({ spreadsheetData });
      console.log('Used fallback analysis successfully');
    }
    
    // Cache the result
    setCachedAnalysis(spreadsheetData, result);
    
    return { summary: result, fromCache: false };
  } catch (error: any) {
    console.error('Error in getSummaryActionOptimized:', error);
    
    return { 
      error: getEnhancedErrorMessage(error),
      summary: {
        keyInsights: [],
        columnAnalyses: [],
        rowLevelFindings: [],
        dataQualityIssues: [],
      }
    };
  }
}

// Streaming action for progressive results
export async function getSummaryActionStreaming(
  spreadsheetData: string,
  onProgress?: (partial: PartialAISummary) => void
): Promise<{ summary: AISummary; error?: string }> {
  try {
    if (!spreadsheetData) {
      throw new Error('Spreadsheet data is empty.');
    }

    // Check cache first
    const cached = getCachedAnalysis(spreadsheetData);
    if (cached) {
      console.log('Returning cached analysis result');
      return { summary: cached };
    }

    const lines = spreadsheetData.split('\n');
    const isLargeDataset = lines.length > 2000;
    
    let result: AISummary;
    
    if (isLargeDataset) {
      result = await chunkedSpreadsheetAnalysis(spreadsheetData, 1000, onProgress);
    } else {
      result = await streamingSpreadsheetAnalysis(spreadsheetData, onProgress);
    }
    
    // Cache the result
    setCachedAnalysis(spreadsheetData, result);
    
    return { summary: result };
  } catch (error: any) {
    console.error('Error in getSummaryActionStreaming:', error);
    return { 
      error: getEnhancedErrorMessage(error),
      summary: {
        keyInsights: [],
        columnAnalyses: [],
        rowLevelFindings: [],
        dataQualityIssues: [],
      }
    };
  }
}

// Smart analysis action that auto-detects data type and applies specialized analysis
export async function getSummaryActionSmart(
  spreadsheetData: string,
  headers: string[],
  sampleData?: string[][]
): Promise<{ summary: AISummary; error?: string; analysisMode?: string; specializedResult?: any; fromCache?: boolean }> {
  try {
    if (!spreadsheetData) {
      throw new Error('Spreadsheet data is empty.');
    }

    // Check cache first
    const cached = getCachedAnalysis(spreadsheetData);
    if (cached) {
      console.log('Returning cached analysis result');
      return { summary: cached, fromCache: true };
    }

    // Detect data type
    const detection = detectDataType(headers, sampleData);
    console.log('Detected data type:', detection.primaryType, 'confidence:', detection.confidence);

    let result: AISummary;
    let specializedResult: any = null;
    
    try {
      // Use specialized analysis if confidence is high enough
      if (detection.confidence > 0.3) {
        switch (detection.primaryType) {
          case 'sales':
            specializedResult = await generateSalesAnalysis(
              spreadsheetData, 
              detection.detectedColumns.numeric.join(', ')
            );
            break;
          case 'survey':
            const textCol = detection.detectedColumns.text[0] || 'feedback';
            specializedResult = await generateSurveyAnalysis(spreadsheetData, textCol);
            break;
          case 'operations':
            specializedResult = await generateOperationsAnalysis(
              spreadsheetData,
              headers.join(', ')
            );
            break;
          case 'inventory':
            specializedResult = await generateInventoryAnalysis(
              spreadsheetData,
              headers.join(', ')
            );
            break;
        }
      }

      // Also generate standard analysis
      result = await parallelSpreadsheetAnalysis(spreadsheetData);
      console.log('Used parallel analysis successfully');
    } catch (parallelError) {
      console.warn('Parallel analysis failed, falling back to original:', parallelError);
      result = await summarizeSpreadsheet({ spreadsheetData });
      console.log('Used fallback analysis successfully');
    }
    
    // Cache the result
    setCachedAnalysis(spreadsheetData, result);
    
    return { 
      summary: result, 
      analysisMode: detection.suggestedMode,
      specializedResult,
      fromCache: false 
    };
  } catch (error: any) {
    console.error('Error in getSummaryActionSmart:', error);
    
    return { 
      error: getEnhancedErrorMessage(error),
      summary: {
        keyInsights: [],
        columnAnalyses: [],
        rowLevelFindings: [],
        dataQualityIssues: [],
      }
    };
  }
}

// Generate quick executive summary
export async function getQuickSummaryAction(
  dataInfo: string,
  metrics: string
): Promise<{ summary: any; error?: string }> {
  try {
    const result = await generateQuickSummary(dataInfo, metrics);
    return { summary: result };
  } catch (error: any) {
    console.error('Error in getQuickSummaryAction:', error);
    return { 
      error: `Failed to generate quick summary: ${error.message || 'Unknown error'}`,
      summary: null
    };
  }
}

// Generate anomaly detection report
export async function getAnomalyDetectionAction(
  spreadsheetData: string,
  numericColumns: string[]
): Promise<{ anomalies: any; error?: string }> {
  try {
    const result = await generateAnomalyDetection(spreadsheetData, numericColumns.join(', '));
    return { anomalies: result };
  } catch (error: any) {
    console.error('Error in getAnomalyDetectionAction:', error);
    return { 
      error: `Failed to detect anomalies: ${error.message || 'Unknown error'}`,
      anomalies: null
    };
  }
}

// Generate PDF report
export async function getReportGenerationAction(
  analysisData: any,
  title: string
): Promise<{ report: any; error?: string }> {
  try {
    const analysisJson = JSON.stringify(analysisData);
    const result = await generateReport(analysisJson, title);
    return { report: result };
  } catch (error: any) {
    console.error('Error in getReportGenerationAction:', error);
    return { 
      error: `Failed to generate report: ${error.message || 'Unknown error'}`,
      report: null
    };
  }
}

// Legacy action (kept for backward compatibility)
export async function getSummaryAction(spreadsheetData: string): Promise<{ summary: AISummary; error?: string }> {
  return getSummaryActionOptimized(spreadsheetData);
}

export async function getChatResponseAction(spreadsheetData: string, question: string) {
  try {
     if (!spreadsheetData || !question) {
      throw new Error('Spreadsheet data or question is empty.');
    }

    const isForecastingQuestion = /forecast|predict|project|next week|next month|next quarter|next year/i.test(question);
    
    if (isForecastingQuestion) {
      const result = await aiForecasting({ spreadsheetData, question });
      const assumptions = result.assumptions.join('\n- ');
      return { answer: `**Forecast:** ${result.forecast}

**Confidence:** ${result.confidence}

**Assumptions:**
- ${assumptions}` };
    } else {
      const result = await aiQuestionAnswering({ spreadsheetData, question });
      return { answer: result.answer };
    }
  } catch (error) {
    console.error('Error in getChatResponseAction:', error);
    return { error: 'Failed to get an answer for your question.' };
  }
}

// Multi-document summaries (combined + per-document) with source-citation instructions
export async function getSummaryActionMulti(
  documents: { fileName: string; stringData: string }[],
  combinedStringData: string
): Promise<{ combinedSummary: AISummary; perDoc: Record<string, AISummary>; error?: string }> {
  try {
    if (!documents || documents.length === 0) {
      throw new Error('No documents provided.');
    }

    // Per-document summaries with source-citation hint
    const perDocEntries = await Promise.all(
      documents.map(async (d) => {
        const decorated = `### Document: ${d.fileName}\n${d.stringData}\n\nWhen citing facts, include "(Source: ${d.fileName})".`;
        const res = await summarizeSpreadsheet({ spreadsheetData: decorated });
        return [d.fileName, res] as const;
      })
    );

    // Combined with explicit instruction to cite sources
    const header = `You are analyzing multiple documents. Each section starts with "### Document: <fileName>".\nWhen you cite facts, append the source document in parentheses. If insights span multiple documents, list all sources.`;
    const combinedDecorated = `${header}\n\n${combinedStringData}`;
    const combinedRes = await summarizeSpreadsheet({ spreadsheetData: combinedDecorated });

    return { combinedSummary: combinedRes, perDoc: Object.fromEntries(perDocEntries) };
  } catch (error: any) {
    console.error('Error in getSummaryActionMulti:', error);
    return {
      error: 'Failed to generate multi-document summaries.',
      combinedSummary: { keyInsights: [], columnAnalyses: [], rowLevelFindings: [], dataQualityIssues: [] },
      perDoc: {},
    };
  }
}