"use client";

import { useState, FormEvent } from "react";
import { isValidEmail } from "@/shared/lib/validation";

interface EmailGeneratorFormProps {
  onGenerate: (jobDescription: string, hrEmail: string) => void;
  isGenerating: boolean;
}

export function EmailGeneratorForm({ onGenerate, isGenerating }: EmailGeneratorFormProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [jdError, setJdError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const jdLength = jobDescription.length;
  const jdMinLength = 50;
  const isJdValid = jdLength >= jdMinLength;
  const isEmailValid = hrEmail.length === 0 || isValidEmail(hrEmail);
  const canSubmit = isJdValid && hrEmail.length > 0 && isValidEmail(hrEmail) && !isGenerating;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate JD
    if (!isJdValid) {
      setJdError(`Job description must be at least ${jdMinLength} characters.`);
      return;
    } else {
      setJdError(null);
    }

    // Validate email
    if (!hrEmail || !isValidEmail(hrEmail)) {
      setEmailError("Please enter a valid email address.");
      setEmailTouched(true);
      return;
    } else {
      setEmailError(null);
    }

    onGenerate(jobDescription, hrEmail);
  }

  function handleEmailBlur() {
    setEmailTouched(true);
    if (hrEmail && !isValidEmail(hrEmail)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError(null);
    }
  }

  function handleEmailChange(value: string) {
    setHrEmail(value);
    if (emailTouched) {
      if (value && !isValidEmail(value)) {
        setEmailError("Please enter a valid email address.");
      } else {
        setEmailError(null);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Job Description Textarea */}
      <div>
        <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-300 mb-2">
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
          rows={8}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-y"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <div>
            {jdError && (
              <p className="text-sm text-red-400">{jdError}</p>
            )}
          </div>
          <span className={`text-xs ${isJdValid ? "text-green-400" : "text-gray-400"}`}>
            {jdLength}/{jdMinLength} characters {isJdValid ? "✓" : "(minimum)"}
          </span>
        </div>
      </div>

      {/* HR Email Input */}
      <div>
        <label htmlFor="hrEmail" className="block text-sm font-medium text-gray-300 mb-2">
          HR / Recruiter Email
        </label>
        <input
          id="hrEmail"
          type="email"
          value={hrEmail}
          onChange={(e) => handleEmailChange(e.target.value)}
          onBlur={handleEmailBlur}
          placeholder="hr@company.com"
          className={`w-full rounded-lg border ${
            emailError ? "border-red-700" : "border-gray-700"
          } bg-gray-800 px-4 py-3 text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none`}
        />
        {emailError && (
          <p className="mt-1.5 text-sm text-red-400">{emailError}</p>
        )}
      </div>

      {/* Generate Button */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
