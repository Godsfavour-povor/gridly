'use server';

import { aiForecasting } from '@/ai/flows/ai-forecasting';
import { aiQuestionAnswering } from '@/ai/flows/ai-question-answering';
import { summarizeSpreadsheet } from '@/ai/flows/ai-spreadsheet-summary';
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
