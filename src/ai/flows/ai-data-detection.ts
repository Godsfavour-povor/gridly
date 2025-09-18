/**
 * @fileOverview Data type detection and analysis mode selection
 * Automatically detects data patterns to choose the best analysis approach
 */

export interface DataTypeDetection {
  primaryType: 'sales' | 'survey' | 'operations' | 'inventory' | 'general';
  confidence: number;
  suggestedMode: string;
  detectedColumns: {
    dates: string[];
    numeric: string[];
    categorical: string[];
    text: string[];
  };
  patterns: {
    hasSalesColumns: boolean;
    hasFeedbackColumns: boolean;
    hasProjectColumns: boolean;
    hasInventoryColumns: boolean;
  };
}

export function detectDataType(headers: string[], sampleData?: string[][]): DataTypeDetection {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // Sales/Revenue patterns
  const salesKeywords = ['revenue', 'sales', 'price', 'cost', 'margin', 'profit', 'units', 'quantity', 'region', 'product', 'customer'];
  const salesScore = salesKeywords.filter(kw => 
    lowerHeaders.some(h => h.includes(kw))
  ).length;

  // Survey/Feedback patterns  
  const surveyKeywords = ['rating', 'score', 'feedback', 'comment', 'review', 'satisfaction', 'response'];
  const surveyScore = surveyKeywords.filter(kw =>
    lowerHeaders.some(h => h.includes(kw))
  ).length;

  // Operations/Project patterns
  const opsKeywords = ['task', 'project', 'status', 'due', 'deadline', 'owner', 'assignee', 'priority', 'estimated', 'actual'];
  const opsScore = opsKeywords.filter(kw =>
    lowerHeaders.some(h => h.includes(kw))
  ).length;

  // Inventory patterns
  const invKeywords = ['stock', 'inventory', 'sku', 'product', 'warehouse', 'supplier', 'reorder', 'lead_time'];
  const invScore = invKeywords.filter(kw =>
    lowerHeaders.some(h => h.includes(kw))
  ).length;

  // Determine primary type
  const scores = {
    sales: salesScore,
    survey: surveyScore,
    operations: opsScore,
    inventory: invScore
  };

  const maxScore = Math.max(...Object.values(scores));
  const primaryType = maxScore >= 2 ? 
    Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as 'sales' | 'survey' | 'operations' | 'inventory' :
    'general';

  // Categorize columns
  const detectedColumns = {
    dates: headers.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated');
    }),
    numeric: headers.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('price') || lower.includes('cost') || lower.includes('amount') || 
             lower.includes('count') || lower.includes('quantity') || lower.includes('rating') ||
             lower.includes('score') || lower.includes('hours') || lower.includes('days');
    }),
    categorical: headers.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('category') || lower.includes('type') || lower.includes('status') ||
             lower.includes('region') || lower.includes('department') || lower.includes('priority');
    }),
    text: headers.filter(h => {
      const lower = h.toLowerCase();
      return lower.includes('comment') || lower.includes('feedback') || lower.includes('description') ||
             lower.includes('notes') || lower.includes('review') || lower.includes('text');
    })
  };

  return {
    primaryType,
    confidence: maxScore / 10, // Normalize to 0-1
    suggestedMode: getSuggestedMode(primaryType, maxScore),
    detectedColumns,
    patterns: {
      hasSalesColumns: salesScore >= 2,
      hasFeedbackColumns: surveyScore >= 2,
      hasProjectColumns: opsScore >= 2,
      hasInventoryColumns: invScore >= 2
    }
  };
}

function getSuggestedMode(type: string, score: number): string {
  if (score < 2) return 'general';
  
  switch (type) {
    case 'sales': return 'revenue_analysis';
    case 'survey': return 'feedback_analysis';
    case 'operations': return 'project_tracking';
    case 'inventory': return 'inventory_analysis';
    default: return 'general';
  }
}

export function getQuickSummaryPrompt(nRows: number, nCols: number, primaryMetrics: string[], topDrivers: string[]): string {
  return `You are a concise executive summarizer. Turn structured metrics into a short executive summary.

Input metrics:
- n_rows: ${nRows}, n_columns: ${nCols}
- primary_metrics: ${primaryMetrics.join(', ')}
- top_drivers: ${topDrivers.join(', ')}

Task:
Write a 2–3 sentence Quick Summary that:
- Mentions main outcome (growth/decline or notable stat)
- Names 1 top driver (with number)
- States one immediate observation to check
Keep it short and quantitative.

Example:
"Total revenue this period is $382,000 (+12% vs prior). Growth is driven by Region B, which contributed 68% of new revenue. Check marketing spend in Region A—it lags behind with a 5% decline."`;
}