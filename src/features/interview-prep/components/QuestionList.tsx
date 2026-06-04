"use client";

import React from "react";
import { InterviewQuestion } from "../types";
import { QuestionCard } from "./QuestionCard";

interface QuestionListProps {
  questions: InterviewQuestion[];
}

const categoryOrder: InterviewQuestion["category"][] = ["technical", "behavioral", "role-specific"];

const categoryLabels: Record<InterviewQuestion["category"], string> = {
  technical: "Technical Questions",
  behavioral: "Behavioral Questions",
  "role-specific": "Role-Specific Questions",
};

const categoryIcons: Record<InterviewQuestion["category"], React.ReactNode> = {
  technical: (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  behavioral: (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  "role-specific": (
    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
};

export function QuestionList({ questions }: QuestionListProps) {
  // Group questions by category
  const grouped = categoryOrder.reduce((acc, category) => {
    acc[category] = questions.filter((q) => q.category === category);
    return acc;
  }, {} as Record<InterviewQuestion["category"], InterviewQuestion[]>);

  // Track global index for numbering
  let globalIndex = 0;

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const categoryQuestions = grouped[category];
        if (categoryQuestions.length === 0) return null;

        const startIndex = globalIndex;
        globalIndex += categoryQuestions.length;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-4">
              {categoryIcons[category]}
              <h3 className="text-lg font-semibold text-gray-900">
                {categoryLabels[category]}
              </h3>
              <span className="text-xs text-gray-500 ml-1">
                ({categoryQuestions.length})
              </span>
            </div>
            <div className="space-y-3">
              {categoryQuestions.map((question, idx) => (
                <QuestionCard
                  key={`${category}-${idx}`}
                  question={question}
                  index={startIndex + idx}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
