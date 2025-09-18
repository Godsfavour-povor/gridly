// Mock AI service for testing when real AI is unavailable
const MOCK_DATA = {
  keyInsights: [
    "📊 Data successfully parsed with 150 rows and 8 columns",
    "📈 Sales trend shows 12% growth over the last quarter",
    "⚠️ 3 potential data quality issues detected - see Quality tab",
    "🎯 Top performing category: Electronics with 35% of total sales"
  ],
  columnAnalyses: [
    {
      columnName: "Sales",
      description: "Total sales figures show consistent growth with seasonal peaks in Q4. Average sale value is $2,450 with a standard deviation of $850."
    },
    {
      columnName: "Region",
      description: "Data covers 5 regions with North and West showing highest performance. Central region has lowest conversion rate at 12%."
    },
    {
      columnName: "Product Category",
      description: "Electronics dominates with 35% share, followed by Home Goods at 28%. Clothing shows declining trend month over month."
    }
  ],
  rowLevelFindings: [
    {
      rowIdentifier: "Row 23",
      finding: "Highest single sale at $15,430 - potential outlier worth reviewing"
    },
    {
      rowIdentifier: "Row 67", 
      finding: "Negative profit margin of -12% - pricing or cost issue to investigate"
    },
    {
      rowIdentifier: "Row 102",
      finding: "Customer satisfaction score of 2.1/5 - immediate attention required"
    }
  ],
  dataQualityIssues: [
    {
      issue: "Missing values in 'Customer Feedback' column (12 cells)",
      recommendation: "Fill missing feedback with 'No response' or follow up with customers"
    },
    {
      issue: "Inconsistent date formats in 'Purchase Date' column",
      recommendation: "Standardize all dates to YYYY-MM-DD format for accurate analysis"
    },
    {
      issue: "Negative values in 'Quantity' column (3 instances)",
      recommendation: "Review these entries as negative quantities may indicate returns or data entry errors"
    }
  ]
};

// Generate mock analysis for testing
export async function generateMockAnalysis(spreadsheetData: string): Promise<any> {
  console.log("Using mock AI service for testing...");
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock data with some customization based on data size
  const lines = spreadsheetData.split('\n');
  const rowCount = lines.length;
  const colCount = lines[0]?.split(',').length || 1;
  
  // Customize mock data slightly based on actual data
  const customizedData = {
    ...MOCK_DATA,
    keyInsights: [
      `📊 Data successfully parsed with ${rowCount} rows and ${colCount} columns`,
      ...MOCK_DATA.keyInsights.slice(1)
    ]
  };
  
  return customizedData;
}

// Test if mock service is enabled
export function isMockServiceEnabled(): boolean {
  // Check if we're in development mode and mock is enabled
  return process.env.NODE_ENV === 'development' && 
         process.env.ENABLE_MOCK_AI === 'true';
}