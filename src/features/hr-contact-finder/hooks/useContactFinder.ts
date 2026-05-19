"use client";

import { useState, useCallback } from "react";
import {
  Contact,
  BulkSendResult,
  BulkSendProgressEvent,
  ContactSearchResponse,
} from "../types";

interface UseContactFinderReturn {
  contacts: Contact[];
  isSearching: boolean;
  isSending: boolean;
  sendProgress: { current: number; total: number } | null;
  sendResults: BulkSendResult | null;
  error: string | null;
  companyName: string;
  selectedContacts: Set<string>;

  searchContacts: (params: {
    companyName?: string;
    jobDescription?: string;
  }) => Promise<void>;
  refreshContacts: () => Promise<void>;
  toggleContact: (contactId: string) => void;
  toggleAll: () => void;
  sendToSelected: (subject: string, body: string) => Promise<void>;
  setCompanyName: (name: string) => void;
  clearResults: () => void;
}

export function useContactFinder(): UseContactFinderReturn {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [sendResults, setSendResults] = useState<BulkSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );

  const searchContacts = useCallback(
    async (params: { companyName?: string; jobDescription?: string }) => {
      setIsSearching(true);
      setError(null);
      setSendResults(null);

      try {
        const res = await fetch("/api/contacts/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        });

        const data: ContactSearchResponse = await res.json();

        if (!res.ok) {
          const errorData = data as unknown as { error?: string };
          setError(
            errorData.error || "Failed to search contacts. Please try again."
          );
          return;
        }

        setContacts(data.contacts);
        setSelectedContacts(new Set());

        if (data.companyName) {
          setCompanyName(data.companyName);
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const refreshContacts = useCallback(async () => {
    if (!companyName) {
      setError("Please enter a company name to refresh contacts.");
      return;
    }

    setIsSearching(true);
    setError(null);
    setSendResults(null);

    try {
      const res = await fetch("/api/contacts/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, refresh: true }),
      });

      const data: ContactSearchResponse = await res.json();

      if (!res.ok) {
        const errorData = data as unknown as { error?: string };
        setError(
          errorData.error || "Failed to refresh contacts. Please try again."
        );
        return;
      }

      setContacts(data.contacts);
      setSelectedContacts(new Set());

      if (data.companyName) {
        setCompanyName(data.companyName);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSearching(false);
    }
  }, [companyName]);

  const toggleContact = useCallback((contactId: string) => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedContacts((prev) => {
      if (prev.size === contacts.length && contacts.length > 0) {
        return new Set();
      }
      return new Set(contacts.map((c) => c.id));
    });
  }, [contacts]);

  const sendToSelected = useCallback(
    async (subject: string, body: string) => {
      if (selectedContacts.size === 0) return;

      const recipients = contacts
        .filter((c) => selectedContacts.has(c.id))
        .map((c) => c.email);

      setIsSending(true);
      setError(null);
      setSendResults(null);
      setSendProgress({ current: 0, total: recipients.length });

      try {
        const res = await fetch("/api/email/send-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients, subject, body }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          setError(
            errorData.error || "Failed to send emails. Please try again."
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError("Failed to read response stream.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event: BulkSendProgressEvent = JSON.parse(line);

              if (event.type === "progress") {
                setSendProgress({
                  current: event.current ?? 0,
                  total: event.total ?? recipients.length,
                });
              } else if (event.type === "complete" && event.summary) {
                setSendResults(event.summary);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          try {
            const event: BulkSendProgressEvent = JSON.parse(buffer);
            if (event.type === "complete" && event.summary) {
              setSendResults(event.summary);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setIsSending(false);
        setSendProgress(null);
      }
    },
    [contacts, selectedContacts]
  );

  const clearResults = useCallback(() => {
    setSendResults(null);
    setError(null);
    setSendProgress(null);
  }, []);

  return {
    contacts,
    isSearching,
    isSending,
    sendProgress,
    sendResults,
    error,
    companyName,
    selectedContacts,
    searchContacts,
    refreshContacts,
    toggleContact,
    toggleAll,
    sendToSelected,
    setCompanyName,
    clearResults,
  };
}
