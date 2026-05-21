"use client";

import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 bg-gradient-animated overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/3 -right-32 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 -left-32 w-64 h-64 bg-blue-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md z-10">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Get started with AI Job Dashboard
          </p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-gray-200/60 p-8 shadow-xl shadow-gray-200/50">
          <RegisterForm />

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
