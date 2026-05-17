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
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800 text-gray-400 text-sm">
        <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span>Checking AI...</span>
      </div>
    );
  }

  const isConnected = health?.status === "connected";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
        isConnected
          ? "bg-green-900/30 text-green-400"
          : "bg-red-900/30 text-red-400"
      }`}
      title={
        isConnected
          ? `AI Connected (${health?.latencyMs}ms)`
          : `AI Disconnected: ${health?.error || "Unknown error"}`
      }
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-400" : "bg-red-400"
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
