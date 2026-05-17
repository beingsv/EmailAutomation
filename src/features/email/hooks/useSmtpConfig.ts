"use client";

import { useState, useEffect, useCallback } from "react";

interface SmtpStatus {
  configured: boolean;
  host?: string;
  port?: number;
  username?: string;
}

interface SmtpFormData {
  host: string;
  port: number;
  username: string;
  password: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useSmtpConfig() {
  const [status, setStatus] = useState<SmtpStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/email/smtp-config");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Silently fail — status stays null
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const testConnection = async (config: SmtpFormData): Promise<boolean> => {
    setIsTesting(true);
    setTestResult(null);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/email/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || "Connection successful" });
        return true;
      } else {
        setTestResult({ success: false, error: data.error || "Connection test failed" });
        return false;
      }
    } catch {
      setTestResult({ success: false, error: "Network error — could not reach server" });
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async (config: SmtpFormData): Promise<boolean> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/email/smtp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveSuccess(true);
        // Reload config to show updated masked status
        await loadConfig();
        return true;
      } else {
        setSaveError(data.error || "Failed to save configuration");
        return false;
      }
    } catch {
      setSaveError("Network error — could not reach server");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const resetTestResult = () => {
    setTestResult(null);
    setSaveSuccess(false);
    setSaveError(null);
  };

  return {
    status,
    isLoading,
    isTesting,
    isSaving,
    testResult,
    saveError,
    saveSuccess,
    testConnection,
    saveConfig,
    resetTestResult,
  };
}
