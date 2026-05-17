"use client";

import { useState, useEffect, useCallback } from "react";

interface ResumeInfo {
  resumeText: string;
  characterCount: number;
  filename?: string;
}

interface UploadResult {
  message: string;
  characterCount: number;
  extractedText: string;
}

interface UseResumeReturn {
  resume: ResumeInfo | null;
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  success: string | null;
  fetchResume: () => Promise<void>;
  uploadResume: (file: File) => Promise<boolean>;
  deleteResume: () => Promise<boolean>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useResume(): UseResumeReturn {
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  const fetchResume = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resume");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Please log in to view your resume.");
          return;
        }
        throw new Error("Failed to fetch resume");
      }
      const data = await res.json();
      if (data.resumeText) {
        setResume({
          resumeText: data.resumeText,
          characterCount: data.resumeText.length,
          filename: data.filename,
        });
      } else {
        setResume(null);
      }
    } catch {
      setError("Failed to load resume. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadResume = useCallback(async (file: File): Promise<boolean> => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    setUploadProgress(0);

    // Client-side validation
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("File must be a PDF");
      setIsUploading(false);
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB limit");
      setIsUploading(false);
      return false;
    }

    try {
      // Simulate progress stages
      setUploadProgress(20);

      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(50);

      const res = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      const data = await res.json();

      if (!res.ok) {
        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          INVALID_TYPE: "File must be a PDF",
          SIZE_EXCEEDED: "File exceeds 5MB limit",
          EXTRACTION_FAILED: "Could not extract text from PDF. Please try re-uploading.",
          LOW_TEXT_CONTENT: "This appears to be a scanned PDF — please upload a text-based PDF",
        };
        const message = data.code ? errorMessages[data.code] || data.error : data.error;
        setError(message || "Upload failed. Please try again.");
        setIsUploading(false);
        setUploadProgress(0);
        return false;
      }

      setUploadProgress(100);

      const result = data as UploadResult;
      setResume({
        resumeText: result.extractedText,
        characterCount: result.characterCount,
        filename: file.name,
      });
      setSuccess("Resume uploaded successfully!");

      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 1000);
      return true;
    } catch {
      setError("Upload failed. Please check your connection and try again.");
      setUploadProgress(0);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const deleteResume = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete resume");
      }
      setResume(null);
      setSuccess("Resume deleted successfully.");
      return true;
    } catch {
      setError("Failed to delete resume. Please try again.");
      return false;
    }
  }, []);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  return {
    resume,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    success,
    fetchResume,
    uploadResume,
    deleteResume,
    clearError,
    clearSuccess,
  };
}
