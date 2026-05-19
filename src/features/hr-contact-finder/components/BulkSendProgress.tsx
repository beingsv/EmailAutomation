"use client";

import { BulkSendResult } from "../types";

interface BulkSendProgressProps {
  sendProgress: { current: number; total: number } | null;
  sendResults: BulkSendResult | null;
  isSending: boolean;
}

export function BulkSendProgress({
  sendProgress,
  sendResults,
  isSending,
}: BulkSendProgressProps) {
  // Nothing to show if not sending and no results
  if (!isSending && !sendResults) return null;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      {/* Progress indicator during sending */}
      {isSending && sendProgress && (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
          <p className="text-sm text-gray-300">
            Sending {sendProgress.current} of {sendProgress.total}...
          </p>
        </div>
      )}

      {/* Final summary after sending completes */}
      {!isSending && sendResults && (
        <div className="space-y-3">
          {/* Summary counts */}
          <div className="flex items-center gap-2">
            {sendResults.totalFailed === 0 ? (
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-yellow-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            )}
            <p className="text-sm font-medium text-white">
              {sendResults.totalFailed === 0
                ? `All ${sendResults.totalSent} emails sent successfully`
                : `${sendResults.totalSent} sent, ${sendResults.totalFailed} failed`}
            </p>
          </div>

          {/* Per-recipient status list */}
          <ul className="space-y-1">
            {sendResults.results.map((result) => (
              <li
                key={result.email}
                className="flex items-center justify-between rounded bg-gray-800 px-3 py-2"
              >
                <span className="text-xs text-gray-300 truncate mr-2">
                  {result.email}
                </span>
                {result.success ? (
                  <span className="text-xs text-green-400 flex-shrink-0">
                    Sent
                  </span>
                ) : (
                  <span
                    className="text-xs text-red-400 flex-shrink-0"
                    title={result.error}
                  >
                    Failed
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
