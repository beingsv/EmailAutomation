/**
 * Contact Finder Service (Orchestrator)
 *
 * Orchestrates the contact discovery flow:
 * 1. Extract company name from job description (if not provided)
 * 2. Check cache for existing contacts (case-insensitive)
 * 3. Call Apollo.io API on cache miss
 * 4. Fall back to pattern-based generation if Apollo returns empty
 *
 * Validates: Requirements 1.1, 1.2, 2.4, 3.1, 3.2, 3.5, 3.6, 8.1, 8.4
 */

import { prisma } from '@/shared/lib/db';
import { extractCompanyName } from './company-extractor.service';
import { searchPeople, ApolloClientError } from './hunter-client.service';
import { generatePatterns, deriveDomain } from './pattern-generator.service';
import type { Contact, FindContactsParams, FindContactsResult } from '../types';

const HR_TITLES = [
  'HR',
  'Talent Acquisition',
  'Recruiting',
  'Recruiter',
  'People Operations',
];

/**
 * Finds HR/recruiting contacts for a company.
 *
 * Flow:
 * 1. If companyName not provided, extract from jobDescription using AI
 * 2. Check cache (case-insensitive lookup)
 * 3. If cache hit, return cached contacts
 * 4. If cache miss, call Apollo.io
 * 5. If Apollo returns results, cache and return
 * 6. If Apollo returns empty, use pattern generator as fallback
 * 7. Cache pattern results too
 * 8. On cache write failure, log error but still return contacts
 */
export async function findContacts(
  params: FindContactsParams
): Promise<FindContactsResult> {
  // Step 1: Resolve company name
  let companyName = params.companyName;

  if (!companyName && params.jobDescription) {
    companyName = await extractCompanyName(params.jobDescription) ?? undefined;
  }

  if (!companyName) {
    throw new Error('Company name is required. Please provide a company name or a job description containing one.');
  }

  // Step 2: Resolve domain
  const domain = params.domain ?? deriveDomain(companyName) ?? `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  // Step 3: Check cache (case-insensitive)
  const cachedResult = await getCachedContacts(companyName);
  if (cachedResult) {
    return {
      contacts: cachedResult.contacts,
      companyName: cachedResult.companyName,
      domain: cachedResult.domain,
      source: 'cache',
      fromCache: true,
    };
  }

  // Step 4: Call Apollo.io
  return await fetchAndCacheContacts(companyName, domain);
}

/**
 * Refreshes contacts for a company by bypassing the cache.
 * Deletes existing cached data and fetches fresh results from Apollo.io.
 */
export async function refreshContacts(
  companyName: string
): Promise<FindContactsResult> {
  if (!companyName) {
    throw new Error('Company name is required for refresh.');
  }

  const domain = deriveDomain(companyName) ?? `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  // Delete existing cache for this company
  try {
    const existing = await prisma.company.findFirst({
      where: { name: companyName.toLowerCase() },
    });

    if (existing) {
      await prisma.company.delete({ where: { id: existing.id } });
    }
  } catch (error) {
    console.error('[ContactFinder] Failed to clear cache during refresh:', error);
  }

  // Fetch fresh contacts (bypasses cache since we just deleted it)
  return await fetchAndCacheContacts(companyName, domain);
}

/**
 * Fetches contacts from Apollo.io (with pattern fallback) and caches the results.
 */
async function fetchAndCacheContacts(
  companyName: string,
  domain: string
): Promise<FindContactsResult> {
  let contacts: Contact[];
  let source: 'hunter' | 'pattern';

  try {
    // Log the Apollo API call (Requirement 8.4)
    console.log(`[ContactFinder] Apollo API call: company="${companyName}" timestamp=${new Date().toISOString()}`);

    const apolloResult = await searchPeople({
      companyName,
      titles: HR_TITLES,
      limit: 10,
    });

    if (apolloResult.contacts.length > 0) {
      // Apollo returned results
      contacts = apolloResult.contacts.map((c, index) => ({
        id: `apollo-${companyName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: c.name,
        title: c.title,
        email: c.email,
        source: 'hunter' as const,
        confidence: c.confidence,
        verified: c.verified,
        cachedAt: new Date(),
      }));
      source = 'hunter';
    } else {
      // Apollo returned empty — fallback to patterns (Requirement 2.4)
      contacts = generatePatterns(domain);
      source = 'pattern';
    }
  } catch (error) {
    if (error instanceof ApolloClientError) {
      // On Apollo error, fall back to pattern generation
      console.warn(`[ContactFinder] Apollo error (${error.code}): ${error.message}. Falling back to patterns.`);
      contacts = generatePatterns(domain);
      source = 'pattern';
    } else {
      throw error;
    }
  }

  // Cache the results (Requirement 3.1)
  await cacheContacts(companyName, domain, contacts);

  return {
    contacts,
    companyName,
    domain,
    source,
    fromCache: false,
  };
}

/**
 * Looks up cached contacts for a company using case-insensitive matching.
 * Returns null on cache miss or database error.
 */
async function getCachedContacts(
  companyName: string
): Promise<{ contacts: Contact[]; companyName: string; domain: string } | null> {
  try {
    const company = await prisma.company.findFirst({
      where: { name: companyName.toLowerCase() },
      include: { contacts: true },
    });

    if (!company || company.contacts.length === 0) {
      return null;
    }

    const contacts: Contact[] = company.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      email: c.email,
      source: c.source as 'hunter' | 'pattern',
      cachedAt: c.cachedAt,
    }));

    return {
      contacts,
      companyName: company.name,
      domain: company.domain,
    };
  } catch (error) {
    // On cache read failure, fall through to API call
    console.error('[ContactFinder] Cache read failed:', error);
    return null;
  }
}

/**
 * Stores company and contacts in the cache.
 * On failure, logs the error but does NOT throw — contacts are still returned to the user.
 */
async function cacheContacts(
  companyName: string,
  domain: string,
  contacts: Contact[]
): Promise<void> {
  try {
    await prisma.company.create({
      data: {
        name: companyName.toLowerCase(),
        domain,
        contacts: {
          create: contacts.map((c) => ({
            name: c.name,
            title: c.title,
            email: c.email,
            source: c.source,
          })),
        },
      },
    });
  } catch (error) {
    // Requirement: On cache write failure, log error but still return contacts
    console.error('[ContactFinder] Cache write failed:', error);
  }
}
