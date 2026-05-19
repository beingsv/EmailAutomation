"use client";

import { Sidebar } from "@/shared/components/Sidebar";
import { useAIStatus } from "@/shared/components/AIStatusIndicator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected, isLoading: aiLoading } = useAIStatus();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Degraded mode warning banner */}
        {!aiLoading && !isConnected && (
          <div className="bg-yellow-900/30 border-b border-yellow-800/50 px-4 py-3 text-sm text-yellow-300 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>
              <strong>AI Service Unavailable</strong> — AI-powered features (email generation, ATS scoring, interview prep) are currently unavailable. Non-AI features like resume upload and SMTP configuration remain accessible.
            </span>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
