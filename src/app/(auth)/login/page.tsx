"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-gradient-animated overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in to your AI Job Dashboard
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/60 p-8 shadow-xl shadow-gray-200/50">
          {registered && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Account created successfully. Please sign in.
            </div>
          )}

          <LoginForm />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center p-4 bg-gradient-animated">
          <div className="w-full max-w-md">
            <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/60 p-8 shadow-xl">
              <div className="h-8 bg-gray-200 rounded-lg w-1/2 mx-auto mb-6 shimmer" />
              <div className="space-y-4">
                <div className="h-12 bg-gray-100 rounded-lg shimmer" />
                <div className="h-12 bg-gray-100 rounded-lg shimmer" />
                <div className="h-12 bg-gray-100 rounded-lg shimmer" />
              </div>
            </div>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
