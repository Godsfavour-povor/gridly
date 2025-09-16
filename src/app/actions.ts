'use server';

import { aiForecasting } from '@/ai/flows/ai-forecasting';
import { aiQuestionAnswering } from '@/ai/flows/ai-question-answering';
import {
  summarizeSpreadsheet,
  summarizeSpreadsheetStream,
  type SpreadsheetAnalysisChunk,
} from '@/ai/flows/ai-spreadsheet-summary';
import type { AISummary } from '@/lib/types';

export async function getSummaryAction(spreadsheetData: string): Promise<{ summary: AISummary; error?: string }> {
  try {
    if (!spreadsheetData) {
      throw new Error('Spreadsheet data is empty.');
    }
    const result = await summarizeSpreadsheet({ spreadsheetData });
    return { summary: result };
  } catch (error: any) {
    console.error('Error in getSummaryAction:', error);
    return { 
      error: 'Failed to generate summary from the provided data.',
      summary: {
        keyInsights: [],
        columnAnalyses: [],
        rowLevelFindings: [],
        dataQualityIssues: [],
      }
    };
  }
}

// --- NEW: Streaming action ---
export async function* getSummaryActionStream(
  spreadsheetData: string
): AsyncGenerator<SpreadsheetAnalysisChunk> {
  const { stream } = await summarizeSpreadsheetStream.stream({ spreadsheetData });
  for await (const chunk of stream) {
    yield chunk;
  }
}

export async function getChatResponseAction(spreadsheetData: string, question: string) {
  try {
     if (!spreadsheetData || !question) {
      throw new Error('Spreadsheet data or question is empty.');
    }

    const isForecastingQuestion = /forecast|predict|project|next week|next month|next quarter|next year/i.test(question);
    
    if (isForecastingQuestion) {
      const result = await aiForecasting({ spreadsheetData, question });
      return { answer: `**Forecast:** ${result.forecast}\n\n**Confidence:** ${result.confidence}\n\n**Assumptions:**\n- ${result.assumptions.join('\n- ')}` };
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
