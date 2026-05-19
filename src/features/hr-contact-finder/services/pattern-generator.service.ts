import { Contact } from '../types';

/**
 * Pattern Generator Service
 *
 * Generates common HR email patterns as fallback contacts when Apollo.io
 * returns no results. Also derives company domains from company names.
 */

const HR_PREFIXES = ['hr', 'careers', 'recruiting', 'jobs', 'talent'] as const;

const COMPANY_SUFFIXES = [
  'inc',
  'llc',
  'ltd',
  'corp',
];

/**
 * Generates pattern-based HR contacts for a given domain.
 * Produces exactly 5 contacts with prefixes: hr@, careers@, recruiting@, jobs@, talent@.
 * Each contact has source set to "pattern".
 */
export function generatePatterns(domain: string): Contact[] {
  return HR_PREFIXES.map((prefix) => ({
    id: `pattern-${prefix}-${domain}`,
    name: `${capitalize(prefix)} Department`,
    title: getTitleForPrefix(prefix),
    email: `${prefix}@${domain}`,
    source: 'pattern' as const,
    cachedAt: new Date(),
  }));
}

/**
 * Derives a company domain from a company name.
 *
 * Steps:
 * 1. Convert to lowercase
 * 2. Remove common suffixes (Inc, LLC, Ltd, Corp)
 * 3. Remove spaces
 * 4. Append ".com"
 * 5. Return null if the result would be empty (just ".com")
 */
export function deriveDomain(companyName: string): string | null {
  if (!companyName || companyName.trim().length === 0) {
    return null;
  }

  let domain = companyName.toLowerCase();

  // Remove common suffixes (with optional trailing punctuation like commas/periods)
  for (const suffix of COMPANY_SUFFIXES) {
    const regex = new RegExp(`\\b${suffix}[.,]?\\s*$`, 'i');
    domain = domain.replace(regex, '');
  }

  // Remove all spaces
  domain = domain.replace(/\s+/g, '');

  // Trim any remaining punctuation from edges
  domain = domain.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

  if (domain.length === 0) {
    return null;
  }

  return `${domain}.com`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTitleForPrefix(prefix: string): string {
  switch (prefix) {
    case 'hr':
      return 'Human Resources';
    case 'careers':
      return 'Careers';
    case 'recruiting':
      return 'Recruiting';
    case 'jobs':
      return 'Jobs';
    case 'talent':
      return 'Talent Acquisition';
    default:
      return prefix;
  }
}
