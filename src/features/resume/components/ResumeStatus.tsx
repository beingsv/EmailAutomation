"use client";

import { useState } from "react";

interface ResumeStatusProps {
  resumeText: string;
  characterCount: number;
  filename?: string;
  onDelete: () => Promise<boolean>;
  onReplace: () => void;
}

export function ResumeStatus({
  resumeText,
  characterCount,
  filename,
  onDelete,
  onReplace,
}: ResumeStatusProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setShowConfirmDelete(false);
  };

  const previewText = resumeText.slice(0, 500);
  const isTruncated = resumeText.length > 500;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-gray-900 font-medium">
              {filename || "Resume"}
            </h3>
            <p className="text-sm text-gray-400">
              {characterCount.toLocaleString()} characters extracted
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReplace}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-300 hover:bg-gray-100 rounded-md transition-colors"
          >
            Replace
          </button>
          {!showConfirmDelete ? (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-300 hover:bg-gray-100 rounded-md transition-colors"
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm bg-red-900/50 text-red-600 border border-red-200 hover:bg-red-900/70 rounded-md transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Text Preview */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Text Preview</h4>
        <div className="bg-gray-100 border border-gray-300 rounded-md p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
            {previewText}
            {isTruncated && (
              <span className="text-gray-400">... (showing first 500 characters)</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ResumeEmptyState() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-3">
        <div className="p-3 bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
      <h3 className="text-gray-900 font-medium mb-1">No resume uploaded</h3>
      <p className="text-sm text-gray-400">
        Upload a PDF resume to get started with AI-powered email generation, ATS scoring, and interview prep.
      </p>
    </div>
  );
}
