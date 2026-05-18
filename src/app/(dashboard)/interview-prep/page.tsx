"use client";

import Link from "next/link";
import { InterviewPrepForm } from "@/features/interview-prep/components/InterviewPrepForm";
import { QuestionList } from "@/features/interview-prep/components/QuestionList";
import { PrepTips } from "@/features/interview-prep/components/PrepTips";
import { useInterviewPrep } from "@/features/interview-prep/hooks/useInterviewPrep";

export default function InterviewPrepPage() {
  const {
    result,
    isGenerating,
    error,
    hasResume,
    isCheckingResume,
    generate,
    clearError,
    retry,
  } = useInterviewPrep();

  // Loading state while checking resume
  if (isCheckingResume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Interview Preparation</h1>
          <p className="mt-1 text-gray-400">Generate tailored interview questions and preparation tips.</p>
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
          <h1 className="text-2xl font-bold text-white">Interview Preparation</h1>
          <p className="mt-1 text-gray-400">Generate tailored interview questions and preparation tips.</p>
        </div>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Please upload a resume first</h3>
          <p className="text-gray-400 mb-4">
            A resume is required to generate personalized interview questions tailored to your experience.
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
        <h1 className="text-2xl font-bold text-white">Interview Preparation</h1>
        <p className="mt-1 text-gray-400">Generate tailored interview questions and preparation tips.</p>
      </div>

      {/* Form Section */}
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Job Description</h2>
        <InterviewPrepForm onGenerate={generate} isGenerating={isGenerating} />
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
      {isGenerating && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mb-4" />
            <p className="text-sm text-gray-400">Generating interview questions...</p>
            <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {!isGenerating && result && (
        <div className="space-y-6">
          {/* Questions grouped by category */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 mb-6">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">
                Interview Questions ({result.questions.length})
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Click on a question to expand the suggested answer.
            </p>
            <QuestionList questions={result.questions} />
          </div>

          {/* Tips Section */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Preparation Tips</h2>
            </div>
            <PrepTips tips={result.tips} />
          </div>
        </div>
      )}
    </div>
  );
}
