'use server';

/**
 * @fileOverview Parallel AI analysis flows for faster spreadsheet processing
 * Breaks down analysis into smaller, concurrent tasks for improved performance
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry } from './ai-retry-utils';

const AIParallelInputSchema = z.object({
  spreadsheetData: z.string().describe('The spreadsheet data as a string'),
  analysisType: z.enum(['insights', 'columns', 'rows', 'quality']).describe('Type of analysis to perform'),
  dataChunk: z.string().optional().describe('Specific data chunk for analysis'),
});

// Key Insights Analysis
const InsightsOutputSchema = z.object({
  keyInsights: z.array(z.string()).describe('High-level insights from the data'),
});

const insightsPrompt = ai.definePrompt({
  name: 'insightsAnalysisPrompt',
  input: { schema: AIParallelInputSchema },
  output: { schema: InsightsOutputSchema },
  prompt: `You are a data analyst that explains findings in simple, clear language.

Data:
{{spreadsheetData}}

Provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Key trend or pattern (with specific numbers)
⚠️ Significant finding (with clear impact)
🔍 Business-critical observation (with actionable insight)

**Why It Matters:**
📈 Business impact of trend (revenue/cost/efficiency effect)
⚡ Operational significance (process/performance impact)
🎯 Strategic importance (competitive/growth impact)

**Suggested Fix:**
✅ Specific action to leverage positive trends
🔧 Clear step to address concerning patterns
💡 Practical next step for investigation

**Summary:**
🎯 In short: [concise overview of main business finding and primary action needed]

Use these visual indicators for business metrics:
📈 for growth/increases/improvements
📉 for declines/decreases/deterioration
⬆️ for high/strong performance
⬇️ for low/weak performance
⚖️ for stable/balanced metrics

Be specific with numbers and timeframes. Use plain English, avoid jargon like "data points", and make every insight actionable for business decisions.`,
});

// Column Analysis
const ColumnAnalysisOutputSchema = z.object({
  columnAnalyses: z.array(z.object({
    columnName: z.string(),
    description: z.string().describe('Detailed analysis including trends, distribution, and patterns'),
  })),
});

const columnPrompt = ai.definePrompt({
  name: 'columnAnalysisPrompt',
  input: { schema: AIParallelInputSchema },
  output: { schema: ColumnAnalysisOutputSchema },
  prompt: `Analyze each important column in this spreadsheet data. Explain findings in simple, practical terms.

Data:
{{spreadsheetData}}

For each significant column, provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Column pattern or trend (specific finding)
⚠️ Distribution or outlier issue (concrete detail)
🔍 Business relevance observation (actionable insight)

**Why It Matters:**
📈 Business impact (how this affects operations)
⚡ Data quality impact (reliability/accuracy effect)
🎯 Decision-making impact (strategic implications)

**Suggested Fix:**
✅ Action to leverage positive patterns
🔧 Solution for problematic distributions
💡 Recommendation for data improvement

**Summary:**
🎯 In short: [key finding about this column and what to do about it]

Use these visual indicators for column data:
📈 for increasing values/positive trends
📉 for decreasing values/concerning trends
⬆️ for high concentrations/peaks
⬇️ for low values/gaps
⚖️ for well-distributed/balanced data

Include specific numbers only when they add clear value. Use plain English instead of statistical terms.`,
});

// Row-Level Findings
const RowFindingsOutputSchema = z.object({
  rowLevelFindings: z.array(z.object({
    rowIdentifier: z.string(),
    finding: z.string(),
  })),
});

const rowFindingsPrompt = ai.definePrompt({
  name: 'rowFindingsPrompt',
  input: { schema: AIParallelInputSchema },
  output: { schema: RowFindingsOutputSchema },
  prompt: `Identify specific noteworthy rows in this data. Explain findings clearly and specifically.

Data:
{{spreadsheetData}}

Provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Notable row pattern (specific row with clear identifier)
⚠️ Outlier or anomaly (exact row number and value)
🔍 Representative example (row that shows key trend)

**Why It Matters:**
📈 Business significance (revenue/performance impact)
⚡ Operational importance (process/efficiency effect)
🎯 Strategic relevance (planning/decision impact)

**Suggested Fix:**
✅ Action for positive examples (how to replicate)
🔧 Solution for problematic rows (how to address)
💡 Investigation step for anomalies (what to check)

**Summary:**
🎯 In short: [key finding about row-level patterns and main action needed]

Use these visual indicators for row values:
📈 for exceptionally high/good performance
📉 for notably low/poor performance
⬆️ for top performers/best examples
⬇️ for bottom performers/concerning cases
⚖️ for typical/representative examples

Always reference by row number or clear identifier (customer name, ID, etc.). Be specific about what makes each row noteworthy and include exact values when relevant.`,
});

// Data Quality Analysis
const QualityOutputSchema = z.object({
  dataQualityIssues: z.array(z.object({
    issue: z.string(),
    recommendation: z.string(),
  })),
});

const qualityPrompt = ai.definePrompt({
  name: 'qualityAnalysisPrompt',
  input: { schema: AIParallelInputSchema },
  output: { schema: QualityOutputSchema },
  prompt: `Examine this spreadsheet for data quality problems and provide practical solutions.

Data:
{{spreadsheetData}}

Provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Issue 1 (specific problem with exact location)
⚠️ Issue 2 (concrete detail with affected cells)
🔍 Issue 3 (actionable insight with clear scope)

**Why It Matters:**
📈 Impact explanation for issue 1 (business consequence)
⚡ Impact explanation for issue 2 (operational effect)
🎯 Impact explanation for issue 3 (data accuracy impact)

**Suggested Fix:**
✅ Specific action step for issue 1
🔧 Clear solution for issue 2
💡 Practical remedy for issue 3

**Summary:**
🎯 In short: [concise overview of main data quality finding and primary action needed]

Use these visual indicators for data trends:
📈 for increases/improvements (green context)
📉 for decreases/deterioration (red context)
⬆️ for high/good values
⬇️ for low/poor values
⚖️ for balanced/acceptable quality

Be specific about locations ("Column C, rows 3-7" not "some cells"). Use plain English, avoid jargon, and make every finding actionable.`,
});

// Define individual flows
const insightsFlow = ai.defineFlow({
  name: 'insightsAnalysisFlow',
  inputSchema: AIParallelInputSchema,
  outputSchema: InsightsOutputSchema,
}, async (input) => {
  const { output } = await insightsPrompt(input);
  return output!;
});

const columnFlow = ai.defineFlow({
  name: 'columnAnalysisFlow',
  inputSchema: AIParallelInputSchema,
  outputSchema: ColumnAnalysisOutputSchema,
}, async (input) => {
  const { output } = await columnPrompt(input);
  return output!;
});

const rowFindingsFlow = ai.defineFlow({
  name: 'rowFindingsFlow',
  inputSchema: AIParallelInputSchema,
  outputSchema: RowFindingsOutputSchema,
}, async (input) => {
  const { output } = await rowFindingsPrompt(input);
  return output!;
});

const qualityFlow = ai.defineFlow({
  name: 'qualityAnalysisFlow',
  inputSchema: AIParallelInputSchema,
  outputSchema: QualityOutputSchema,
}, async (input) => {
  const { output } = await qualityPrompt(input);
  return output!;
});

// Export individual analysis functions with retry logic
export async function analyzeInsights(spreadsheetData: string) {
  return withRetry(() => insightsFlow({ spreadsheetData, analysisType: 'insights' }));
}

export async function analyzeColumns(spreadsheetData: string) {
  return withRetry(() => columnFlow({ spreadsheetData, analysisType: 'columns' }));
}

export async function analyzeRowFindings(spreadsheetData: string) {
  return withRetry(() => rowFindingsFlow({ spreadsheetData, analysisType: 'rows' }));
}

export async function analyzeDataQuality(spreadsheetData: string) {
  return withRetry(() => qualityFlow({ spreadsheetData, analysisType: 'quality' }));
}

// Main parallel analysis function
export async function parallelSpreadsheetAnalysis(spreadsheetData: string) {
  const startTime = Date.now();
  
  try {
    // Run all analyses in parallel
    const [insights, columns, rows, quality] = await Promise.all([
      analyzeInsights(spreadsheetData),
      analyzeColumns(spreadsheetData),
      analyzeRowFindings(spreadsheetData),
      analyzeDataQuality(spreadsheetData),
    ]);

    const processingTime = Date.now() - startTime;
    console.log(`Parallel analysis completed in ${processingTime}ms`);

    return {
      keyInsights: insights.keyInsights,
      columnAnalyses: columns.columnAnalyses,
      rowLevelFindings: rows.rowLevelFindings,
      dataQualityIssues: quality.dataQualityIssues,
    };
  } catch (error) {
    console.error('Parallel analysis error:', error);
    throw error;
  }
}