"use client";

import { useState } from "react";
import { EmailPreview } from "./EmailPreview";
import { GeneratedEmail, GeneratedReferralEmail } from "../types";

type TabType = "hr" | "referral";

interface DualEmailPreviewProps {
  hrEmail: GeneratedEmail | null;
  referralEmail: GeneratedReferralEmail | null;
  isGeneratingHr: boolean;
  isGeneratingReferral: boolean;
  onUpdateHrField: (field: keyof GeneratedEmail, value: string) => void;
  onUpdateReferralField: (field: keyof GeneratedReferralEmail, value: string) => void;
  hrError?: string | null;
  referralError?: string | null;
}

export function DualEmailPreview({
  hrEmail,
  referralEmail,
  isGeneratingHr,
  isGeneratingReferral,
  onUpdateHrField,
  onUpdateReferralField,
  hrError,
  referralError,
}: DualEmailPreviewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("hr");

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200" role="tablist" aria-label="Email previews">
        <nav className="flex -mb-px space-x-6">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "hr"}
            aria-controls="tab-panel-hr"
            id="tab-hr"
            onClick={() => setActiveTab("hr")}
            className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "hr"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            HR Application Email
            {isGeneratingHr && (
              <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "referral"}
            aria-controls="tab-panel-referral"
            id="tab-referral"
            onClick={() => setActiveTab("referral")}
            className={`relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === "referral"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Referral Request Email
            {isGeneratingReferral && (
              <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      <div
        id="tab-panel-hr"
        role="tabpanel"
        aria-labelledby="tab-hr"
        hidden={activeTab !== "hr"}
      >
        {activeTab === "hr" && (
          <TabContent
            email={hrEmail}
            isGenerating={isGeneratingHr}
            error={hrError}
            onUpdateField={onUpdateHrField}
            emptyLabel="HR application email"
          />
        )}
      </div>

      <div
        id="tab-panel-referral"
        role="tabpanel"
        aria-labelledby="tab-referral"
        hidden={activeTab !== "referral"}
      >
        {activeTab === "referral" && (
          <TabContent
            email={referralEmail}
            isGenerating={isGeneratingReferral}
            error={referralError}
            onUpdateField={onUpdateReferralField}
            emptyLabel="Referral request email"
          />
        )}
      </div>
    </div>
  );
}

interface TabContentProps {
  email: GeneratedEmail | GeneratedReferralEmail | null;
  isGenerating: boolean;
  error?: string | null;
  onUpdateField: (field: keyof GeneratedEmail, value: string) => void;
  emptyLabel: string;
}

function TabContent({ email, isGenerating, error, onUpdateField, emptyLabel }: TabContentProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
        <p className="text-sm text-gray-500">Generating your email...</p>
        <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
      </div>
    );
  }

  if (email) {
    return (
      <EmailPreview
        email={email as GeneratedEmail}
        onUpdateField={onUpdateField}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
      <p className="text-sm text-gray-500">Your {emptyLabel} will appear here</p>
      <p className="text-xs text-gray-400 mt-1">Paste a job description and click Generate</p>
    </div>
  );
}
