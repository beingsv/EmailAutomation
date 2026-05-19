"use client";

import { Contact } from "../types";
import { ContactSourceBadge } from "./ContactSourceBadge";

interface ContactListProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  onToggleContact: (contactId: string) => void;
  onToggleAll: () => void;
  onSendToSelected: () => void;
  onRefresh: () => void;
  isSending: boolean;
  sendDisabled?: boolean;
}

export function ContactList({
  contacts,
  selectedContacts,
  onToggleContact,
  onToggleAll,
  onSendToSelected,
  onRefresh,
  isSending,
  sendDisabled = false,
}: ContactListProps) {
  const selectedCount = selectedContacts.size;
  const allSelected = contacts.length > 0 && selectedCount === contacts.length;
  const noneSelected = selectedCount === 0;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={isSending || contacts.length === 0}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select all contacts"
          />
          <span className="text-sm font-medium text-gray-300">
            Select All
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSending}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh contacts"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Contacts
          </button>

          <button
            type="button"
            onClick={onSendToSelected}
            disabled={noneSelected || isSending || sendDisabled}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send to Selected ({selectedCount})
          </button>
        </div>
      </div>

      {/* Contact rows */}
      <div className="divide-y divide-gray-800">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-800/50"
          >
            <input
              type="checkbox"
              checked={selectedContacts.has(contact.id)}
              onChange={() => onToggleContact(contact.id)}
              disabled={isSending}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Select ${contact.name}`}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {contact.name}
                </span>
                <ContactSourceBadge source={contact.source} />
                {contact.confidence !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    contact.confidence >= 80 ? 'text-green-400 bg-green-900/30' :
                    contact.confidence >= 50 ? 'text-yellow-400 bg-yellow-900/30' :
                    'text-red-400 bg-red-900/30'
                  }`}>
                    {contact.confidence}%
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{contact.title}</p>
            </div>

            <span className="text-sm text-gray-300 truncate">
              {contact.email}
            </span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {contacts.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-400">No contacts to display.</p>
        </div>
      )}
    </div>
  );
}
