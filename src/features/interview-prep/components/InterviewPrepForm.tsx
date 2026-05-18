"use client";

import { useState } from "react";

interface InterviewPrepFormProps {
  onGenerate: (jobDescription: string) => void;
  isGenerating: boolean;
}

const MIN_CHARS = 50;

export function InterviewPrepForm({ onGenerate, isGenerating }: InterviewPrepFormProps) {
  const [jobDescription, setJobDescription] = useState("");

  const charCount = jobDescription.length;
  const isValid = charCount >= MIN_CHARS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid && !isGenerating) {
      onGenerate(jobDescription);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="jd-input" className="block text-sm font-medium text-gray-300 mb-2">
          Job Description
        </label>
        <textarea
          id="jd-input"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here (minimum 50 characters)..."
          rows={6}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${isValid ? "text-green-400" : "text-gray-400"}`}>
            {charCount} / {MIN_CHARS} min characters
            {!isValid && charCount > 0 && (
              <span className="text-yellow-400 ml-2">
                ({MIN_CHARS - charCount} more needed)
              </span>
            )}
          </span>
          {isValid && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ready to generate
            </span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isGenerating}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Generating Questions...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Generate Interview Questions
          </>
        )}
      </button>
    </form>
  );
}
