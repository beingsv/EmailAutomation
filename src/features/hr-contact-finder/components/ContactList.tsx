"use client";

import { Contact } from "../types";
import { ContactSourceBadge } from "./ContactSourceBadge";

interface ContactListProps {
  contacts: Contact[];
  selectedContacts: Set<string>;
  onToggleContact: (contactId: string) => void;
  onToggleAll: () => void;
  onToggleGroupAll?: (contactType: 'hr' | 'tech') => void;
  onSendToSelected: () => void;
  onRefresh: () => void;
  isSending: boolean;
  sendDisabled?: boolean;
}

function ContactTypeBadge({ contactType }: { contactType: 'hr' | 'tech' }) {
  const isHr = contactType === 'hr';
  const label = isHr ? 'HR' : 'Tech';
  const colorClasses = isHr
    ? 'border-blue-200 bg-blue-50 text-blue-600'
    : 'border-green-200 bg-green-50 text-green-600';

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colorClasses}`}
    >
      {label}
    </span>
  );
}

function ContactGroup({
  title,
  routingLabel,
  contacts,
  selectedContacts,
  onToggleContact,
  onToggleGroupAll,
  isSending,
}: {
  title: string;
  routingLabel: string;
  contacts: Contact[];
  selectedContacts: Set<string>;
  onToggleContact: (contactId: string) => void;
  onToggleGroupAll: () => void;
  isSending: boolean;
}) {
  const groupSelectedCount = contacts.filter((c) => selectedContacts.has(c.id)).length;
  const allGroupSelected = contacts.length > 0 && groupSelectedCount === contacts.length;

  return (
    <div>
      {/* Group header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <input
          type="checkbox"
          checked={allGroupSelected}
          onChange={onToggleGroupAll}
          disabled={isSending || contacts.length === 0}
          className="h-4 w-4 rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Select all ${title}`}
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">{title}</span>
          <span className="text-xs text-gray-500">{routingLabel}</span>
        </div>
      </div>

      {/* Contact rows */}
      <div className="divide-y divide-gray-100">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 ${
              contact.verificationStatus === 'invalid' ? 'opacity-40 line-through' : ''
            }`}
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
                <ContactTypeBadge contactType={contact.contactType} />
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
    </div>
  );
}

export function ContactList({
  contacts,
  selectedContacts,
  onToggleContact,
  onToggleAll,
  onToggleGroupAll,
  onSendToSelected,
  onRefresh,
  isSending,
  sendDisabled = false,
}: ContactListProps) {
  const selectedCount = selectedContacts.size;
  const noneSelected = selectedCount === 0;

  const hrContacts = contacts.filter((c) => c.contactType === 'hr');
  const techContacts = contacts.filter((c) => c.contactType === 'tech');

  const handleToggleHrAll = () => {
    if (onToggleGroupAll) {
      onToggleGroupAll('hr');
    } else {
      // Fallback: toggle HR contacts using individual toggle
      const allHrSelected = hrContacts.every((c) => selectedContacts.has(c.id));
      hrContacts.forEach((c) => {
        if (allHrSelected && selectedContacts.has(c.id)) {
          onToggleContact(c.id);
        } else if (!allHrSelected && !selectedContacts.has(c.id)) {
          onToggleContact(c.id);
        }
      });
    }
  };

  const handleToggleTechAll = () => {
    if (onToggleGroupAll) {
      onToggleGroupAll('tech');
    } else {
      // Fallback: toggle Tech contacts using individual toggle
      const allTechSelected = techContacts.every((c) => selectedContacts.has(c.id));
      techContacts.forEach((c) => {
        if (allTechSelected && selectedContacts.has(c.id)) {
          onToggleContact(c.id);
        } else if (!allTechSelected && !selectedContacts.has(c.id)) {
          onToggleContact(c.id);
        }
      });
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header with actions */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
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

      {/* Grouped contact sections */}
      {contacts.length > 0 && (
        <div>
          {/* HR Contacts Group */}
          {hrContacts.length > 0 && (
            <ContactGroup
              title="HR Contacts"
              routingLabel="Will receive: HR Application Email"
              contacts={hrContacts}
              selectedContacts={selectedContacts}
              onToggleContact={onToggleContact}
              onToggleGroupAll={handleToggleHrAll}
              isSending={isSending}
            />
          )}

          {/* Tech Contacts Group - hidden when no tech contacts found (Req 5.7) */}
          {techContacts.length > 0 && (
            <ContactGroup
              title="Tech Contacts"
              routingLabel="Will receive: Referral Request Email"
              contacts={techContacts}
              selectedContacts={selectedContacts}
              onToggleContact={onToggleContact}
              onToggleGroupAll={handleToggleTechAll}
              isSending={isSending}
            />
          )}
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No contacts to display.</p>
        </div>
      )}
    </div>
  );
}
