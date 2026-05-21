"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";

const features = [
  {
    title: "Resume",
    description: "Upload and manage your resume for AI-powered analysis",
    href: "/resume",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    aiRequired: false,
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/20",
  },
  {
    title: "Email Generator",
    description: "Generate tailored job application emails using AI",
    href: "/email-generator",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    aiRequired: true,
    gradient: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-500/20",
  },
  {
    title: "ATS Scorer",
    description: "Check how well your resume matches a job description",
    href: "/ats-scorer",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    aiRequired: true,
    gradient: "from-purple-500 to-violet-600",
    shadow: "shadow-purple-500/20",
  },
  {
    title: "Interview Prep",
    description: "Generate interview questions and preparation materials",
    href: "/interview-prep",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    aiRequired: true,
    gradient: "from-amber-500 to-orange-600",
    shadow: "shadow-amber-500/20",
  },
  {
    title: "Settings",
    description: "Configure SMTP email settings and account preferences",
    href: "/settings",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    aiRequired: false,
    gradient: "from-slate-400 to-slate-600",
    shadow: "shadow-slate-500/20",
  },
];

export default function DashboardHomePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome section */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
        </h1>
        <p className="text-gray-500">
          Manage your job applications with AI-powered tools.
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group block p-6 rounded-2xl bg-white backdrop-blur-xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/60"
          >
            <div className="space-y-4">
              <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.shadow} text-white`}>
                {feature.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
              {feature.aiRequired && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI-powered
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
