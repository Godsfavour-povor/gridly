export type ParsedData = {
  headers: string[];
  rows: (string | number)[][];
  numericColumns: string[];
};

export type Metrics = {
  [key: string]: {
    total?: number;
    average?: number;
    min?: number;
    max?: number;
    trend?: 'increase' | 'decrease' | 'stable';
  };
};

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
};

export type ColumnAnalysis = {
  columnName: string;
  description: string;
};

export type RowFinding = {
  rowIdentifier: string;
  finding: string;
};

export type DataQualityIssue = {
  issue: string;
  recommendation: string;
};

export type AISummary = {
  keyInsights: string[];
  columnAnalyses: ColumnAnalysis[];
  rowLevelFindings: RowFinding[];
  dataQualityIssues: DataQualityIssue[];
};

export type AnalysisResult = {
  id: string;
  fileName: string;
  createdAt: string;
  parsedData: ParsedData;
  stringData: string;
  metrics: Metrics;
  summary: AISummary;
  chatHistory: ChatMessage[];
};

export type RecentFile = {
  id: string;
  fileName: string;
  createdAt: string;
  summary: string;
};


export type AIForecast = {
  forecast: string;
  confidence: 'High' | 'Medium' | 'Low';
  assumptions: string[];
}
