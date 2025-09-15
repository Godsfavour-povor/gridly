'use server';

/**
 * @fileOverview Summarizes a spreadsheet using AI to provide key insights for business managers.
 *
 * - summarizeSpreadsheet - A function that takes spreadsheet data and returns a summary.
 * - AISpreadsheetSummaryInput - The input type for the summarizeSpreadsheet function.
 * - AISpreadsheetSummaryOutput - The return type for the summarizeSpreadsheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  return summarizeSpreadsheetFlow(input);
}

const summarizeSpreadsheetPrompt = ai.definePrompt({
  name: 'summarizeSpreadsheetPrompt',
  input: {schema: AISpreadsheetSummaryInputSchema},
  output: {schema: AISpreadsheetSummaryOutputSchema},
  prompt: `You are an expert data analyst AI. Your task is to provide a comprehensive analysis of the given spreadsheet data for a business manager.
  Be thorough, clear, and provide actionable insights. Refer to specific columns and rows when possible.

  Here is the spreadsheet data:
  {{spreadsheetData}}

  Please perform the following analysis and structure your output according to the defined schema:

  1.  **Key Insights**: Generate a list of 3-5 high-level, critical insights that a manager should know immediately. These should cover major trends, significant totals, or surprising findings.

  2.  **Column-by-Column Analysis**: For each numeric or otherwise significant column, provide a \`columnAnalyses\` entry. In your description, detail the trends, distribution (e.g., min, max, average), and any noteworthy patterns or concentrations of data.

  3.  **Row-Level Findings**: Identify and create \`rowLevelFindings\` for any specific rows that stand out. This includes outliers (e.g., the row with the highest sale, the product with the lowest stock), records that are particularly representative of a trend, or any anomalies. Refer to the row by its number or by a unique identifier if a clear one exists (like a name or ID column).

  4.  **Data Quality Issues**: Carefully examine the data for any quality problems. Create \`dataQualityIssues\` for things like missing values, inconsistent formatting (e.g., dates in different formats), or logical errors. For each issue, describe the problem and recommend a specific action to fix it (e.g., "In column 'Revenue', cell C5 is empty. Consider filling it with the average revenue or removing the row if it's incomplete.").`,
});

const summarizeSpreadsheetFlow = ai.defineFlow(
  {
    name: 'summarizeSpreadsheetFlow',
    inputSchema: AISpreadsheetSummaryInputSchema,
    outputSchema: AISpreadsheetSummaryOutputSchema,
  },
  async input => {
    const {output} = await summarizeSpreadsheetPrompt(input);
    return output!;
  }
);
