export interface ResumeResult {
  success: boolean;
  extractedText?: string;
  error?: "INVALID_TYPE" | "SIZE_EXCEEDED" | "EXTRACTION_FAILED" | "LOW_TEXT_CONTENT";
  characterCount?: number;
}

export interface ResumeData {
  id: string;
  userId: string;
  filename: string;
  filePath: string;
  extractedText: string;
  characterCount: number;
  uploadedAt: Date;
}
