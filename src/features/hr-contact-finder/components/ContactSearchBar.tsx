"use client";

import { FormEvent } from "react";

interface ContactSearchBarProps {
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  onSearch: (location?: string) => void;
  isSearching: boolean;
  location?: string;
  onLocationChange?: (location: string) => void;
}

export function ContactSearchBar({
  companyName,
  onCompanyNameChange,
  onSearch,
  isSearching,
  location = "",
  onLocationChange,
}: ContactSearchBarProps) {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isSearching && companyName.trim()) {
      onSearch(location.trim() || undefined);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Company Name
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Enter company name (e.g., Google, Microsoft)..."
            disabled={isSearching}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Location <span className="text-gray-400">(optional)</span>
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => onLocationChange?.(e.target.value)}
            placeholder="e.g., India, US"
            disabled={isSearching}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSearching || !companyName.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSearching ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Searching for contacts...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Find HR Contacts
          </>
        )}
      </button>
    </form>
  );
}
