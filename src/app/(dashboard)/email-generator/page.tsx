"use client";

import Link from "next/link";
import { EmailGeneratorForm } from "@/features/email/components/EmailGeneratorForm";
import { EmailPreview } from "@/features/email/components/EmailPreview";
import { useEmailGenerator } from "@/features/email/hooks/useEmailGenerator";

export default function EmailGeneratorPage() {
  const {
    generatedEmail,
    isGenerating,
    isSending,
    sendSuccess,
    sendError,
    error,
    hasResume,
    isCheckingResume,
    generate,
    sendEmail,
    updateField,
    retry,
    clearError,
  } = useEmailGenerator();

  // Loading state while checking resume
  if (isCheckingResume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Generator</h1>
          <p className="mt-1 text-gray-400">Generate tailored job application emails using AI.</p>
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
          <h1 className="text-2xl font-bold text-white">Email Generator</h1>
          <p className="mt-1 text-gray-400">Generate tailored job application emails using AI.</p>
        </div>
        <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-white mb-2">Please upload a resume first</h3>
          <p className="text-gray-400 mb-4">
            A resume is required to generate personalized job application emails.
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
        <h1 className="text-2xl font-bold text-white">Email Generator</h1>
        <p className="mt-1 text-gray-400">Generate tailored job application emails using AI.</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Form */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Job Details</h2>
          <EmailGeneratorForm onGenerate={generate} isGenerating={isGenerating} />
        </div>

        {/* Right column: Preview */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Email Preview</h2>

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 mb-4">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400 mb-4" />
              <p className="text-sm text-gray-400">Generating your email...</p>
              <p className="text-xs text-gray-500 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Generated email preview */}
          {!isGenerating && generatedEmail && (
            <>
              {sendSuccess && (
                <div className="rounded-lg border border-green-700 bg-green-900/30 p-4 mb-4">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {sendSuccess}
                  </p>
                </div>
              )}
              {sendError && (
                <div className="rounded-lg border border-red-700 bg-red-900/30 p-4 mb-4">
                  <p className="text-sm text-red-400">{sendError}</p>
                </div>
              )}
              <EmailPreview
                email={generatedEmail}
                onUpdateField={updateField}
                onSend={sendEmail}
                isSending={isSending}
              />
            </>
          )}

          {/* Empty state */}
          {!isGenerating && !generatedEmail && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-12 h-12 text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">Your generated email will appear here</p>
              <p className="text-xs text-gray-500 mt-1">Fill in the job details and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
