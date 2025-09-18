'use server';

/**
 * @fileOverview Specialized analysis flows for different data types
 * Provides targeted insights based on detected data patterns
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { withRetry } from './ai-retry-utils';

// Quick Summary Schema
const QuickSummarySchema = z.object({
  executiveSummary: z.string().describe('2-3 sentence executive summary with key metrics and drivers'),
  mainOutcome: z.string().describe('Primary finding or trend'),
  topDriver: z.string().describe('Main contributing factor with numbers'),
  immediateCheck: z.string().describe('One actionable item to investigate'),
});

// Sales Analysis Schema
const SalesAnalysisSchema = z.object({
  summary: z.string().describe('Brief overview of sales performance'),
  metrics: z.object({
    current: z.object({
      revenue: z.number().optional(),
      cost: z.number().optional(),
      gross_margin: z.number().optional(),
      units_sold: z.number().optional(),
    }),
    change: z.object({
      revenue_pct: z.number().optional(),
      cost_pct: z.number().optional(),
      margin_pct: z.number().optional(),
      units_pct: z.number().optional(),
    }),
  }),
  top_products: z.array(z.object({
    product: z.string(),
    revenue: z.number(),
    pct_of_total: z.number(),
  })),
  bottom_products: z.array(z.object({
    product: z.string(),
    margin: z.number(),
    reason: z.string(),
  })),
  regions: z.array(z.object({
    region: z.string(),
    growth_pct: z.number(),
    status: z.string(),
  })),
  anomalies: z.array(z.object({
    row: z.number(),
    reason: z.string(),
  })),
  recommendations: z.array(z.object({
    priority: z.number(),
    text: z.string(),
  })),
});

// Survey Analysis Schema
const SurveyAnalysisSchema = z.object({
  sentiment_breakdown: z.object({
    positive_pct: z.number(),
    neutral_pct: z.number(),
    negative_pct: z.number(),
  }),
  themes: z.array(z.object({
    theme: z.string(),
    frequency_pct: z.number(),
    avg_rating: z.number().optional(),
    severity: z.enum(['low', 'medium', 'high']),
    example_quote: z.string(),
  })),
  actions: z.array(z.object({
    priority: z.number(),
    theme: z.string(),
    action: z.string(),
  })),
  brief: z.string().describe('Plain English summary for management'),
});

// Quick Summary Flow
const quickSummaryPrompt = ai.definePrompt({
  name: 'quickSummaryPrompt',
  input: { schema: z.object({ dataInfo: z.string(), metrics: z.string() }) },
  output: { schema: QuickSummarySchema },
  prompt: `You are a concise executive summarizer. Turn structured metrics into a short executive summary.

{{dataInfo}}
{{metrics}}

Write a 2–3 sentence Quick Summary that:
- Mentions main outcome (growth/decline or notable stat)
- Names 1 top driver (with number)
- States one immediate observation to check
Keep it short and quantitative.`,
});

// Sales Analysis Flow
const salesAnalysisPrompt = ai.definePrompt({
  name: 'salesAnalysisPrompt',
  input: { schema: z.object({ spreadsheetData: z.string(), columns: z.string() }) },
  output: { schema: SalesAnalysisSchema },
  prompt: `You are a senior revenue analyst. Provide specific, actionable insights in a structured visual format.

Data:
{{spreadsheetData}}

Key columns: {{columns}}

Provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Revenue performance (period totals and growth)
⚠️ Product profitability issues (top and bottom performers)
🔍 Regional performance variations (growth/decline patterns)

**Why It Matters:**
📈 Revenue impact (direct financial consequences)
⚡ Operational significance (supply, demand, efficiency effects)
🎯 Strategic importance (market position, competitive advantage)

**Suggested Fix:**
✅ Immediate action for revenue optimization
🔧 Investigation steps for problem areas
💡 Strategic recommendations for growth

**Summary:**
🎯 In short: [key revenue finding with numbers and primary action needed]

Tasks to analyze:
1. Compute period totals: revenue, cost, gross_margin, units_sold
2. Identify top 5 products by revenue and bottom 5 by margin
3. Identify regions with significant growth or decline (>5%)
4. Flag anomalies (single-order spikes, negative margins)
5. Provide Top 5 actionable recommendations prioritized

Use visual indicators:
📈 for revenue growth/improvements
📉 for revenue decline/losses
⬆️ for high-performing products/regions
⬇️ for underperforming areas
⚠️ for critical issues requiring attention

Example recommendation format: "Priority 1: Investigate Region A's declined revenue (📉 -5%). Check last quarter's top 3 SKUs for supply issues."`,
});

// Survey Analysis Flow
const surveyAnalysisPrompt = ai.definePrompt({
  name: 'surveyAnalysisPrompt',
  input: { schema: z.object({ spreadsheetData: z.string(), textColumn: z.string() }) },
  output: { schema: SurveyAnalysisSchema },
  prompt: `You are a customer insights analyst. Extract sentiment, cluster themes, and produce actionable recommendations in a structured visual format.

Data:
{{spreadsheetData}}

Text column: {{textColumn}}

Provide analysis in this exact format with visual indicators:

**Main Issues Found:**
📊 Sentiment breakdown (positive/neutral/negative percentages)
⚠️ Critical themes requiring attention (negative feedback patterns)
🔍 Customer satisfaction trends (rating patterns and severity)

**Why It Matters:**
📈 Customer retention impact (satisfaction effects on loyalty)
⚡ Operational consequences (service/product improvement needs)
🎯 Brand reputation effects (market perception and competitive position)

**Suggested Fix:**
✅ Immediate actions to address top negative themes
🔧 Process improvements for recurring issues
💡 Long-term customer experience enhancements

**Summary:**
🎯 In short: [overall sentiment finding with key themes and primary action to improve customer experience]

Tasks to analyze:
1. Provide overall sentiment breakdown (positive/neutral/negative percentages)
2. Extract top 5 recurring themes (with example quotes)
3. For each theme, determine severity and average rating if available
4. Provide 3 prioritized actions to address top negative themes

Use visual indicators:
📈 for positive sentiment/improvement opportunities
📉 for negative sentiment/declining satisfaction
⬆️ for high satisfaction scores
⬇️ for low satisfaction/critical issues
⚠️ for urgent customer experience problems

Focus on actionable insights that can improve customer experience and measurable satisfaction metrics.`,
});

// Export functions
export async function generateQuickSummary(dataInfo: string, metrics: string) {
  return withRetry(() => quickSummaryFlow({ dataInfo, metrics }));
}

export async function generateSalesAnalysis(spreadsheetData: string, columns: string) {
  return withRetry(() => salesAnalysisFlow({ spreadsheetData, columns }));
}

export async function generateSurveyAnalysis(spreadsheetData: string, textColumn: string) {
  return withRetry(() => surveyAnalysisFlow({ spreadsheetData, textColumn }));
}

// Define flows
const quickSummaryFlow = ai.defineFlow({
  name: 'quickSummaryFlow',
  inputSchema: z.object({ dataInfo: z.string(), metrics: z.string() }),
  outputSchema: QuickSummarySchema,
}, async (input) => {
  const { output } = await quickSummaryPrompt(input);
  return output!;
});

const salesAnalysisFlow = ai.defineFlow({
  name: 'salesAnalysisFlow',
  inputSchema: z.object({ spreadsheetData: z.string(), columns: z.string() }),
  outputSchema: SalesAnalysisSchema,
}, async (input) => {
  const { output } = await salesAnalysisPrompt(input);
  return output!;
});

const surveyAnalysisFlow = ai.defineFlow({
  name: 'surveyAnalysisFlow',
  inputSchema: z.object({ spreadsheetData: z.string(), textColumn: z.string() }),
  outputSchema: SurveyAnalysisSchema,
}, async (input) => {
  const { output } = await surveyAnalysisPrompt(input);
  return output!;
});