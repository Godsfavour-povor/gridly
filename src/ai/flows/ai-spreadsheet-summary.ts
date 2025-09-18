'use server';

/**
 * @fileOverview Summarizes a spreadsheet using AI to provide key insights for business managers.
 *
 * - summarizeSpreadsheet - A function that takes spreadsheet data and returns a summary.
 * - AISpreadsheetSummaryInput - The input type for the summarizeSpreadsheet function.
 * - AISpreadsheetSummaryOutput - The return type for the summarizeSpreadsheet function.
 */

import {ai} from '@/ai/genkit';
import {executeWithFallback} from '@/ai/genkit-fallback';
import {z} from 'genkit';
import { withRetry, emergencyReset } from './ai-retry-utils';

const AISpreadsheetSummaryInputSchema = z.object({
  spreadsheetData: z
    .string()
    .describe('The spreadsheet data as a string (e.g., CSV or XLSX content).'),
});
export type AISpreadsheetSummaryInput = z.infer<typeof AISpreadsheetSummaryInputSchema>;

const ColumnAnalysisSchema = z.object({
  columnName: z.string().describe('The name of the column being analyzed.'),
  description: z
    .string()
    .describe(
      'A detailed analysis of the column, including trends, distribution, and any noteworthy patterns.'
    ),
});

const RowFindingSchema = z.object({
  rowIdentifier: z
    .string()
    .describe(
      'A reference to the specific row (e.g., "Row 5" or using a value from a key column like "Product ID 123").'
    ),
  finding: z
    .string()
    .describe('The specific insight or anomaly found in that row.'),
});

const DataQualityIssueSchema = z.object({
  issue: z.string().describe('A description of the data quality issue found.'),
  recommendation: z
    .string()
    .describe(
      'A recommendation on how to fix the issue, including specific cells, rows, or columns if applicable.'
    ),
});

const AISpreadsheetSummaryOutputSchema = z.object({
  keyInsights: z
    .array(z.string())
    .describe(
      'A list of the most important, high-level insights from the data.'
    ),
  columnAnalyses: z
    .array(ColumnAnalysisSchema)
    .describe('A detailed analysis for each significant column in the data.'),
  rowLevelFindings: z
    .array(RowFindingSchema)
    .describe(
      'A list of noteworthy findings from specific rows, such as outliers or records of interest.'
    ),
  dataQualityIssues: z
    .array(DataQualityIssueSchema)
    .describe(
      'A list of potential data quality issues, like missing values or inconsistencies, with recommendations for fixing them.'
    ),
});
export type AISpreadsheetSummaryOutput = z.infer<typeof AISpreadsheetSummaryOutputSchema>;

export async function summarizeSpreadsheet(
  input: AISpreadsheetSummaryInput
): Promise<AISpreadsheetSummaryOutput> {
  // First, try to reset circuit breaker in case it's stuck
  emergencyReset();
  
  return executeWithFallback(async (aiInstance) => {
    return withRetry(() => summarizeSpreadsheetFlow(input, aiInstance));
  });
}

const summarizeSpreadsheetPrompt = (aiInstance: any) => aiInstance.definePrompt({
  name: 'summarizeSpreadsheetPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: AISpreadsheetSummaryOutputSchema},
  prompt: `You are a data analyst that explains findings in simple, clear, and actionable terms.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Analyze this data and structure your response following these rules:
  
  1. **Key Insights**: Provide 3-5 main discoveries in plain English. Focus on:
     - Major trends or patterns you found
     - Significant totals, averages, or outliers
     - Business-critical observations
     - Surprising or unexpected findings
     
     Format each insight clearly without jargon. Example:
     - "Sales increased 25% from January to March"
     - "Customer satisfaction scores are highest on weekends"

  2. **Column Analysis**: For each important column, explain:
     - What the data shows in simple terms
     - Key patterns (highest/lowest values, trends)
     - Any notable distributions or concentrations
     - Business relevance in practical terms
     
     Use clear language. Instead of "statistical variance", say "values range widely".

  3. **Row-Level Findings**: Identify specific noteworthy records:
     - Outliers ("Row 15 has the highest sales at $50,000")
     - Representative examples of trends
     - Anomalies that need attention
     - Records that illustrate key patterns
     
     Always reference by row number or clear identifier.

  4. **Data Quality Issues**: Find problems and give practical solutions:
     - Missing values ("Column C has 5 empty cells")
     - Format inconsistencies ("Dates in mixed formats")
     - Logical errors ("Negative quantities in inventory")
     - Data type issues
     
     For each issue, provide a specific, actionable recommendation.
     
  Keep all explanations clear, specific, and actionable. Use numbers only when they add value and are explained.`,
});

const createSummarizeSpreadsheetFlow = (aiInstance: any) => aiInstance.defineFlow(
  {
    name: 'summarizeSpreadsheetFlow',
    inputSchema: AISpreadsheetSummaryInputSchema,
    outputSchema: AISpreadsheetSummaryOutputSchema,
  },
  async (input: AISpreadsheetSummaryInput) => {
    const prompt = summarizeSpreadsheetPrompt(aiInstance);
    const {output} = await prompt(input);
    return output!;
  }
);

async function summarizeSpreadsheetFlow(input: AISpreadsheetSummaryInput, aiInstance?: any): Promise<AISpreadsheetSummaryOutput> {
  const instance = aiInstance || ai;
  const prompt = summarizeSpreadsheetPrompt(instance);
  const {output} = await prompt(input);
  return output!;
}
