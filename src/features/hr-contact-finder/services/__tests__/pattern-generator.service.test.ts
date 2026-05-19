import { describe, it, expect } from 'vitest';
import { generatePatterns, deriveDomain } from '../pattern-generator.service';

describe('PatternGeneratorService', () => {
  describe('generatePatterns', () => {
    it('should generate exactly 5 contacts for a given domain', () => {
      const contacts = generatePatterns('google.com');
      expect(contacts).toHaveLength(5);
    });

    it('should generate correct email prefixes', () => {
      const contacts = generatePatterns('google.com');
      const emails = contacts.map((c) => c.email);
      expect(emails).toContain('hr@google.com');
      expect(emails).toContain('careers@google.com');
      expect(emails).toContain('recruiting@google.com');
      expect(emails).toContain('jobs@google.com');
      expect(emails).toContain('talent@google.com');
    });

    it('should set source to "pattern" for all contacts', () => {
      const contacts = generatePatterns('example.com');
      for (const contact of contacts) {
        expect(contact.source).toBe('pattern');
      }
    });

    it('should set non-empty name and title for each contact', () => {
      const contacts = generatePatterns('acme.com');
      for (const contact of contacts) {
        expect(contact.name.length).toBeGreaterThan(0);
        expect(contact.title.length).toBeGreaterThan(0);
      }
    });

    it('should set a valid id for each contact', () => {
      const contacts = generatePatterns('test.com');
      for (const contact of contacts) {
        expect(contact.id).toBeTruthy();
        expect(contact.id).toContain('pattern-');
      }
    });

    it('should set cachedAt as a Date', () => {
      const contacts = generatePatterns('test.com');
      for (const contact of contacts) {
        expect(contact.cachedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('deriveDomain', () => {
    it('should convert company name to lowercase domain', () => {
      expect(deriveDomain('Google')).toBe('google.com');
    });

    it('should remove "Inc" suffix', () => {
      expect(deriveDomain('Apple Inc')).toBe('apple.com');
    });

    it('should remove "LLC" suffix', () => {
      expect(deriveDomain('Acme LLC')).toBe('acme.com');
    });

    it('should remove "Ltd" suffix', () => {
      expect(deriveDomain('Barclays Ltd')).toBe('barclays.com');
    });

    it('should remove "Corp" suffix', () => {
      expect(deriveDomain('Microsoft Corp')).toBe('microsoft.com');
    });

    it('should remove spaces from company name', () => {
      expect(deriveDomain('Palo Alto Networks')).toBe('paloaltonetworks.com');
    });

    it('should handle suffix with punctuation', () => {
      expect(deriveDomain('Apple Inc.')).toBe('apple.com');
    });

    it('should return null for empty string', () => {
      expect(deriveDomain('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(deriveDomain('   ')).toBeNull();
    });

    it('should handle company name that becomes empty after suffix removal', () => {
      expect(deriveDomain('Inc')).toBeNull();
    });

    it('should handle mixed case suffixes', () => {
      expect(deriveDomain('Tesla INC')).toBe('tesla.com');
    });

    it('should handle company names with multiple words and suffix', () => {
      expect(deriveDomain('General Electric Corp')).toBe('generalelectric.com');
    });
  });
});
