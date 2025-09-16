'use server';

/**
 * @fileOverview Summarizes a spreadsheet using AI to provide key insights for business managers.
 *
 * - summarizeSpreadsheet - A function that takes spreadsheet data and returns a summary.
 * - summarizeSpreadsheetStream - A streaming flow that provides the summary in chunks.
 * - AISpreadsheetSummaryInput - The input type for the summarizeSpreadsheet function.
 * - AISpreadsheetSummaryOutput - The return type for the summarizeSpreadsheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema (remains the same)
const AISpreadsheetSummaryInputSchema = z.object({
  spreadsheetData: z
    .string()
    .describe('The spreadsheet data as a string (e.g., CSV or XLSX content).'),
});
export type AISpreadsheetSummaryInput = z.infer<typeof AISpreadsheetSummaryInputSchema>;

// Output Schemas for each part of the analysis (remain the same)
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

// Full Output Schema (remains the same)
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
      'A list of potential data quality issues, like missing values, or inconsistencies, with recommendations for fixing them.'
    ),
});
export type AISpreadsheetSummaryOutput = z.infer<typeof AISpreadsheetSummaryOutputSchema>;

// --- NEW: Schemas for Streaming Chunks ---
const KeyInsightsChunkSchema = z.object({
  type: z.literal('keyInsights'),
  data: z.array(z.string()),
});
const ColumnAnalysesChunkSchema = z.object({
  type: z.literal('columnAnalyses'),
  data: z.array(ColumnAnalysisSchema),
});
const RowLevelFindingsChunkSchema = z.object({
  type: z.literal('rowLevelFindings'),
  data: z.array(RowFindingSchema),
});
const DataQualityIssuesChunkSchema = z.object({
  type: z.literal('dataQualityIssues'),
  data: z.array(DataQualityIssueSchema),
});

export const SpreadsheetAnalysisChunkSchema = z.union([
  KeyInsightsChunkSchema,
  ColumnAnalysesChunkSchema,
  RowLevelFindingsChunkSchema,
  DataQualityIssuesChunkSchema,
]);
export type SpreadsheetAnalysisChunk = z.infer<typeof SpreadsheetAnalysisChunkSchema>;


// --- NEW: Smaller, Focused Prompts ---

const keyInsightsPrompt = ai.definePrompt({
  name: 'keyInsightsPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: z.object({ keyInsights: z.array(z.string()) })},
  prompt: `You are an expert data analyst AI. Analyze the provided spreadsheet data and generate a list of 3-5 high-level, critical insights that a manager should know immediately. These should cover major trends, significant totals, or surprising findings.

  Your output MUST be a valid JSON object that conforms to the following Zod schema: { "keyInsights": z.array(z.string()) }.

  Spreadsheet data:
  {{spreadsheetData}}`,
});

const columnAnalysesPrompt = ai.definePrompt({
  name: 'columnAnalysesPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: z.object({ columnAnalyses: z.array(ColumnAnalysisSchema) })},
  prompt: `You are an expert data analyst AI. For each numeric or otherwise significant column in the provided spreadsheet data, provide a detailed analysis. In your description, detail the trends, distribution (e.g., min, max, average), and any noteworthy patterns or concentrations of data.

  Your output MUST be a valid JSON object that conforms to the following Zod schema: { "columnAnalyses": z.array(z.object({ columnName: z.string(), description: z.string() })) }.

  Spreadsheet data:
  {{spreadsheetData}}`,
});

const rowLevelFindingsPrompt = ai.definePrompt({
  name: 'rowLevelFindingsPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: z.object({ rowLevelFindings: z.array(RowFindingSchema) })},
  prompt: `You are an expert data analyst AI. Identify any specific rows that stand out in the provided spreadsheet data. This includes outliers (e.g., the row with the highest sale), records that are particularly representative of a trend, or any anomalies. Refer to the row by its number or by a unique identifier if a clear one exists.

  Your output MUST be a valid JSON object that conforms to the following Zod schema: { "rowLevelFindings": z.array(z.object({ rowIdentifier: z.string(), finding: z.string() })) }.

  Spreadsheet data:
  {{spreadsheetData}}`,
});

const dataQualityIssuesPrompt = ai.definePrompt({
  name: 'dataQualityIssuesPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: z.object({ dataQualityIssues: z.array(DataQualityIssueSchema) })},
  prompt: `You are an expert data analyst AI. Carefully examine the provided spreadsheet data for any quality problems. This includes missing values, inconsistent formatting, or logical errors. For each issue, describe the problem and recommend a specific action to fix it.

  Your output MUST be a valid JSON object that conforms to the following Zod schema: { "dataQualityIssues": z.array(z.object({ issue: z.string(), recommendation: z.string() })) }.

  Spreadsheet data:
  {{spreadsheetData}}`,
});


// --- NEW: Streaming Flow ---

export const summarizeSpreadsheetStream = ai.defineFlow(
  {
    name: 'summarizeSpreadsheetStream',
    inputSchema: AISpreadsheetSummaryInputSchema,
    outputSchema: AISpreadsheetSummaryOutputSchema,
    streamSchema: SpreadsheetAnalysisChunkSchema,
  },
  async (input, {sendChunk}) => {
    const fullSummary: AISpreadsheetSummaryOutput = {
      keyInsights: [],
      columnAnalyses: [],
      rowLevelFindings: [],
      dataQualityIssues: [],
    };

    // 1. Get Key Insights
    const insightsResult = await keyInsightsPrompt(input);
    if (insightsResult?.output?.keyInsights.length) {
      fullSummary.keyInsights = insightsResult.output.keyInsights;
      sendChunk({type: 'keyInsights', data: insightsResult.output.keyInsights});
    }

    // 2. Get Column Analyses
    const columnsResult = await columnAnalysesPrompt(input);
    if (columnsResult?.output?.columnAnalyses.length) {
      fullSummary.columnAnalyses = columnsResult.output.columnAnalyses;
      sendChunk({type: 'columnAnalyses', data: columnsResult.output.columnAnalyses});
    }

    // 3. Get Row-Level Findings
    const rowsResult = await rowLevelFindingsPrompt(input);
    if (rowsResult?.output?.rowLevelFindings.length) {
      fullSummary.rowLevelFindings = rowsResult.output.rowLevelFindings;
      sendChunk({type: 'rowLevelFindings', data: rowsResult.output.rowLevelFindings});
    }

    // 4. Get Data Quality Issues
    const qualityResult = await dataQualityIssuesPrompt(input);
    if (qualityResult?.output?.dataQualityIssues.length) {
      fullSummary.dataQualityIssues = qualityResult.output.dataQualityIssues;
      sendChunk({type: 'dataQualityIssues', data: qualityResult.output.dataQualityIssues});
    }

    return fullSummary;
  }
);


// --- MODIFIED: Original function now uses the streaming flow ---
// This provides a non-streaming endpoint while reusing the streaming logic.
export async function summarizeSpreadsheet(
  input: AISpreadsheetSummaryInput
): Promise<AISpreadsheetSummaryOutput> {
  const response = await summarizeSpreadsheetStream.stream(input);
  // drain the stream to get the final output
  for await (const chunk of response.stream) {
    // do nothing
  }
  return await response.output;
}
