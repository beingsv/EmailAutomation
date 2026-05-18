"use client";

import { SessionProvider } from "next-auth/react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>{children}</SessionProvider>
    </ErrorBoundary>
  );
}
