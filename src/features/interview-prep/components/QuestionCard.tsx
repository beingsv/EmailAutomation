"use client";

import { useState } from "react";
import { InterviewQuestion } from "../types";

interface QuestionCardProps {
  question: InterviewQuestion;
  index: number;
}

const categoryStyles: Record<InterviewQuestion["category"], { badge: string; label: string }> = {
  technical: {
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    label: "Technical",
  },
  behavioral: {
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    label: "Behavioral",
  },
  "role-specific": {
    badge: "bg-orange-50 text-orange-700 border border-orange-200",
    label: "Role-Specific",
  },
};

export function QuestionCard({ question, index }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = categoryStyles[question.category];

  return (
    <div className="rounded-lg border border-gray-300 bg-gray-100/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-medium text-gray-400 mt-0.5 flex-shrink-0">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{question.question}</p>
          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
            {style.label}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-300">
          <div className="ml-7">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Suggested Answer
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {question.suggestedAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
