export interface ATSResult {
  overallScore: number;
  keywordScore: number;
  llmScore: number | null;
  matchedKeywords: string[];
  missingKeywords: string[];
  skillsGaps: string[];
  suggestions: string[];
  aiUnavailable: boolean;
}

export interface KeywordAnalysis {
  keywordScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  tfidfSimilarity: number;
}
