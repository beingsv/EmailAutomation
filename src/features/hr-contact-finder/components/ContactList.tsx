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
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            disabled={isSending || contacts.length === 0}
            className="h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Select all contacts"
          />
          <span className="text-sm font-medium text-gray-600">
            Select All
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSending}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="divide-y divide-gray-100">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={selectedContacts.has(contact.id)}
              onChange={() => onToggleContact(contact.id)}
              disabled={isSending}
              className="h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={`Select ${contact.name}`}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {contact.name}
                </span>
                <ContactSourceBadge source={contact.source} />
                {contact.confidence !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    contact.confidence >= 80 ? 'text-green-600 bg-green-50' :
                    contact.confidence >= 50 ? 'text-yellow-600 bg-yellow-50' :
                    'text-red-600 bg-red-50'
                  }`}>
                    {contact.confidence}%
                  </span>
                )}
                {contact.verified === true && (
                  <span className="text-xs px-1.5 py-0.5 rounded text-green-600 bg-green-50 border border-green-200">
                    ✓ Verified
                  </span>
                )}
                {contact.verificationStatus === 'accept_all' && (
                  <span className="text-xs px-1.5 py-0.5 rounded text-blue-600 bg-blue-50 border border-blue-200">
                    Accept-all
                  </span>
                )}
                {contact.verified === false && contact.verificationStatus !== 'accept_all' && contact.source === 'hunter' && (
                  <span className="text-xs px-1.5 py-0.5 rounded text-gray-500 bg-gray-100 border border-gray-200">
                    Unverified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">{contact.title}</p>
            </div>

            <span className="text-sm text-gray-600 truncate">
              {contact.email}
            </span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {contacts.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No contacts to display.</p>
        </div>
      )}
    </div>
  );
}
