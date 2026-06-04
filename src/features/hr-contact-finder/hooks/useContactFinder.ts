"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Contact,
  BulkSendResult,
  SmartBulkSendResult,
  BulkSendProgressEvent,
  ContactSearchResponse,
} from "../types";

interface UseContactFinderReturn {
  contacts: Contact[];
  hrContacts: Contact[];
  techContacts: Contact[];
  isSearching: boolean;
  isSending: boolean;
  sendProgress: { current: number; total: number; recipientEmail?: string; contactType?: 'hr' | 'tech' } | null;
  sendResults: BulkSendResult | SmartBulkSendResult | null;
  error: string | null;
  companyName: string;
  selectedContacts: Set<string>;
  hrSelectedCount: number;
  techSelectedCount: number;
  totalSelectedCount: number;

  searchContacts: (params: {
    companyName?: string;
    jobDescription?: string;
    location?: string;
  }) => Promise<void>;
  refreshContacts: () => Promise<void>;
  toggleContact: (contactId: string) => void;
  toggleAll: () => void;
  toggleAllHr: () => void;
  toggleAllTech: () => void;
  sendToSelected: (subject: string, body: string) => Promise<void>;
  sendToSelectedSmart: (params: {
    hrEmail: { subject: string; body: string };
    referralEmail: { subject: string; body: string };
  }) => Promise<void>;
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
    recipientEmail?: string;
    contactType?: 'hr' | 'tech';
  } | null>(null);
  const [sendResults, setSendResults] = useState<BulkSendResult | SmartBulkSendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set()
  );

  // Derived state: contacts grouped by type
  const hrContacts = useMemo(
    () => contacts.filter((c) => c.contactType === "hr"),
    [contacts]
  );

  const techContacts = useMemo(
    () => contacts.filter((c) => c.contactType === "tech"),
    [contacts]
  );

  // Derived state: per-group selection counts
  const hrSelectedCount = useMemo(
    () => hrContacts.filter((c) => selectedContacts.has(c.id)).length,
    [hrContacts, selectedContacts]
  );

  const techSelectedCount = useMemo(
    () => techContacts.filter((c) => selectedContacts.has(c.id)).length,
    [techContacts, selectedContacts]
  );

  const totalSelectedCount = selectedContacts.size;

  const searchContacts = useCallback(
    async (params: { companyName?: string; jobDescription?: string; location?: string }) => {
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

  const toggleAllHr = useCallback(() => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      const allHrSelected =
        hrContacts.length > 0 && hrContacts.every((c) => next.has(c.id));

      if (allHrSelected) {
        // Deselect all HR contacts
        hrContacts.forEach((c) => next.delete(c.id));
      } else {
        // Select all HR contacts
        hrContacts.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }, [hrContacts]);

  const toggleAllTech = useCallback(() => {
    setSelectedContacts((prev) => {
      const next = new Set(prev);
      const allTechSelected =
        techContacts.length > 0 && techContacts.every((c) => next.has(c.id));

      if (allTechSelected) {
        // Deselect all Tech contacts
        techContacts.forEach((c) => next.delete(c.id));
      } else {
        // Select all Tech contacts
        techContacts.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }, [techContacts]);

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
                  recipientEmail: event.recipientEmail,
                  contactType: event.contactType,
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

  const sendToSelectedSmart = useCallback(
    async (params: {
      hrEmail: { subject: string; body: string };
      referralEmail: { subject: string; body: string };
    }) => {
      if (selectedContacts.size === 0) return;

      const recipients = contacts
        .filter((c) => selectedContacts.has(c.id))
        .map((c) => ({ email: c.email, contactType: c.contactType }));

      setIsSending(true);
      setError(null);
      setSendResults(null);
      setSendProgress({ current: 0, total: recipients.length });

      try {
        const res = await fetch("/api/email/send-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients,
            hrEmail: params.hrEmail,
            referralEmail: params.referralEmail,
          }),
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
                  recipientEmail: event.recipientEmail,
                  contactType: event.contactType,
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
    hrContacts,
    techContacts,
    isSearching,
    isSending,
    sendProgress,
    sendResults,
    error,
    companyName,
    selectedContacts,
    hrSelectedCount,
    techSelectedCount,
    totalSelectedCount,
    searchContacts,
    refreshContacts,
    toggleContact,
    toggleAll,
    toggleAllHr,
    toggleAllTech,
    sendToSelected,
    sendToSelectedSmart,
    setCompanyName,
    clearResults,
  };
}
