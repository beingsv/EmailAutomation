"use client";

import { useEffect, useState } from "react";

interface HealthStatus {
  status: "connected" | "disconnected";
  latencyMs?: number;
  error?: string;
}

export function AIStatusIndicator() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data: HealthStatus = await res.json();
        setHealth(data);
      } catch {
        setHealth({ status: "disconnected", error: "Failed to reach health endpoint" });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <span>Checking AI...</span>
      </div>
    );
  }

  const isConnected = health?.status === "connected";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
        isConnected
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
      title={
        isConnected
          ? `AI Connected (${health?.latencyMs}ms)`
          : `AI Disconnected: ${health?.error || "Unknown error"}`
      }
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      <span>{isConnected ? "AI Connected" : "AI Disconnected"}</span>
    </div>
  );
}

export function useAIStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data: HealthStatus = await res.json();
        setHealth(data);
      } catch {
        setHealth({ status: "disconnected", error: "Failed to reach health endpoint" });
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
  }, []);

  return {
    isConnected: health?.status === "connected",
    isLoading: loading,
    health,
  };
}
