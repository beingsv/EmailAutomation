"use client";

import { useState, useEffect, useCallback } from "react";
import { ATSResult } from "../types";

interface UseATSScorerReturn {
  result: ATSResult | null;
  isAnalyzing: boolean;
  error: string | null;
  hasResume: boolean | null;
  isCheckingResume: boolean;
  analyze: (jobDescription: string) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  retry: () => void;
}

export function useATSScorer(): UseATSScorerReturn {
  const [result, setResult] = useState<ATSResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const analyze = useCallback(async (jobDescription: string) => {
    setIsAnalyzing(true);
    setError(null);
    setLastJobDescription(jobDescription);

    try {
      const res = await fetch("/api/ats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NO_RESUME") {
          setHasResume(false);
          setError("Please upload a resume first before analyzing.");
        } else if (data.code === "VALIDATION_ERROR") {
          setError(data.error || "Job description must be at least 100 characters.");
        } else {
          setError(data.error || "Failed to analyze. Please try again.");
        }
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
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
      analyze(lastJobDescription);
    }
  }, [lastJobDescription, analyze]);

  return {
    result,
    isAnalyzing,
    error,
    hasResume,
    isCheckingResume,
    analyze,
    clearResult,
    clearError,
    retry,
  };
}
