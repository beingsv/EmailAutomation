/**
 * HR Contact Finder types for contact discovery, caching, and bulk sending.
 */

export interface Contact {
  id: string;
  name: string;
  title: string;
  email: string;
  source: 'hunter' | 'pattern';
  confidence?: number;
  verified?: boolean;
  cachedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  createdAt: Date;
}

export interface FindContactsParams {
  companyName?: string;
  jobDescription?: string;
  domain?: string;
}

export interface FindContactsResult {
  contacts: Contact[];
  companyName: string;
  domain: string;
  source: 'cache' | 'hunter' | 'pattern';
  fromCache: boolean;
}

export interface ApolloSearchParams {
  companyName: string;
  titles: string[];
  limit: number;
}

export interface ApolloSearchResult {
  contacts: ApolloContact[];
  hasMore: boolean;
}

export interface ApolloContact {
  name: string;
  title: string;
  email: string;
  confidence?: number;
  verified?: boolean;
}

export interface BulkSendParams {
  userId: string;
  recipients: string[];
  subject: string;
  body: string;
}

export interface BulkSendProgress {
  current: number;
  total: number;
  recipientEmail: string;
  status: 'sending' | 'success' | 'failed';
  error?: string;
}

export interface BulkSendResult {
  totalSent: number;
  totalFailed: number;
  results: Array<{
    email: string;
    success: boolean;
    error?: string;
  }>;
}

export interface ContactSearchRequest {
  companyName?: string;
  jobDescription?: string;
  domain?: string;
  refresh?: boolean;
}

export interface ContactSearchResponse {
  contacts: Contact[];
  companyName: string;
  domain: string;
  source: 'cache' | 'hunter' | 'pattern';
  extractedCompanyName?: string;
}

export interface BulkSendRequest {
  recipients: string[];
  subject: string;
  body: string;
}

export interface BulkSendProgressEvent {
  type: 'progress' | 'complete';
  current?: number;
  total?: number;
  recipientEmail?: string;
  status?: 'success' | 'failed';
  error?: string;
  summary?: BulkSendResult;
}
