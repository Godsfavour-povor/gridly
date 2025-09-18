'use server';

/**
 * @fileOverview Streaming analysis system for progressive result delivery
 * Provides partial results as they become available for better UX
 */

import { 
  analyzeInsights, 
  analyzeColumns, 
  analyzeRowFindings, 
  analyzeDataQuality 
} from './ai-parallel-summary';
import type { PartialAISummary, AISummary } from '@/lib/types';

export type StreamingCallback = (partial: PartialAISummary) => void;

export async function streamingSpreadsheetAnalysis(
  spreadsheetData: string,
  onProgress?: StreamingCallback
): Promise<AISummary> {
  const result: PartialAISummary = {
    isComplete: false,
    progress: 0,
  };

  // Send initial progress
  onProgress?.(result);

  try {
    // Stage 1: Quick insights (usually fastest)
    result.progress = 25;
    onProgress?.({ ...result, progress: 25 });
    
    const insights = await analyzeInsights(spreadsheetData);
    result.keyInsights = insights.keyInsights;
    result.progress = 40;
    onProgress?.(result);

    // Stage 2: Column analysis
    result.progress = 50;
    onProgress?.({ ...result, progress: 50 });
    
    const columns = await analyzeColumns(spreadsheetData);
    result.columnAnalyses = columns.columnAnalyses;
    result.progress = 70;
    onProgress?.(result);

    // Stage 3: Row findings and quality in parallel
    result.progress = 80;
    onProgress?.({ ...result, progress: 80 });
    
    const [rows, quality] = await Promise.all([
      analyzeRowFindings(spreadsheetData),
      analyzeDataQuality(spreadsheetData),
    ]);

    result.rowLevelFindings = rows.rowLevelFindings;
    result.dataQualityIssues = quality.dataQualityIssues;
    result.progress = 100;
    result.isComplete = true;
    
    onProgress?.(result);

    return {
      keyInsights: result.keyInsights!,
      columnAnalyses: result.columnAnalyses!,
      rowLevelFindings: result.rowLevelFindings!,
      dataQualityIssues: result.dataQualityIssues!,
    };
  } catch (error) {
    console.error('Streaming analysis error:', error);
    throw error;
  }
}

// Chunked analysis for very large datasets
export async function chunkedSpreadsheetAnalysis(
  spreadsheetData: string,
  maxChunkSize: number = 1000, // rows per chunk
  onProgress?: StreamingCallback
): Promise<AISummary> {
  const lines = spreadsheetData.split('\n');
  const headers = lines[0];
  const dataRows = lines.slice(1);
  
  if (dataRows.length <= maxChunkSize) {
    // Small dataset, use regular streaming
    return streamingSpreadsheetAnalysis(spreadsheetData, onProgress);
  }

  const result: PartialAISummary = {
    keyInsights: [],
    columnAnalyses: [],
    rowLevelFindings: [],
    dataQualityIssues: [],
    isComplete: false,
    progress: 0,
  };

  const chunks = [];
  for (let i = 0; i < dataRows.length; i += maxChunkSize) {
    const chunkRows = dataRows.slice(i, i + maxChunkSize);
    const chunkData = [headers, ...chunkRows].join('\n');
    chunks.push(chunkData);
  }

  let completedChunks = 0;
  const totalChunks = chunks.length;

  // Process chunks and combine results
  for (const chunk of chunks) {
    try {
      const chunkResult = await streamingSpreadsheetAnalysis(chunk);
      
      // Merge results
      result.keyInsights = [...(result.keyInsights || []), ...chunkResult.keyInsights];
      result.columnAnalyses = [...(result.columnAnalyses || []), ...chunkResult.columnAnalyses];
      result.rowLevelFindings = [...(result.rowLevelFindings || []), ...chunkResult.rowLevelFindings];
      result.dataQualityIssues = [...(result.dataQualityIssues || []), ...chunkResult.dataQualityIssues];
      
      completedChunks++;
      result.progress = Math.round((completedChunks / totalChunks) * 100);
      
      onProgress?.(result);
    } catch (error) {
      console.error(`Error processing chunk ${completedChunks + 1}:`, error);
      // Continue with other chunks
    }
  }

  // Deduplicate and finalize results
  const finalResult = {
    keyInsights: [...new Set(result.keyInsights)].slice(0, 5), // Keep top 5 unique insights
    columnAnalyses: deduplicateColumnAnalyses(result.columnAnalyses || []),
    rowLevelFindings: (result.rowLevelFindings || []).slice(0, 10), // Keep top 10 findings
    dataQualityIssues: deduplicateQualityIssues(result.dataQualityIssues || []),
  };

  result.isComplete = true;
  result.progress = 100;
  onProgress?.(result);

  return finalResult;
}

function deduplicateColumnAnalyses(analyses: any[]): any[] {
  const seen = new Set<string>();
  return analyses.filter(analysis => {
    if (seen.has(analysis.columnName)) {
      return false;
    }
    seen.add(analysis.columnName);
    return true;
  });
}

function deduplicateQualityIssues(issues: any[]): any[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const key = issue.issue.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}