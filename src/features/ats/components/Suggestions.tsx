"use client";

interface SuggestionsProps {
  skillsGaps: string[];
  suggestions: string[];
}

export function Suggestions({ skillsGaps, suggestions }: SuggestionsProps) {
  return (
    <div className="space-y-4">
      {/* Skills Gaps */}
      {skillsGaps.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Skills Gaps ({skillsGaps.length})
          </h4>
          <ul className="space-y-1.5">
            {skillsGaps.map((gap, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800"
              >
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Improvement Suggestions ({suggestions.length})
          </h4>
          <ul className="space-y-1.5">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-gray-700"
              >
                <span className="text-blue-600 font-semibold mt-0.5 flex-shrink-0">{index + 1}.</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {skillsGaps.length === 0 && suggestions.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No suggestions available.
        </p>
      )}
    </div>
  );
}
