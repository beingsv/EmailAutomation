"use client";

import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-gray-900 p-8 shadow-2xl border border-gray-800">
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Create Account
          </h1>
          <p className="text-center text-sm text-gray-400 mb-6">
            Get started with AI Job Dashboard
          </p>

          <RegisterForm />

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
