"use client";

import { useState } from "react";

interface ATSFormProps {
  onAnalyze: (jobDescription: string) => void;
  isAnalyzing: boolean;
}

const MIN_CHARS = 100;

export function ATSForm({ onAnalyze, isAnalyzing }: ATSFormProps) {
  const [jobDescription, setJobDescription] = useState("");

  const charCount = jobDescription.length;
  const isValid = charCount >= MIN_CHARS;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid && !isAnalyzing) {
      onAnalyze(jobDescription);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
          Job Description
        </label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here (minimum 100 characters)..."
          rows={8}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs ${isValid ? "text-emerald-600" : "text-gray-400"}`}>
            {charCount} / {MIN_CHARS} min characters
            {!isValid && charCount > 0 && (
              <span className="text-yellow-700 ml-2">
                ({MIN_CHARS - charCount} more needed)
              </span>
            )}
          </span>
          {isValid && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Ready to analyze
            </span>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isAnalyzing}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analyze Compatibility
          </>
        )}
      </button>
    </form>
  );
}
