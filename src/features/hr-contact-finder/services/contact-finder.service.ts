/**
 * Contact Finder Service (Orchestrator)
 *
 * Orchestrates the contact discovery flow:
 * 1. Extract company name from job description (if not provided)
 * 2. Map job description to Hunter.io department for tech contact search
 * 3. Check cache for existing contacts by type (HR and tech separately)
 * 4. Call Hunter.io API only for missing contact types (API credit optimization)
 * 5. Fall back to pattern-based generation ONLY for HR contacts if Hunter returns empty
 * 6. Cache all contacts with contactType and department fields
 *
 * Validates: Requirements 1.1, 1.4, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.5, 8.6
 */

import { prisma } from '@/shared/lib/db';
import { extractCompanyName } from './company-extractor.service';
import { searchPeople, ApolloClientError } from './hunter-client.service';
import { generatePatterns, deriveDomain } from './pattern-generator.service';
import { verifyEmails } from './email-verifier.service';
import { mapDepartment } from './department-mapper.service';
import type { Contact, FindContactsParams, FindContactsResult } from '../types';

const HR_TITLES = [
  'HR',
  'Talent Acquisition',
  'Recruiting',
  'Recruiter',
  'People Operations',
];

/**
 * Finds HR and tech contacts for a company using dual-search orchestration.
 *
 * Flow:
 * 1. If companyName not provided, extract from jobDescription using AI
 * 2. Map jobDescription to a Hunter.io department for tech contact search
 * 3. Check cache for HR contacts and tech contacts separately
 * 4. Make API calls only for missing contact types (cache-aware optimization)
 *    - Both cached → zero API calls
 *    - Only HR cached → one API call for tech
 *    - Only tech cached → one API call for HR
 *    - Neither cached → two API calls (HR + tech)
 * 5. Pattern fallback ONLY applies to HR contacts (never for tech)
 * 6. Cache all contacts with contactType and department
 * 7. Return combined contacts with mappedDepartment in result
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
    return {
      contacts: [],
      companyName: '',
      domain: '',
      source: 'pattern' as const,
      fromCache: false,
    };
  }

  // Step 2: Resolve domain
  const domain = params.domain ?? deriveDomain(companyName) ?? `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  // Step 3: Map job description to tech department
  let mappedDepartment: string = 'it';
  if (params.jobDescription) {
    try {
      mappedDepartment = await mapDepartment(params.jobDescription);
    } catch (error) {
      console.error('[ContactFinder] Department mapping failed, defaulting to "it":', error);
      mappedDepartment = 'it';
    }
  }

  // Step 4: Check cache for both contact types separately
  const cachedHrContacts = await getCachedContacts(companyName, 'hr');
  const cachedTechContacts = await getCachedContacts(companyName, 'tech');

  const hasHrCached = cachedHrContacts !== null && cachedHrContacts.contacts.length > 0;
  const hasTechCached = cachedTechContacts !== null && cachedTechContacts.contacts.length > 0;

  // Step 5: Cache-aware API optimization
  if (hasHrCached && hasTechCached) {
    // Both types cached → zero API calls
    const allContacts = [
      ...cachedHrContacts!.contacts,
      ...cachedTechContacts!.contacts,
    ];
    return {
      contacts: allContacts,
      companyName: cachedHrContacts!.companyName,
      domain: cachedHrContacts!.domain,
      source: 'cache',
      fromCache: true,
      mappedDepartment,
    };
  }

  if (hasHrCached && !hasTechCached) {
    // Only HR cached → one API call for tech contacts only
    const techContacts = await fetchTechContacts(companyName, domain, mappedDepartment, params.location);
    // Cache the new tech contacts
    await cacheContacts(companyName, domain, techContacts, 'tech', mappedDepartment);

    const allContacts = [
      ...cachedHrContacts!.contacts,
      ...techContacts,
    ];
    return {
      contacts: allContacts,
      companyName: cachedHrContacts!.companyName,
      domain: cachedHrContacts!.domain,
      source: techContacts.length > 0 ? 'hunter' : 'cache',
      fromCache: false,
      mappedDepartment,
    };
  }

  if (!hasHrCached && hasTechCached) {
    // Only tech cached → one API call for HR contacts only
    const hrContacts = await fetchHrContacts(companyName, domain, params.location);
    // Cache the new HR contacts
    await cacheContacts(companyName, domain, hrContacts, 'hr', 'hr');

    const allContacts = [
      ...hrContacts,
      ...cachedTechContacts!.contacts,
    ];
    return {
      contacts: allContacts,
      companyName: cachedTechContacts!.companyName,
      domain: cachedTechContacts!.domain,
      source: hrContacts.length > 0 ? 'hunter' : 'pattern',
      fromCache: false,
      mappedDepartment,
    };
  }

  // Neither cached → two API calls (HR + tech)
  return await fetchAndCacheBothContacts(companyName, domain, mappedDepartment, params.location);
}

/**
 * Refreshes contacts for a company by bypassing the cache.
 * Deletes ALL existing cached contacts (both HR and tech) and fetches fresh results.
 *
 * Validates: Requirement 8.5
 */
export async function refreshContacts(
  companyName: string,
  jobDescription?: string
): Promise<FindContactsResult> {
  if (!companyName) {
    throw new Error('Company name is required for refresh.');
  }

  const domain = deriveDomain(companyName) ?? `${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

  // Map department for tech search
  let mappedDepartment: string = 'it';
  if (jobDescription) {
    try {
      mappedDepartment = await mapDepartment(jobDescription);
    } catch (error) {
      console.error('[ContactFinder] Department mapping failed during refresh, defaulting to "it":', error);
      mappedDepartment = 'it';
    }
  }

  // Delete ALL existing cache for this company (both HR and tech contacts)
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

  // Fetch fresh contacts for both types (bypasses cache since we just deleted it)
  return await fetchAndCacheBothContacts(companyName, domain, mappedDepartment);
}

/**
 * Fetches HR contacts from Hunter.io with pattern-based fallback.
 */
async function fetchHrContacts(
  companyName: string,
  domain: string,
  location?: string
): Promise<Contact[]> {
  try {
    console.log(`[ContactFinder] Hunter.io API call: company="${companyName}" department="hr" timestamp=${new Date().toISOString()}`);

    const apolloResult = await searchPeople({
      companyName,
      titles: HR_TITLES,
      limit: 5,
      location,
      department: 'hr',
    });

    if (apolloResult.contacts.length > 0) {
      const contacts = apolloResult.contacts.map((c, index) => ({
        id: `hunter-hr-${companyName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: c.name,
        title: c.title,
        email: c.email,
        source: 'hunter' as const,
        confidence: c.confidence,
        verified: c.verified,
        verificationStatus: c.verificationStatus,
        cachedAt: new Date(),
        contactType: 'hr' as const,
        department: 'hr',
      }));

      // Verify emails
      return await verifyAndFilterContacts(contacts);
    }

    // Pattern fallback for HR contacts (Requirement 1.8: only HR gets pattern fallback)
    console.log(`[ContactFinder] No HR contacts from Hunter.io, falling back to patterns for ${domain}`);
    const patternContacts = generatePatterns(domain);
    return patternContacts.map((c) => ({
      ...c,
      contactType: 'hr' as const,
      department: 'hr',
    }));
  } catch (error) {
    if (error instanceof ApolloClientError) {
      console.warn(`[ContactFinder] Hunter.io error for HR (${error.code}): ${error.message}. Falling back to patterns.`);
      const patternContacts = generatePatterns(domain);
      return patternContacts.map((c) => ({
        ...c,
        contactType: 'hr' as const,
        department: 'hr',
      }));
    }
    throw error;
  }
}

/**
 * Fetches tech contacts from Hunter.io. No pattern fallback for tech contacts.
 */
async function fetchTechContacts(
  companyName: string,
  domain: string,
  mappedDepartment: string,
  location?: string
): Promise<Contact[]> {
  try {
    console.log(`[ContactFinder] Hunter.io API call: company="${companyName}" department="${mappedDepartment}" timestamp=${new Date().toISOString()}`);

    const apolloResult = await searchPeople({
      companyName,
      titles: [],
      limit: 5,
      location,
      department: mappedDepartment,
    });

    if (apolloResult.contacts.length > 0) {
      const contacts = apolloResult.contacts.map((c, index) => ({
        id: `hunter-tech-${companyName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
        name: c.name,
        title: c.title,
        email: c.email,
        source: 'hunter' as const,
        confidence: c.confidence,
        verified: c.verified,
        verificationStatus: c.verificationStatus,
        cachedAt: new Date(),
        contactType: 'tech' as const,
        department: mappedDepartment,
      }));

      // Verify emails
      return await verifyAndFilterContacts(contacts);
    }

    // NO pattern fallback for tech contacts (Requirement 1.8)
    console.log(`[ContactFinder] No tech contacts found for department="${mappedDepartment}" — returning empty (no pattern fallback for tech)`);
    return [];
  } catch (error) {
    if (error instanceof ApolloClientError) {
      console.warn(`[ContactFinder] Hunter.io error for tech (${error.code}): ${error.message}. No fallback for tech contacts.`);
      return [];
    }
    throw error;
  }
}

/**
 * Fetches both HR and tech contacts, caches them, and returns combined result.
 * Makes two API calls — one for HR, one for tech department.
 */
async function fetchAndCacheBothContacts(
  companyName: string,
  domain: string,
  mappedDepartment: string,
  location?: string
): Promise<FindContactsResult> {
  // Fetch both in parallel for speed
  const [hrContacts, techContacts] = await Promise.all([
    fetchHrContacts(companyName, domain, location),
    fetchTechContacts(companyName, domain, mappedDepartment, location),
  ]);

  // Cache all contacts together
  const allContacts = [...hrContacts, ...techContacts];
  await cacheAllContacts(companyName, domain, allContacts);

  // Determine source based on what we got
  let source: 'hunter' | 'pattern' = 'hunter';
  if (hrContacts.length > 0 && hrContacts[0].source === 'pattern') {
    source = 'pattern';
  }

  return {
    contacts: allContacts,
    companyName,
    domain,
    source,
    fromCache: false,
    mappedDepartment,
  };
}

/**
 * Verifies emails and filters out invalid ones.
 */
async function verifyAndFilterContacts(contacts: Contact[]): Promise<Contact[]> {
  if (contacts.length === 0) return contacts;

  const emailsToVerify = contacts
    .filter((c) => !c.verificationStatus || c.verificationStatus === 'unknown')
    .map((c) => ({ email: c.email, currentStatus: c.verificationStatus }));

  if (emailsToVerify.length > 0) {
    const verificationResults = await verifyEmails(emailsToVerify);

    contacts = contacts.map((c) => {
      const result = verificationResults.get(c.email);
      if (result) {
        // Map verification result to our Contact's verificationStatus union
        const mappedStatus = (['valid', 'invalid', 'accept_all', 'unknown'].includes(result)
          ? result
          : 'unknown') as 'valid' | 'accept_all' | 'unknown' | 'invalid';
        return {
          ...c,
          verificationStatus: mappedStatus,
          verified: result === 'valid',
        };
      }
      return c;
    });

    // Filter out invalid emails
    const validContacts = contacts.filter((c) => c.verificationStatus !== 'invalid');
    const invalidCount = contacts.length - validContacts.length;
    if (invalidCount > 0) {
      console.log(`[ContactFinder] Removed ${invalidCount} invalid emails after verification`);
    }
    contacts = validContacts;
  }

  return contacts;
}

/**
 * Looks up cached contacts for a company filtered by contactType.
 * Returns null on cache miss or database error.
 * Supports partial cache checks — may have HR only, tech only, or both.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */
async function getCachedContacts(
  companyName: string,
  contactType?: 'hr' | 'tech'
): Promise<{ contacts: Contact[]; companyName: string; domain: string } | null> {
  try {
    const company = await prisma.company.findFirst({
      where: { name: companyName.toLowerCase() },
      include: { contacts: true },
    });

    if (!company || company.contacts.length === 0) {
      return null;
    }

    // Filter by contactType if specified
    let filteredDbContacts = company.contacts;
    if (contactType) {
      filteredDbContacts = company.contacts.filter(
        (c) => c.contactType === contactType
      );
    }

    if (filteredDbContacts.length === 0) {
      return null;
    }

    const contacts: Contact[] = filteredDbContacts.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      email: c.email,
      source: c.source as 'hunter' | 'pattern',
      contactType: c.contactType as 'hr' | 'tech',
      department: c.department,
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
 * Stores contacts of a specific type in the cache, without removing other types.
 * Used for partial cache updates (e.g., adding tech contacts when HR already cached).
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */
async function cacheContacts(
  companyName: string,
  domain: string,
  contacts: Contact[],
  contactType: 'hr' | 'tech',
  department: string
): Promise<void> {
  try {
    if (contacts.length === 0) return;

    const normalizedName = companyName.toLowerCase();

    // Find or create the company record
    let company = await prisma.company.findFirst({
      where: { name: normalizedName },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: normalizedName,
          domain,
        },
      });
    }

    // Add contacts with contactType and department
    await prisma.companyContact.createMany({
      data: contacts.map((c) => ({
        companyId: company!.id,
        name: c.name,
        title: c.title,
        email: c.email,
        source: c.source,
        contactType: c.contactType || contactType,
        department: c.department || department,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    // Requirement: On cache write failure, log error but still return contacts
    console.error('[ContactFinder] Cache write failed:', error);
  }
}

/**
 * Stores all contacts (both HR and tech) for a company.
 * Used when neither type was cached and both are fetched fresh.
 * Deletes any existing company record to avoid stale data.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */
async function cacheAllContacts(
  companyName: string,
  domain: string,
  contacts: Contact[]
): Promise<void> {
  try {
    const normalizedName = companyName.toLowerCase();

    // Delete existing company + contacts if it exists (clean slate)
    const existing = await prisma.company.findFirst({
      where: { name: normalizedName },
    });

    if (existing) {
      await prisma.company.delete({ where: { id: existing.id } });
    }

    // Only cache if there are contacts to store
    if (contacts.length === 0) return;

    await prisma.company.create({
      data: {
        name: normalizedName,
        domain,
        contacts: {
          create: contacts.map((c) => ({
            name: c.name,
            title: c.title,
            email: c.email,
            source: c.source,
            contactType: c.contactType || 'hr',
            department: c.department || 'hr',
          })),
        },
      },
    });
  } catch (error) {
    // Requirement: On cache write failure, log error but still return contacts
    console.error('[ContactFinder] Cache write failed:', error);
  }
}
