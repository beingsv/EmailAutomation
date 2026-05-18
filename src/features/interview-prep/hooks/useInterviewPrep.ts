"use client";

import { useState, useEffect, useCallback } from "react";
import { InterviewPrepResult } from "../types";

interface UseInterviewPrepReturn {
  result: InterviewPrepResult | null;
  isGenerating: boolean;
  error: string | null;
  hasResume: boolean | null;
  isCheckingResume: boolean;
  generate: (jobDescription: string) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  retry: () => void;
}

export function useInterviewPrep(): UseInterviewPrepReturn {
  const [result, setResult] = useState<InterviewPrepResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  const [lastJobDescription, setLastJobDescription] = useState<string | null>(null);

  // Check if user has a resume on mount
  useEffect(() => {
    async function checkResume() {
      setIsCheckingResume(true);
      try {
        const res = await fetch("/api/resume");
        if (res.ok) {
          const data = await res.json();
          setHasResume(!!data.resumeText);
        } else {
          setHasResume(false);
        }
      } catch {
        setHasResume(false);
      } finally {
        setIsCheckingResume(false);
      }
    }
    checkResume();
  }, []);

  const generate = useCallback(async (jobDescription: string) => {
    setIsGenerating(true);
    setError(null);
    setLastJobDescription(jobDescription);

    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NO_RESUME") {
          setHasResume(false);
          setError("Please upload a resume first before generating questions.");
        } else if (data.code === "VALIDATION_ERROR") {
          setError(data.error || "Job description must be at least 50 characters.");
        } else if (res.status === 503) {
          setError("AI service is temporarily unavailable. Please try again later.");
        } else {
          setError(data.error || "Failed to generate questions. Please try again.");
        }
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(() => {
    if (lastJobDescription) {
      generate(lastJobDescription);
    }
  }, [lastJobDescription, generate]);

  return {
    result,
    isGenerating,
    error,
    hasResume,
    isCheckingResume,
    generate,
    clearResult,
    clearError,
    retry,
  };
}
