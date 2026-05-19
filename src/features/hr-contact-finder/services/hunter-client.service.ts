/**
 * Contact Search Client Service (Hunter.io)
 *
 * Uses Hunter.io Domain Search API to find HR and recruiting contacts at target companies.
 * Hunter.io free tier provides 25 searches/month with up to 10 results per search.
 *
 * API: GET https://api.hunter.io/v2/domain-search
 * Docs: https://hunter.io/api-documentation/v2#domain-search
 *
 * The Domain Search returns email addresses found for a domain, filterable by department (hr).
 * Each result includes: email, first_name, last_name, position, department, confidence score.
 */

import type { ApolloSearchParams, ApolloSearchResult, ApolloContact } from '../types';

const HUNTER_API_URL = 'https://api.hunter.io/v2/domain-search';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESULTS = 10;

export class ApolloClientError extends Error {
  constructor(
    message: string,
    public readonly code: 'RATE_LIMITED' | 'CREDITS_EXHAUSTED' | 'NETWORK_ERROR' | 'API_ERROR' | 'MISSING_API_KEY',
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'ApolloClientError';
  }
}

/**
 * Searches for HR/recruiting contacts at a company using Hunter.io Domain Search API.
 *
 * - Uses HUNTER_API_KEY environment variable for authentication
 * - Filters by department=hr to get HR/recruiting contacts
 * - Falls back to searching by company name if domain is not available
 * - Enforces a 15-second timeout via AbortController
 * - Limits results to max 10 contacts per request
 * - Handles HTTP 429 (rate limit) and 402 (credits exhausted)
 */
export async function searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResult> {
  const apiKey = process.env.HUNTER_API_KEY;

  if (!apiKey || apiKey === 'your-key-here') {
    throw new ApolloClientError(
      'Contact search is not configured. Please set HUNTER_API_KEY.',
      'MISSING_API_KEY'
    );
  }

  const limit = Math.min(params.limit, MAX_RESULTS);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Derive domain from company name
    const domain = deriveDomainForSearch(params.companyName);

    // Build the request URL with query parameters
    const url = new URL(HUNTER_API_URL);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('department', 'hr');
    url.searchParams.set('type', 'personal');

    if (domain) {
      url.searchParams.set('domain', domain);
    } else {
      url.searchParams.set('company', params.companyName);
    }

    console.log(`[Hunter] Searching for HR contacts: ${domain ? `domain=${domain}` : `company=${params.companyName}`}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
      signal: controller.signal,
    });

    console.log(`[Hunter] Response status: ${response.status}`);

    if (response.status === 429) {
      throw new ApolloClientError(
        'API limit reached. You have used all your search credits for this period.',
        'RATE_LIMITED',
        429
      );
    }

    if (response.status === 402) {
      throw new ApolloClientError(
        'API credits exhausted. Please upgrade your Hunter.io plan.',
        'CREDITS_EXHAUSTED',
        402
      );
    }

    if (response.status === 401) {
      throw new ApolloClientError(
        'Hunter.io API authentication failed. Please check your API key.',
        'API_ERROR',
        401
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as { errors?: Array<{ details?: string }> })?.errors?.[0]?.details || 'Contact search failed';
      throw new ApolloClientError(errorMsg, 'API_ERROR', response.status);
    }

    const data = await response.json();
    const emails = Array.isArray(data?.data?.emails) ? data.data.emails : [];
    const totalResults = data?.meta?.results || emails.length;

    console.log(`[Hunter] Found ${emails.length} emails (total available: ${totalResults})`);

    // If no HR contacts found with department filter, try without it
    if (emails.length === 0 && domain) {
      console.log(`[Hunter] No HR contacts found, trying broader search...`);
      return await searchBroader(apiKey, domain, params.companyName, limit, controller.signal);
    }

    const contacts: ApolloContact[] = emails
      .filter((e: HunterEmail) => e.value && (e.first_name || e.last_name))
      .filter((e: HunterEmail) => {
        // Skip emails that are known invalid
        if (e.verification?.status === 'invalid') return false;
        // Skip very low confidence emails
        if (e.confidence !== undefined && e.confidence < 30) return false;
        return true;
      })
      .map((e: HunterEmail) => ({
        name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown',
        title: e.position || e.department || 'HR',
        email: e.value,
        confidence: e.confidence,
        verified: e.verification?.status === 'valid',
      }));

    console.log(`[Hunter] Extracted ${contacts.length} contacts with names and emails`);

    return {
      contacts,
      hasMore: totalResults > limit,
    };
  } catch (error: unknown) {
    if (error instanceof ApolloClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApolloClientError(
        'Contact search timed out',
        'NETWORK_ERROR',
        504
      );
    }

    throw new ApolloClientError(
      'Contact search failed. Pattern-based fallback is available.',
      'API_ERROR'
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Broader search without department filter — finds any contacts at the company.
 */
async function searchBroader(
  apiKey: string,
  domain: string,
  companyName: string,
  limit: number,
  signal: AbortSignal
): Promise<ApolloSearchResult> {
  const url = new URL(HUNTER_API_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('type', 'personal');

  if (domain) {
    url.searchParams.set('domain', domain);
  } else {
    url.searchParams.set('company', companyName);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'accept': 'application/json' },
    signal,
  });

  if (!response.ok) {
    return { contacts: [], hasMore: false };
  }

  const data = await response.json();
  const emails = Array.isArray(data?.data?.emails) ? data.data.emails : [];
  const totalResults = data?.meta?.results || emails.length;

  const contacts: ApolloContact[] = emails
    .filter((e: HunterEmail) => e.value && (e.first_name || e.last_name))
    .filter((e: HunterEmail) => {
      if (e.verification?.status === 'invalid') return false;
      if (e.confidence !== undefined && e.confidence < 30) return false;
      return true;
    })
    .map((e: HunterEmail) => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown',
      title: e.position || e.department || 'Employee',
      email: e.value,
      confidence: e.confidence,
      verified: e.verification?.status === 'valid',
    }));

  console.log(`[Hunter] Broader search found ${contacts.length} contacts`);

  return {
    contacts,
    hasMore: totalResults > limit,
  };
}

/**
 * Derives a likely domain from a company name.
 * Returns null if unable to derive.
 */
function deriveDomainForSearch(companyName: string): string | null {
  if (!companyName) return null;

  const knownDomains: Record<string, string> = {
    'tata consultancy services': 'tcs.com',
    'tcs': 'tcs.com',
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'amazon': 'amazon.com',
    'meta': 'meta.com',
    'facebook': 'meta.com',
    'apple': 'apple.com',
    'netflix': 'netflix.com',
    'infosys': 'infosys.com',
    'wipro': 'wipro.com',
    'hcl technologies': 'hcltech.com',
    'cognizant': 'cognizant.com',
    'accenture': 'accenture.com',
    'deloitte': 'deloitte.com',
    'ibm': 'ibm.com',
    'oracle': 'oracle.com',
    'salesforce': 'salesforce.com',
    'adobe': 'adobe.com',
    'uber': 'uber.com',
    'airbnb': 'airbnb.com',
    'stripe': 'stripe.com',
    'shopify': 'shopify.com',
    'twitter': 'x.com',
    'linkedin': 'linkedin.com',
    'spotify': 'spotify.com',
    'slack': 'slack.com',
    'zoom': 'zoom.us',
    'atlassian': 'atlassian.com',
    'github': 'github.com',
    'gitlab': 'gitlab.com',
    'datadog': 'datadoghq.com',
    'snowflake': 'snowflake.com',
    'palantir': 'palantir.com',
    'coinbase': 'coinbase.com',
    'robinhood': 'robinhood.com',
    'flipkart': 'flipkart.com',
    'swiggy': 'swiggy.in',
    'zomato': 'zomato.com',
    'paytm': 'paytm.com',
    'razorpay': 'razorpay.com',
    'freshworks': 'freshworks.com',
    'zoho': 'zoho.com',
    'tech mahindra': 'techmahindra.com',
    'capgemini': 'capgemini.com',
  };

  const normalized = companyName.toLowerCase().trim();
  if (knownDomains[normalized]) {
    return knownDomains[normalized];
  }

  // Generic derivation: lowercase, remove suffixes, remove non-alpha, add .com
  let domain = normalized
    .replace(/\b(inc|llc|ltd|corp|corporation|limited|pvt|private|technologies|services|consulting|group|solutions)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  if (!domain) return null;
  return `${domain}.com`;
}

// Type for Hunter.io email response
interface HunterEmail {
  value: string;
  type: string;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  department: string | null;
  seniority: string | null;
  linkedin: string | null;
  verification?: {
    date: string | null;
    status: 'valid' | 'accept_all' | 'unknown' | 'invalid' | null;
  };
}

/**
 * Extracts contacts from API response (kept for backward compatibility with tests).
 */
export function extractContacts(
  data: Record<string, unknown>,
  limit: number
): ApolloSearchResult {
  const people = Array.isArray(data.people) ? data.people : [];
  const totalAvailable = typeof data.pagination === 'object' && data.pagination !== null
    ? (data.pagination as Record<string, unknown>).total_entries
    : people.length;

  const contacts: ApolloContact[] = [];

  for (const person of people) {
    if (contacts.length >= limit) break;

    const name = extractString(person, 'name');
    const title = extractString(person, 'title');
    const email = extractString(person, 'email');

    if (name && title && email) {
      contacts.push({ name, title, email });
    }
  }

  const hasMore = typeof totalAvailable === 'number'
    ? totalAvailable > contacts.length
    : false;

  return { contacts, hasMore };
}

function extractString(obj: unknown, key: string): string {
  if (typeof obj !== 'object' || obj === null) return '';
  const value = (obj as Record<string, unknown>)[key];
  if (typeof value === 'string') return value.trim();
  return '';
}
