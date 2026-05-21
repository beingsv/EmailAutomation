"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmailGeneratorForm } from "@/features/email/components/EmailGeneratorForm";
import { EmailPreview } from "@/features/email/components/EmailPreview";
import { useEmailGenerator } from "@/features/email/hooks/useEmailGenerator";
import { ContactSearchBar } from "@/features/hr-contact-finder/components/ContactSearchBar";
import { ContactList } from "@/features/hr-contact-finder/components/ContactList";
import { BulkSendProgress } from "@/features/hr-contact-finder/components/BulkSendProgress";
import { useContactFinder } from "@/features/hr-contact-finder/hooks/useContactFinder";
import { ToastContainer, useToast } from "@/shared/components/Toast";

export default function EmailGeneratorPage() {
  const {
    generatedEmail,
    isGenerating,
    isSending,
    sendSuccess,
    sendError,
    error,
    hasResume,
    isCheckingResume,
    hrEmail,
    generate,
    sendEmail,
    setHrEmail,
    updateField,
    retry,
    clearError,
  } = useEmailGenerator();

  const {
    contacts,
    isSearching,
    isSending: isBulkSending,
    sendProgress,
    sendResults,
    error: contactError,
    companyName,
    selectedContacts,
    searchContacts,
    refreshContacts,
    toggleContact,
    toggleAll,
    sendToSelected,
    setCompanyName,
    clearResults,
  } = useContactFinder();

  const [lastJobDescription, setLastJobDescription] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [location, setLocation] = useState("");
  const { toasts, addToast, dismissToast } = useToast();

  // Show toast for send success/error
  useEffect(() => {
    if (sendSuccess) {
      addToast("success", sendSuccess);
    }
  }, [sendSuccess]);

  useEffect(() => {
    if (sendError) {
      addToast("error", sendError);
    }
  }, [sendError]);

  // Generate email and auto-fetch HR contacts from the JD
  const handleGenerate = async (jobDescription: string, email: string) => {
    setLastJobDescription(jobDescription);
    await generate(jobDescription, email);
    // After generation, try to auto-search for HR contacts
    await searchContacts({
      companyName: companyName.trim() || undefined,
      jobDescription,
    });
    // If company name wasn't found, show a helpful toast
    if (!companyName.trim()) {
      // Check after a tick — companyName state may have been updated by searchContacts
      setTimeout(() => {
        if (!companyName.trim()) {
          addToast("info", "Couldn't detect company name from the JD. Enter it manually to find HR contacts.");
        }
      }, 500);
    }
  };

  // Handle contact search
  const handleSearchContacts = (searchLocation?: string) => {
    searchContacts({
      companyName: companyName.trim() || undefined,
      jobDescription: lastJobDescription || undefined,
      location: searchLocation || location.trim() || undefined,
    });
  };

  // Handle bulk send with the generated email subject and body
  const handleSendToSelected = () => {
    if (!generatedEmail) return;
    const fullBody = `${generatedEmail.greeting}\n\n${generatedEmail.body}\n\n${generatedEmail.closing}`;
    sendToSelected(generatedEmail.subject, fullBody);
  };

  // Handle manual single send to a typed email
  const handleManualSend = () => {
    if (!generatedEmail || !manualEmail) return;
    setHrEmail(manualEmail);
    sendEmail();
  };

  // Loading state while checking resume
  if (isCheckingResume) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Generator</h1>
          <p className="mt-1 text-gray-500">Generate tailored job application emails using AI.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  // No resume uploaded state
  if (hasResume === false) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Generator</h1>
          <p className="mt-1 text-gray-500">Generate tailored job application emails using AI.</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Please upload a resume first</h3>
          <p className="text-gray-500 mb-4">
            A resume is required to generate personalized job application emails.
          </p>
          <Link
            href="/resume"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Resume
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Email Generator</h1>
        <p className="mt-1 text-gray-500 text-sm">Paste a job description, generate a tailored email, then find and send to HR contacts.</p>
      </div>

      {/* Step 1: Job Description + Generate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Form (JD only, no HR email) */}
        <div className="rounded-2xl bg-white backdrop-blur-xl border border-gray-200 p-6 shadow-lg shadow-gray-200/60">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-500/30">1</span>
            Paste Job Description
          </h2>
          <EmailGeneratorForm onGenerate={handleGenerate} isGenerating={isGenerating} onHrEmailChange={setHrEmail} />
        </div>

        {/* Right column: Email Preview */}
        <div className="rounded-2xl bg-white backdrop-blur-xl border border-gray-200 p-6 shadow-lg shadow-gray-200/60">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Preview</h2>

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-600">{error}</p>
                  <button
                    onClick={() => { clearError(); retry(); }}
                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4" />
              <p className="text-sm text-gray-500">Generating your email...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Generated email preview */}
          {!isGenerating && generatedEmail && (
            <>
              <EmailPreview
                email={generatedEmail}
                onUpdateField={updateField}
              />
            </>
          )}

          {/* Empty state */}
          {!isGenerating && !generatedEmail && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500">Your generated email will appear here</p>
              <p className="text-xs text-gray-400 mt-1">Paste a job description and click Generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Find HR Contacts & Send — only show after email is generated */}
      {generatedEmail && (
        <div className="rounded-2xl bg-white backdrop-blur-xl border border-gray-200 p-6 space-y-5 shadow-lg shadow-gray-200/60">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 text-xs font-bold text-white shadow-sm shadow-purple-500/30">2</span>
            Find HR Contacts &amp; Send
          </h2>
          <p className="text-sm text-gray-500 -mt-3">
            Search for HR contacts at the company, or enter an email manually to send directly.
          </p>

          {/* Contact error — show as toast instead of inline for non-critical errors */}
          {contactError && contactError !== "Something went wrong" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-600">{contactError}</p>
                  <button onClick={clearResults} className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact Search */}
          <ContactSearchBar
            companyName={companyName}
            onCompanyNameChange={setCompanyName}
            onSearch={handleSearchContacts}
            isSearching={isSearching}
            location={location}
            onLocationChange={setLocation}
          />

          {/* Contact list */}
          {contacts.length > 0 && (
            <ContactList
              contacts={contacts}
              selectedContacts={selectedContacts}
              onToggleContact={toggleContact}
              onToggleAll={toggleAll}
              onSendToSelected={handleSendToSelected}
              onRefresh={refreshContacts}
              isSending={isBulkSending}
            />
          )}

          {/* Bulk send progress */}
          <BulkSendProgress
            sendProgress={sendProgress}
            sendResults={sendResults}
            isSending={isBulkSending}
          />

          {/* Manual send option — divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">or send manually</span>
            </div>
          </div>

          {/* Manual email input + send */}
          <div className="flex gap-3">
            <input
              type="email"
              value={manualEmail}
              onChange={(e) => {
                setManualEmail(e.target.value);
                setHrEmail(e.target.value);
              }}
              placeholder="Enter HR email manually (e.g. hr@company.com)"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleManualSend}
              disabled={!manualEmail || isSending}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
