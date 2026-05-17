"use client";

import { useState, useEffect, useCallback } from "react";
import { GeneratedEmail } from "../types";

interface UseEmailGeneratorReturn {
  generatedEmail: GeneratedEmail | null;
  isGenerating: boolean;
  isSending: boolean;
  sendSuccess: string | null;
  sendError: string | null;
  error: string | null;
  hasResume: boolean | null;
  isCheckingResume: boolean;
  generate: (jobDescription: string, hrEmail: string) => Promise<void>;
  sendEmail: () => Promise<void>;
  updateField: (field: keyof GeneratedEmail, value: string) => void;
  clearEmail: () => void;
  clearError: () => void;
  retry: () => void;
}

export function useEmailGenerator(): UseEmailGeneratorReturn {
  const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [isCheckingResume, setIsCheckingResume] = useState(true);
  const [lastParams, setLastParams] = useState<{ jobDescription: string; hrEmail: string } | null>(null);

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

  const generate = useCallback(async (jobDescription: string, hrEmail: string) => {
    setIsGenerating(true);
    setError(null);
    setLastParams({ jobDescription, hrEmail });

    try {
      const res = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, hrEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NO_RESUME") {
          setHasResume(false);
          setError("Please upload a resume first before generating an email.");
        } else if (data.code === "AI_SERVICE_ERROR") {
          setError("AI service is temporarily unavailable. Please try again.");
        } else {
          setError(data.error || "Failed to generate email. Please try again.");
        }
        return;
      }

      setGeneratedEmail(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const updateField = useCallback((field: keyof GeneratedEmail, value: string) => {
    setGeneratedEmail((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Rebuild fullContent when fields change
      updated.fullContent = `${updated.subject}\n\n${updated.greeting}\n\n${updated.body}\n\n${updated.closing}`;
      return updated;
    });
  }, []);

  const clearEmail = useCallback(() => {
    setGeneratedEmail(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(() => {
    if (lastParams) {
      generate(lastParams.jobDescription, lastParams.hrEmail);
    }
  }, [lastParams, generate]);

  const sendEmail = useCallback(async () => {
    if (!generatedEmail || !lastParams) return;

    setIsSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const fullBody = `${generatedEmail.greeting}\n\n${generatedEmail.body}\n\n${generatedEmail.closing}`;

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lastParams.hrEmail,
          subject: generatedEmail.subject,
          body: fullBody,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.code === "SMTP_NOT_CONFIGURED") {
          setSendError("SMTP not configured. Please set up your email settings in Settings first.");
        } else {
          setSendError(data.error || "Failed to send email. You can copy the content instead.");
        }
        return;
      }

      setSendSuccess(`Email sent to ${data.recipientEmail} at ${new Date(data.timestamp).toLocaleString()}`);
    } catch {
      setSendError("Network error. Please check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }, [generatedEmail, lastParams]);

  return {
    generatedEmail,
    isGenerating,
    isSending,
    sendSuccess,
    sendError,
    error,
    hasResume,
    isCheckingResume,
    generate,
    sendEmail,
    updateField,
    clearEmail,
    clearError,
    retry,
  };
}
