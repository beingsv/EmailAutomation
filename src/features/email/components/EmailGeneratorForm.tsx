"use client";

import { useState, FormEvent } from "react";

interface EmailGeneratorFormProps {
  onGenerate: (jobDescription: string, hrEmail: string) => void;
  isGenerating: boolean;
  onHrEmailChange?: (email: string) => void;
}

export function EmailGeneratorForm({ onGenerate, isGenerating }: EmailGeneratorFormProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [jdError, setJdError] = useState<string | null>(null);

  const jdLength = jobDescription.length;
  const jdMinLength = 50;
  const isJdValid = jdLength >= jdMinLength;
  const canSubmit = isJdValid && !isGenerating;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!isJdValid) {
      setJdError(`Job description must be at least ${jdMinLength} characters.`);
      return;
    } else {
      setJdError(null);
    }

    onGenerate(jobDescription, "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Job Description Textarea */}
      <div className="space-y-2">
        <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-600">
          Job Description
        </label>
        <textarea
          id="jobDescription"
          value={jobDescription}
          onChange={(e) => {
            setJobDescription(e.target.value);
            if (jdError && e.target.value.length >= jdMinLength) {
              setJdError(null);
            }
          }}
          placeholder="Paste the job description here (minimum 50 characters)..."
          rows={10}
          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 transition-all duration-300 focus:bg-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-y"
        />
        <div className="flex items-center justify-between">
          <div>
            {jdError && (
              <p className="text-xs text-red-600">{jdError}</p>
            )}
          </div>
          <span className={`text-xs font-medium ${isJdValid ? "text-emerald-600" : "text-gray-400"}`}>
            {jdLength}/{jdMinLength} {isJdValid ? "✓" : "min"}
          </span>
        </div>
      </div>

      {/* Generate Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2.5 ${
          canSubmit
            ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            : "bg-gray-300 cursor-not-allowed opacity-50"
        }`}
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Email
          </>
        )}
      </button>
    </form>
  );
}
