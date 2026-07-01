export const emotionOrder = ["JOY", "ANGER", "SADNESS", "FEAR", "SURPRISE", "DISGUST", "NEUTRAL"] as const;

export type EmotionName = (typeof emotionOrder)[number];

export interface EmotionScore {
  emotion: EmotionName;
  score: number;
}

export interface AnalysisResult {
  id: string;
  text: string;
  sentiment: number;
  primaryEmotion: EmotionName;
  emotions: EmotionScore[];
  tags: string[];
  summary: string;
  confidenceScore: number;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
  subjectivity?: number;
  vaderCompound?: number;
  mlSentiment?: number;
}

export interface TopicCluster {
  topicId: number;
  keywords: string[];
  percentage: number;
  count: number;
}

export interface ForecastPoint {
  index: number;
  sentiment: number;
  isForecast: boolean;
}

export interface BatchStatsResponse {
  topics: TopicCluster[];
  forecast: ForecastPoint[];
  eda_plots?: Record<string, string>;
}



export interface BatchItem {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ColumnMapping {
  reviewColumn: string | null;
  productName: string | null;
  brand: string | null;
  modelNumber: string | null;
}

export interface HistoryEntry {
  id: string;
  kind: "single" | "batch";
  title: string;
  sourceName?: string;
  results: AnalysisResult[];
  primaryEmotion: EmotionName;
  averageSentiment: number;
  createdAt: number;
}


export interface DatasetRow {
  [key: string]: unknown;
}

export interface BatchProgress {
  completed: number;
  total: number;
  latestResult?: AnalysisResult;
}
