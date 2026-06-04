"use client";

import { BulkSendResult, SmartBulkSendResult } from "../types";

interface BulkSendProgressProps {
  sendProgress: {
    current: number;
    total: number;
    recipientEmail?: string;
    contactType?: 'hr' | 'tech';
  } | null;
  sendResults: BulkSendResult | SmartBulkSendResult | null;
  isSending: boolean;
}

function isSmartResult(result: BulkSendResult | SmartBulkSendResult): result is SmartBulkSendResult {
  return 'totalHrSent' in result;
}

export function BulkSendProgress({
  sendProgress,
  sendResults,
  isSending,
}: BulkSendProgressProps) {
  // Nothing to show if not sending and no results
  if (!isSending && !sendResults) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Progress indicator during sending */}
      {isSending && sendProgress && (
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          <p className="text-sm text-gray-600">
            Sending {sendProgress.current} of {sendProgress.total}
            {sendProgress.contactType && (
              <span className="ml-1">
                — {sendProgress.contactType === 'tech' ? 'Tech' : 'HR'} contact
              </span>
            )}
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
                className="w-5 h-5 text-green-500 flex-shrink-0"
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
                className="w-5 h-5 text-yellow-500 flex-shrink-0"
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
            <p className="text-sm font-medium text-gray-900">
              {isSmartResult(sendResults)
                ? sendResults.totalFailed === 0
                  ? `All ${sendResults.totalHrSent + sendResults.totalReferralSent} emails sent successfully`
                  : `Sending complete with ${sendResults.totalFailed} failure${sendResults.totalFailed > 1 ? 's' : ''}`
                : sendResults.totalFailed === 0
                  ? `All ${sendResults.totalSent} emails sent successfully`
                  : `${sendResults.totalSent} sent, ${sendResults.totalFailed} failed`}
            </p>
          </div>

          {/* Extended breakdown for smart send results */}
          {isSmartResult(sendResults) && (
            <div className="flex gap-4 text-xs text-gray-600 border-t border-gray-100 pt-2">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                HR sent: {sendResults.totalHrSent}
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                Referral sent: {sendResults.totalReferralSent}
              </span>
              {sendResults.totalFailed > 0 && (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  Failed: {sendResults.totalFailed}
                </span>
              )}
            </div>
          )}

          {/* Per-recipient status list */}
          <ul className="space-y-1">
            {sendResults.results.map((result) => (
              <li
                key={result.email}
                className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
              >
                <span className="text-xs text-gray-600 truncate mr-2">
                  {result.email}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {'contactType' in result && result.contactType && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        result.contactType === 'hr'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {result.contactType === 'hr' ? 'HR' : 'Tech'}
                    </span>
                  )}
                  {result.success ? (
                    <span className="text-xs text-green-600">Sent</span>
                  ) : (
                    <span className="text-xs text-red-600" title={result.error}>
                      Failed
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
