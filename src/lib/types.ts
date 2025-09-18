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

// Represents one uploaded document (file) and its parsed data/metrics
export type DocumentData = {
  id: string; // stable per-session ID
  fileName: string;
  parsedData: ParsedData;
  stringData: string;
  metrics: Metrics;
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

export type PartialAISummary = {
  keyInsights?: string[];
  columnAnalyses?: ColumnAnalysis[];
  rowLevelFindings?: RowFinding[];
  dataQualityIssues?: DataQualityIssue[];
  isComplete?: boolean;
  progress?: number;
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
  // Multi-document extensions (optional for backward compatibility)
  documents?: DocumentData[];
  combinedParsedData?: ParsedData;
  combinedStringData?: string;
  combinedMetrics?: Metrics;
  documentSummaries?: Record<string, AISummary>;
  combinedSummary?: AISummary;
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
