"use client";

import { useState } from "react";
import { GeneratedEmail } from "../types";

interface EmailPreviewProps {
  email: GeneratedEmail;
  onUpdateField: (field: keyof GeneratedEmail, value: string) => void;
  onSend?: () => void;
  isSending?: boolean;
}

export function EmailPreview({ email, onUpdateField, onSend, isSending }: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const fullText = `Subject: ${email.subject}\n\n${email.greeting}\n\n${email.body}\n\n${email.closing}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">Generated Email</h3>
        <span className="text-xs text-gray-500">All fields are editable</span>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="emailSubject" className="block text-xs font-medium text-gray-400 mb-1">
          Subject
        </label>
        <input
          id="emailSubject"
          type="text"
          value={email.subject}
          onChange={(e) => onUpdateField("subject", e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Greeting */}
      <div>
        <label htmlFor="emailGreeting" className="block text-xs font-medium text-gray-400 mb-1">
          Greeting
        </label>
        <input
          id="emailGreeting"
          type="text"
          value={email.greeting}
          onChange={(e) => onUpdateField("greeting", e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Body */}
      <div>
        <label htmlFor="emailBody" className="block text-xs font-medium text-gray-400 mb-1">
          Body
        </label>
        <textarea
          id="emailBody"
          value={email.body}
          onChange={(e) => onUpdateField("body", e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
        />
      </div>

      {/* Closing */}
      <div>
        <label htmlFor="emailClosing" className="block text-xs font-medium text-gray-400 mb-1">
          Closing
        </label>
        <input
          id="emailClosing"
          type="text"
          value={email.closing}
          onChange={(e) => onUpdateField("closing", e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-gray-700 flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy to Clipboard
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Email
            </>
          )}
        </button>
      </div>
    </div>
  );
}
