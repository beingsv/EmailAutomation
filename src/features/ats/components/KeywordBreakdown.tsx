"use client";

interface KeywordBreakdownProps {
  matchedKeywords: string[];
  missingKeywords: string[];
}

export function KeywordBreakdown({ matchedKeywords, missingKeywords }: KeywordBreakdownProps) {
  return (
    <div className="space-y-4">
      {/* Matched Keywords */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Matched Keywords ({matchedKeywords.length})
        </h4>
        {matchedKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matchedKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No matched keywords found</p>
        )}
      </div>

      {/* Missing Keywords */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Missing Keywords ({missingKeywords.length})
        </h4>
        {missingKeywords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {missingKeywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No missing keywords — great match!</p>
        )}
      </div>
    </div>
  );
}
