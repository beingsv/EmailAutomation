"use client";

import { useRef } from "react";
import { useResume } from "@/features/resume/hooks/useResume";
import { ResumeUploader } from "@/features/resume/components/ResumeUploader";
import { ResumeStatus, ResumeEmptyState } from "@/features/resume/components/ResumeStatus";

export default function ResumePage() {
  const {
    resume,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    success,
    uploadResume,
    deleteResume,
    clearError,
    clearSuccess,
  } = useResume();

  const uploaderRef = useRef<HTMLDivElement>(null);

  const scrollToUploader = () => {
    uploaderRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Resume Management</h1>
        <p className="text-gray-400 mt-1">
          Upload your resume to power AI-generated emails, ATS scoring, and interview prep.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-emerald-600">{success}</p>
          </div>
          <button
            onClick={clearSuccess}
            className="text-emerald-600 hover:text-green-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Upload Section */}
      <div ref={uploaderRef} className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {resume ? "Upload New Resume" : "Upload Resume"}
        </h2>
        <ResumeUploader
          onUpload={uploadResume}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {/* Resume Status Section */}
      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="h-32 bg-gray-100 rounded-md mt-4" />
          </div>
        </div>
      ) : resume ? (
        <ResumeStatus
          resumeText={resume.resumeText}
          characterCount={resume.characterCount}
          filename={resume.filename}
          onDelete={deleteResume}
          onReplace={scrollToUploader}
        />
      ) : (
        <ResumeEmptyState />
      )}
    </div>
  );
}
