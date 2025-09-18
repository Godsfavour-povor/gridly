'use server';

/**
 * @fileOverview Additional specialized analysis flows
 * Operations, Inventory, Anomaly Detection, and Report Generation
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry } from './ai-retry-utils';

// Operations Analysis Schema
const OperationsAnalysisSchema = z.object({
  overdue_tasks: z.array(z.object({
    task: z.string(),
    owner: z.string(),
    days_overdue: z.number(),
  })),
  schedule_slippage: z.object({
    avg_slippage_days: z.number(),
    worst_performers: z.array(z.string()),
  }),
  resource_risks: z.array(z.object({
    owner: z.string(),
    overdue_pct: z.number(),
    task_count: z.number(),
  })),
  recommendations: z.array(z.object({
    priority: z.number(),
    action: z.string(),
    impact: z.string(),
  })),
  summary: z.string().describe('Manager-ready summary'),
});

// Inventory Analysis Schema
const InventoryAnalysisSchema = z.object({
  stock_risks: z.array(z.object({
    sku: z.string(),
    days_of_cover: z.number(),
    risk_level: z.enum(['critical', 'high', 'medium']),
  })),
  reorder_recommendations: z.array(z.object({
    sku: z.string(),
    suggested_qty: z.number(),
    reason: z.string(),
  })),
  tier_savings_examples: z.array(z.object({
    sku: z.string(),
    current_cost: z.number(),
    optimized_cost: z.number(),
    savings_pct: z.number(),
  })),
  summary: z.string().describe('Supply chain summary'),
});

// Anomaly Detection Schema
const AnomalyDetectionSchema = z.object({
  anomalies: z.array(z.object({
    row: z.number(),
    column: z.string(),
    value: z.number(),
    score: z.number(),
    type: z.enum(['data_error', 'rare_event', 'possible_fraud']),
    suggested_check: z.string(),
  })),
  summary: z.object({
    total_anomalies: z.number(),
    critical_count: z.number(),
    columns_affected: z.array(z.string()),
  }),
});

// Report Generation Schema
const ReportGenerationSchema = z.object({
  markdown_report: z.string().describe('PDF-ready markdown report'),
  slides_outline: z.array(z.object({
    slide_number: z.number(),
    title: z.string(),
    key_points: z.array(z.string()),
  })),
});

// Operations Analysis Flow
const operationsAnalysisPrompt = ai.definePrompt({
  name: 'operationsAnalysisPrompt',
  input: { schema: z.object({ spreadsheetData: z.string(), columns: z.string() }) },
  output: { schema: OperationsAnalysisSchema },
  prompt: `You are a project operations analyst. Detect overdue tasks, risky resource loads, and provide mitigation steps.

Data:
{{spreadsheetData}}

Columns: {{columns}}

Tasks:
1. List overdue tasks and owners
2. Calculate average schedule slippage (actual - estimated)
3. Flag owners with >30% overdue tasks
4. Suggest priority reassignments or timeline compression steps

Provide actionable recommendations for project managers.`,
});

// Inventory Analysis Flow
const inventoryAnalysisPrompt = ai.definePrompt({
  name: 'inventoryAnalysisPrompt',
  input: { schema: z.object({ spreadsheetData: z.string(), columns: z.string() }) },
  output: { schema: InventoryAnalysisSchema },
  prompt: `You are a supply chain analyst. Determine stock risk, reorder suggestions, and savings opportunities.

Data:
{{spreadsheetData}}

Columns: {{columns}}

Tasks:
1. Calculate days_of_cover = stock_on_hand / (monthly_usage/30)
2. Flag SKUs with days_of_cover < lead_time_days
3. If tier_pricing exists, recommend optimal order quantities
4. Identify cost savings opportunities

Focus on preventing stockouts and optimizing costs.`,
});

// Anomaly Detection Flow
const anomalyDetectionPrompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: { schema: z.object({ spreadsheetData: z.string(), numericColumns: z.string() }) },
  output: { schema: AnomalyDetectionSchema },
  prompt: `You are an anomaly detection analyst. Use robust stats to find outliers and explain why each is anomalous.

Data:
{{spreadsheetData}}

Numeric columns: {{numericColumns}}

Tasks:
1. For each numeric column, identify statistical outliers (z-score > 3)
2. Classify anomaly type: "data_error" (negative price), "rare_event", "possible_fraud"
3. Provide suggested follow-up checks

Focus on actionable anomalies that need investigation.`,
});

// Report Generation Flow
const reportGenerationPrompt = ai.definePrompt({
  name: 'reportGenerationPrompt',
  input: { schema: z.object({ analysisJson: z.string(), title: z.string() }) },
  output: { schema: ReportGenerationSchema },
  prompt: `You are a report writer. Take analysis JSON and generate a concise PDF-ready report structure.

Analysis: {{analysisJson}}
Title: {{title}}

Create a structured report with:
1. Executive Summary
2. Key Metrics
3. Top Insights (with chart placeholders)
4. Recommendations
5. Data Notes

Also provide a 3-slide presentation outline:
- Slide 1: Summary
- Slide 2: Key Insights
- Slide 3: Next Steps`,
});

// Export functions
export async function generateOperationsAnalysis(spreadsheetData: string, columns: string) {
  return withRetry(() => operationsAnalysisFlow({ spreadsheetData, columns }));
}

export async function generateInventoryAnalysis(spreadsheetData: string, columns: string) {
  return withRetry(() => inventoryAnalysisFlow({ spreadsheetData, columns }));
}

export async function generateAnomalyDetection(spreadsheetData: string, numericColumns: string) {
  return withRetry(() => anomalyDetectionFlow({ spreadsheetData, numericColumns }));
}

export async function generateReport(analysisJson: string, title: string) {
  return withRetry(() => reportGenerationFlow({ analysisJson, title }));
}

// Define flows
const operationsAnalysisFlow = ai.defineFlow({
  name: 'operationsAnalysisFlow',
  inputSchema: z.object({ spreadsheetData: z.string(), columns: z.string() }),
  outputSchema: OperationsAnalysisSchema,
}, async (input) => {
  const { output } = await operationsAnalysisPrompt(input);
  return output!;
});

const inventoryAnalysisFlow = ai.defineFlow({
  name: 'inventoryAnalysisFlow',
  inputSchema: z.object({ spreadsheetData: z.string(), columns: z.string() }),
  outputSchema: InventoryAnalysisSchema,
}, async (input) => {
  const { output } = await inventoryAnalysisPrompt(input);
  return output!;
});

const anomalyDetectionFlow = ai.defineFlow({
  name: 'anomalyDetectionFlow',
  inputSchema: z.object({ spreadsheetData: z.string(), numericColumns: z.string() }),
  outputSchema: AnomalyDetectionSchema,
}, async (input) => {
  const { output } = await anomalyDetectionPrompt(input);
  return output!;
});

const reportGenerationFlow = ai.defineFlow({
  name: 'reportGenerationFlow',
  inputSchema: z.object({ analysisJson: z.string(), title: z.string() }),
  outputSchema: ReportGenerationSchema,
}, async (input) => {
  const { output } = await reportGenerationPrompt(input);
  return output!;
});