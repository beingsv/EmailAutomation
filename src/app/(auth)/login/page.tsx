"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-gray-900 p-8 shadow-2xl border border-gray-800">
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Sign In
          </h1>
          <p className="text-center text-sm text-gray-400 mb-6">
            Welcome back to AI Job Dashboard
          </p>

          {registered && (
            <div className="rounded-md bg-green-900/30 border border-green-700 p-3 text-sm text-green-400 mb-4">
              Account created successfully. Please sign in.
            </div>
          )}

          <LoginForm />

          <p className="mt-6 text-center text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-4 bg-gray-950">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-gray-900 p-8 shadow-2xl border border-gray-800 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-1/2 mx-auto mb-6" />
              <div className="space-y-4">
                <div className="h-10 bg-gray-700 rounded" />
                <div className="h-10 bg-gray-700 rounded" />
                <div className="h-10 bg-gray-700 rounded" />
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
