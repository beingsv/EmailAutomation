"use client";

import Link from "next/link";
import { ATSForm } from "@/features/ats/components/ATSForm";
import { ScoreDisplay } from "@/features/ats/components/ScoreDisplay";
import { KeywordBreakdown } from "@/features/ats/components/KeywordBreakdown";
import { Suggestions } from "@/features/ats/components/Suggestions";
import { useATSScorer } from "@/features/ats/hooks/useATSScorer";

export default function ATSScorerPage() {
  const {
    result,
    isAnalyzing,
    error,
    hasResume,
    isCheckingResume,
    analyze,
    clearError,
    retry,
  } = useATSScorer();

  // Loading state while checking resume
  if (isCheckingResume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ATS Compatibility Scorer</h1>
          <p className="mt-1 text-gray-400">Check how well your resume matches a job description.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
        </div>
      </div>
    );
  }

  // No resume uploaded state
  if (hasResume === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">ATS Compatibility Scorer</h1>
          <p className="mt-1 text-gray-400">Check how well your resume matches a job description.</p>
        </div>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Please upload a resume first</h3>
          <p className="text-gray-400 mb-4">
            A resume is required to analyze ATS compatibility with job descriptions.
          </p>
          <Link
            href="/resume"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Resume
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">ATS Compatibility Scorer</h1>
        <p className="mt-1 text-gray-400">Check how well your resume matches a job description.</p>
      </div>

      {/* Form Section */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Job Description</h2>
        <ATSForm onAnalyze={analyze} isAnalyzing={isAnalyzing} />
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-700 bg-red-900/30 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => {
                  clearError();
                  retry();
                }}
                className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isAnalyzing && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mb-4" />
            <p className="text-sm text-gray-400">Analyzing your resume against the job description...</p>
            <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {!isAnalyzing && result && (
        <div className="space-y-6">
          {/* Score Gauge - Prominent, centered */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">Overall Score</h2>
            <ScoreDisplay
              overallScore={result.overallScore}
              keywordScore={result.keywordScore}
              llmScore={result.llmScore}
              aiUnavailable={result.aiUnavailable}
            />
          </div>

          {/* Two-column layout: Keywords left, Suggestions right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Keywords */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Keyword Analysis</h2>
              <KeywordBreakdown
                matchedKeywords={result.matchedKeywords}
                missingKeywords={result.missingKeywords}
              />
            </div>

            {/* Suggestions */}
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recommendations</h2>
              <Suggestions
                skillsGaps={result.skillsGaps}
                suggestions={result.suggestions}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
