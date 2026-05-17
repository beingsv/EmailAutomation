export interface InterviewPrepResult {
  questions: InterviewQuestion[];
  tips: string[];
}

export interface InterviewQuestion {
  question: string;
  category: "technical" | "behavioral" | "role-specific";
  suggestedAnswer: string;
}
